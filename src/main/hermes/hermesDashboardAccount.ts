import { randomUUID } from 'node:crypto'
import type { HermesApprovalView, HermesRpcRequest, HermesSessionSummary } from '@shared/ipc'
import { loadAccountProxyUrl } from '../muse/accountProxy'
import { mapHermesTranscriptMessages, mapSessionRow, type HermesStreamCallbacks, type HermesSendResult } from './hermesClient'
import { dashboardGet, DashboardError, DashboardSocket, refreshDashboard, type DashboardAccess, type JsonRecord } from './hermesDashboard'
import { getDashboardCredential, getHermesAccountMetadata, getHermesAccountRevision, rotateDashboardCredential } from './hermesStore'

const accessCache = new Map<string, { revision: symbol; access: DashboardAccess }>()
const refreshes = new Map<string, { revision: symbol; work: Promise<DashboardAccess> }>()
const drafts = new Map<string, Map<string, HermesSessionSummary>>()
type Active = { socket?: DashboardSocket; runtime?: string; requestId?: string; pending: Map<string, HermesApprovalView>; cancelled: boolean; submitted?: boolean; sending?: boolean; emit?: () => void }
const active = new Map<string, Active>()

export async function checkDashboardDirect(id: string) {
  // A deliberately configured proxy must never be silently bypassed.
  if (await loadAccountProxyUrl(id)) {
    throw new DashboardError('Dashboard 密码模式暂不支持 BotArk 代理；请先清除该账户的代理或另建连接')
  }
}
export function setDashboardAccess(id: string, access: DashboardAccess) {
  accessCache.set(id, { revision: getHermesAccountRevision(id), access })
}
export function clearDashboardState(id: string) {
  active.get(id)?.socket?.close()
  if (active.has(id)) active.get(id)!.cancelled = true
  accessCache.delete(id)
  refreshes.delete(id)
  drafts.delete(id)
}

function account(id: string) {
  const rec = getHermesAccountMetadata(id)
  if (!rec || rec.authMode !== 'dashboard') throw new DashboardError('Hermes Dashboard 尚未登录')
  return rec
}
async function access(id: string, force = false): Promise<DashboardAccess> {
  const revision = getHermesAccountRevision(id)
  const cached = accessCache.get(id)
  if (!force && cached?.revision === revision && cached.access.expiresAt > Date.now() + 30_000) return cached.access
  const existing = refreshes.get(id)
  if (existing?.revision === revision) return existing.work
  const { baseUrl } = account(id)
  const credentials = getDashboardCredential(id)
  if (!credentials) throw new DashboardError('Hermes Dashboard 尚未登录', 401)
  const work = (async () => {
    const result = await refreshDashboard(baseUrl, credentials)
    await rotateDashboardCredential(id, revision, result.credential)
    if (getHermesAccountRevision(id) !== revision) throw new DashboardError('Hermes 登录已更改，请重试')
    setDashboardAccess(id, result.access)
    return result.access
  })()
  refreshes.set(id, { revision, work })
  try { return await work }
  finally { if (refreshes.get(id)?.work === work) refreshes.delete(id) }
}

async function onDashboard<T>(id: string, operation: (base: string, token: string) => Promise<T>): Promise<T> {
  await checkDashboardDirect(id)
  const revision = getHermesAccountRevision(id)
  const { baseUrl } = account(id)
  const assertUnchanged = () => {
    if (revision !== getHermesAccountRevision(id)) throw new DashboardError('Hermes 登录已更改，请重试')
  }
  try {
    const credentials = await access(id)
    assertUnchanged()
    return await operation(baseUrl, credentials.token)
  } catch (e) {
    if (!(e instanceof DashboardError) || e.status !== 401) throw e
    assertUnchanged()
    const credentials = await access(id, true)
    assertUnchanged()
    return operation(baseUrl, credentials.token)
  }
}
export function verifyDashboardAccount(id: string) {
  return onDashboard(id, (base, token) => dashboardGet(base, token, '/api/auth/me'))
}

const str = (value: unknown) => typeof value === 'string' ? value : ''
const obj = (value: unknown) => value !== null && typeof value === 'object' ? value as JsonRecord : {}
const arr = (value: unknown) => Array.isArray(value) ? value : []
function options(id: string): Record<string, string> {
  const p = account(id).dashboardProfile
  return p ? { profile: p } : {}
}
function profileQuery(id: string) {
  return new URLSearchParams(options(id)).toString()
}
async function socket(id: string) {
  const revision = getHermesAccountRevision(id)
  const link = await onDashboard(id, (base, token) => DashboardSocket.connect(base, token))
  if (revision !== getHermesAccountRevision(id)) {
    link.close()
    throw new DashboardError('Hermes 登录已更改，请重试')
  }
  return link
}
async function usingSocket<T>(id: string, execute: (link: DashboardSocket) => Promise<T>) {
  const link = await socket(id)
  try { return await execute(link) }
  finally { link.close() }
}
const shortId = (id: string) => {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new DashboardError('Hermes 会话 ID 无效')
  return id
}
function newDraft(id: string, title?: string, model?: string) {
  const record = { id: `draft_${randomUUID()}`, title, model }
  const own = drafts.get(id) ?? new Map()
  if (own.size >= 32) own.delete(own.keys().next().value)
  own.set(record.id, record)
  drafts.set(id, own)
  return record
}

