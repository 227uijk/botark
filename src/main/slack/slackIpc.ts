import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { SocketModeClient } from '@slack/socket-mode'
import { WebClient } from '@slack/web-api'
import { createMutex } from '@shared/proxyPool'
import { SLACK_CHANNEL, SLACK_INBOUND, type SlackBinding, type SlackRequest, type SlackState } from '@shared/slack'
import { deleteVaultSecret, getVaultSecret, setVaultSecret } from '../securityVault'
import { readJsonFile, writeJsonAtomic } from '../jsonFile'
import { routeSlackMessage, splitSlackText } from './routing'

const key = 'internal.slack.tokens'
const exclusive = createMutex()
interface Preferences { teamId?: string; bindings: SlackBinding[] }
let prefs: Preferences
let api: WebClient | undefined
let socket: SocketModeClient | undefined
let online = false
let saved = false
const pending = new Map<string, Array<() => Promise<void>>>()
const received = new Set<string>()
const configPath = () => join(app.getPath('userData'), 'slack-rooms.json')
function save(next: Preferences) {
  writeJsonAtomic(configPath(), next)
  prefs = next
}
function view(): SlackState { return { connected: online, saved, bindings: prefs.bindings } }
function rememberThread(binding: SlackBinding, thread: string) {
  if (!binding.defaultThread && !binding.thread) save({ ...prefs,
    bindings: prefs.bindings.map((b) => b.roomId === binding.roomId ? { ...b, defaultThread: thread } : b) })
}
export async function stopSlack() {
  const old = socket
  socket = undefined
  api = undefined
  online = false
  pending.clear()
  received.clear()
  await old?.disconnect()
}
async function start(owner: () => BrowserWindow | null, appToken?: string, botToken?: string) {
  if (!appToken && !botToken && online) return
  const stored = !appToken && !botToken ? await getVaultSecret(key) : null
  const tokens = stored ? JSON.parse(stored) as { appToken: string; botToken: string } : { appToken, botToken }
  if (!tokens.appToken?.startsWith('xapp-') || !tokens.botToken?.startsWith('xoxb-')) throw new Error('需要 App Token 和 Bot Token')
  const web = new WebClient(tokens.botToken, { retryConfig: { retries: 1 } })
  const auth = await web.auth.test()
  if (!auth.team_id || !auth.user_id) throw new Error('Slack 无法确认工作区或应用身份')
  if (prefs.teamId && prefs.teamId !== auth.team_id && prefs.bindings.length) throw new Error('请先解除旧 Slack 工作区绑定')
  await stopSlack()
  const current = new SocketModeClient({ appToken: tokens.appToken })
  socket = current
  current.on('connected', () => { if (socket === current) online = true })
  current.on('disconnected', () => { if (socket === current) online = false })
  current.on('slack_event', (envelope) => {
    const ack = () => envelope.ack().catch(() => {})
    const win = owner()
    if (socket !== current || envelope.type !== 'events_api' || envelope.body.team_id !== auth.team_id) { void ack(); return }
    const message = routeSlackMessage(prefs.bindings, envelope.body.event ?? {}, auth.user_id!)
    if (!message || received.has(message.id)) { void ack(); return }
    if (!win || win.isDestroyed()) return
    const existing = pending.get(message.id)
    if (existing) existing.push(ack)
    else pending.set(message.id, [ack])
    try {
      const binding = prefs.bindings.find((b) => b.roomId === message.roomId)!
      rememberThread(binding, message.thread)
      // A retry may reach a newly reloaded renderer. The persisted message ID deduplicates it.
      win.webContents.send(SLACK_INBOUND, message)
    } catch { pending.delete(message.id) }
  })
  try {
    await current.start()
    if (!stored) await setVaultSecret(key, JSON.stringify(tokens))
    save({ ...prefs, teamId: auth.team_id })
    api = web
    saved = true
  } catch (err) { await stopSlack(); throw err }
}

async function publish(req: Extract<SlackRequest, { op: 'post' }>) {
  const binding = prefs.bindings.find((b) => b.roomId === req.roomId)
  if (!binding) return
  if (!api || !online) throw new Error('Slack 已断开，消息保留在 BotArk')
  let thread = binding.thread ?? req.thread ?? binding.defaultThread
  for (const text of splitSlackText(req.text)) {
    const sent = await api.chat.postMessage({ channel: binding.channel, thread_ts: thread, text,
      unfurl_links: false, unfurl_media: false, mrkdwn: false })
    if (!thread && sent.ts) { thread = sent.ts; rememberThread(binding, thread) }
  }
}

export function registerSlackIpc(owner: () => BrowserWindow | null) {
  prefs = readJsonFile<Preferences>(configPath(), { bindings: [] }, (raw) => Array.isArray((raw as Preferences)?.bindings))
  ipcMain.handle(SLACK_CHANNEL, async (event, req: SlackRequest) => {
    const win = owner()
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Desktop window required')
    if (req.op === 'received') {
      const acks = pending.get(req.id)
      if (acks) {
        received.add(req.id)
        if (received.size > 1500) received.delete(received.values().next().value!)
        pending.delete(req.id)
        await Promise.all(acks.map((ack) => ack()))
      }
      return view()
    }
    return exclusive(async () => {
      switch (req.op) {
        case 'status':
          saved = !!await getVaultSecret(key)
          break
        case 'connect':
          await start(owner, req.appToken, req.botToken)
          break
        case 'disconnect':
          await stopSlack()
          break
        case 'forget':
          await stopSlack()
          await deleteVaultSecret(key)
          save({ bindings: [] })
          saved = false
          break
        case 'bind': {
          if (!online) throw new Error('请先连接 Slack')
          if (!/^[CG][A-Z0-9]+$/.test(req.channel) || (req.thread && !/^\d+\.\d+$/.test(req.thread))) {
            throw new Error('请输入频道 ID 和有效的线程时间戳')
          }
          const others = prefs.bindings.filter((b) => b.roomId !== req.roomId)
          if (others.some((b) => b.channel === req.channel && (!b.thread || !req.thread || b.thread === req.thread))) {
            throw new Error('此频道或线程已绑定其他群聊')
          }
          save({ ...prefs, bindings: [...others, { roomId: req.roomId, channel: req.channel, thread: req.thread }] })
          break
        }
        case 'unbind':
          save({ ...prefs, bindings: prefs.bindings.filter((b) => b.roomId !== req.roomId) })
          break
        case 'post':
          await publish(req)
          break
      }
      return view()
    })
  })
}