export async function dashboardRpc(req: Exclude<HermesRpcRequest, { op: 'sendMessage' } | { op: 'setModel' }> & { requestId?: string }): Promise<unknown> {
  const id = req.accountId
  switch (req.op) {
    case 'health': return verifyDashboardAccount(id)
    case 'capabilities': return { sessions: true, dashboard: true }
    case 'models': return [{ id: account(id).model ?? 'hermes-agent' }]
    case 'listSessions': return usingSocket(id, async link => {
      const limit = Math.max(1, Math.min(200, Math.floor(Number(req.limit) || 50)))
      const { sessions } = await link.call('session.list', { ...options(id), limit, include_hidden: true })
      return arr(sessions).map(row => mapSessionRow({ ...obj(row), id: obj(row).resolved_id ?? obj(row).id })).filter(row => row.id)
    })
    case 'createSession': return newDraft(id, req.title, req.model)
    case 'getSessionMessages': {
      if (drafts.get(id)?.has(req.sessionId)) return []
      const sw = new URLSearchParams({ ...options(id), limit: '500', order: 'latest' })
      const data = await onDashboard(id, (base, token) => dashboardGet(base, token,
        `/api/sessions/${shortId(req.sessionId)}/messages?${sw}`))
      return mapHermesTranscriptMessages(arr(data.messages ?? data.data))
    }
    case 'deleteSession':
      if (drafts.get(id)?.delete(req.sessionId)) return { ok: true }
      return usingSocket(id, link => link.call('session.delete', { ...options(id), session_id: shortId(req.sessionId) }))
    case 'skills': {
      const result = await onDashboard(id, (base, token) => dashboardGet(base, token, `/api/skills?${profileQuery(id)}`))
      return arr(result.skills ?? result.data)
    }
    case 'toolsets': return usingSocket(id, async link => arr((await link.call('toolsets.list', options(id))).toolsets))
    case 'listJobs': {
      const params = new URLSearchParams({ profile: account(id).dashboardProfile || 'default' })
      const data = await onDashboard(id, (base, token) => dashboardGet(base, token, `/api/cron/jobs?${params}`))
      return arr(data.jobs ?? data.data).map(row => {
        const j = obj(row)
        return { ...j, schedule: str(j.schedule) || str(obj(j.schedule).display), enabled: j.enabled !== false, paused: j.paused === true || j.enabled === false,
          lastRunAt: j.last_run_at, nextRunAt: j.next_run_at }
      })
    }
    case 'toggleJob':
    case 'runJob':
    case 'deleteJob':
      throw new DashboardError('Dashboard 密码模式暂不支持管理定时任务，请使用 Hermes Dashboard')
    case 'listApprovals': return [...(active.get(id)?.pending.values() ?? [])]
    case 'decideApproval': {
      const run = active.get(id)
      if (!run?.pending.has(req.approvalId) || !run.socket) throw new DashboardError('此审批已结束或无效')
      if (!run.pending.get(req.approvalId)?.decisionOptions?.includes(req.decision)) throw new DashboardError('此审批不支持该选择')
      run.socket.reply(req.approvalId, { choice: req.decision === 'allow_once' ? 'once' : 'deny' })
      run.pending.delete(req.approvalId)
      run.emit?.()
      return { ok: true }
    }
    case 'stopRun': {
      const run = active.get(id)
      if (!run || (req.requestId && req.requestId !== run.requestId)) return { ok: true }
      if (run.submitted && run.runtime && run.socket) await run.socket.call('session.interrupt', { session_id: run.runtime })
      else {
        run.cancelled = true
        if (!run.sending) run.socket?.close()
      }
      return { ok: true }
    }
  }
}
type Send = Extract<HermesRpcRequest, { op: 'sendMessage' }>
export async function sendDashboardMessage(req: Send, cb: HermesStreamCallbacks): Promise<HermesSendResult> {
  const id = req.accountId
  if (active.has(id)) throw new DashboardError('此 Hermes 账户已有消息正在发送')
  if (req.attachments?.length) throw new DashboardError('Dashboard 密码模式暂不支持发送附件；没有发送这条消息')
  if (typeof req.text !== 'string' || !req.text.trim() || req.text.length > 200_000) throw new DashboardError('请输入有效的消息内容')
  const run: Active = { requestId: req.requestId, pending: new Map(), cancelled: false }
  active.set(id, run)
  let sessionId = req.sessionId
  let text = ''
  const messageId = randomUUID()
  let timer: ReturnType<typeof setTimeout> | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined
  try {
    cb.onActivity?.({ code: 'thinking', busy: true }, sessionId)
    const link = run.socket = await socket(id)
    if (run.cancelled) throw new DashboardError('已取消发送')
    await link.call('client.capabilities', { server_requests: true })
    if (run.cancelled) throw new DashboardError('已取消发送')
    const scope = options(id)
    const draft = sessionId ? drafts.get(id)?.get(sessionId) : undefined
    const response = sessionId && !draft
      ? await link.call('session.resume', { ...scope, session_id: shortId(sessionId), omit_messages: true })
      : await link.call('session.create', { ...scope, title: draft?.title || req.text.trim().slice(0, 60), follow_profile_config: true })
    if (run.cancelled) throw new DashboardError('已取消发送')
    const runtime = str(response.session_id)
    if (response.running === true || response.inflight) throw new DashboardError('此会话正由 Hermes 处理，请稍后再发')
    sessionId = str(response.stored_session_id) || str(response.session_key)
    if (!runtime || !sessionId) throw new DashboardError('Hermes Dashboard 没有返回可用的会话 ID')
    run.runtime = runtime
    const model = req.model || draft?.model || account(id).model
    if (model && model !== 'hermes-agent') {
      const selected = await link.call('config.set', { session_id: runtime, key: 'model', value: model })
      if (selected.confirm_required) throw new DashboardError('该模型需要在 Hermes Dashboard 中确认')
    }
    if (run.cancelled) throw new DashboardError('已取消发送')
    run.emit = () => cb.onApprovals?.([...run.pending.values()], sessionId)
    let accepted = false
    let final: JsonRecord | undefined
    const completed = new Promise<JsonRecord>((resolve, reject) => {
      timer = setTimeout(() => reject(new DashboardError('等待 Hermes 回复超时，请先查看会话历史再重试')), 10 * 60_000)
      link.onClose(() => reject(new DashboardError('Hermes 连接中断，请先查看会话历史再重试')))
      link.onFrame(frame => {
        const params = obj(frame.params)
        if (params.session_id !== runtime) return
        if (frame.method === 'approval' && typeof frame.id === 'string') {
          const existing = run.pending.has(frame.id)
          const offered = arr(params.choices).map(str)
          const choices: HermesApprovalView['decisionOptions'] = offered.includes('once') ? ['allow_once', 'deny'] : ['deny']
          if (!existing && accepted && run.pending.size < 32) {
            run.pending.set(frame.id, { id: frame.id, status: 'pending', title: str(params.description) || 'Hermes 命令审批',
              detail: str(params.command), decisionOptions: choices })
            run.emit?.()
          }
        } else if (typeof frame.id === 'string') {
          link.reply(frame.id) // Unsupported secret/privilege/device requests fail closed.
        } else if (frame.method === 'event') {
          const data = obj(params.payload)
          if (params.type === 'message.delta') {
            text += str(data.text)
            if (accepted) cb.onDelta({ messageId, sessionId, text, done: false })
          } else if (params.type === 'message.complete') {
            final = data
            if (accepted) resolve(data)
          } else if (params.type === 'request.cancel' && run.pending.delete(str(data.id))) run.emit?.()
        }
      })
    })
    // A socket can close before prompt.submit finishes; consume the rejection
    // immediately and still propagate it when the turn is awaited below.
    void completed.catch(() => {})
    heartbeat = setInterval(() => void link.call('gateway.ping', {}, 10_000).catch(() => link.close()), 20_000)
    run.sending = true
    const submission = await link.call('prompt.submit', { ...scope, session_id: runtime, text: req.text, queued: true })
    run.sending = false
    run.submitted = submission.status === 'streaming'
    if (!['streaming', 'queued'].includes(str(submission.status))) throw new DashboardError('Hermes 未接收消息，请检查会话状态')
    if (draft) drafts.get(id)?.delete(draft.id)
    cb.onAccepted?.(sessionId)
    if (submission.status === 'queued') {
      const queuedText = '消息已加入 Hermes 队列。请稍后打开会话查看回复。'
      cb.onDelta({ messageId, sessionId, text: queuedText, done: true })
      return { messageId, sessionId, text: queuedText }
    }
    accepted = true
    if (run.cancelled) await link.call('session.interrupt', { session_id: runtime })
    if (text) cb.onDelta({ messageId, sessionId, text, done: false })
    const responseEnd = final ?? await completed
    if (responseEnd.status === 'error') throw new DashboardError('Hermes 未完成回复，请在 Dashboard 查看详情')
    const finishText = typeof responseEnd.text === 'string' ? responseEnd.text : text
    cb.onDelta({ messageId, sessionId, text: finishText, done: true })
    return { messageId, sessionId, text: finishText }
  } finally {
    if (timer) clearTimeout(timer)
    if (heartbeat) clearInterval(heartbeat)
    run.socket?.close()
    if (active.get(id) === run) active.delete(id)
    cb.onActivity?.({ code: 'idle', busy: false }, sessionId)
    cb.onApprovals?.([], sessionId)
  }
}
