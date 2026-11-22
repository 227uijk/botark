import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { adapterRegistry } from '@adapters/registry'
import { createId } from '@shared/id'
import { getBridge } from '@/lib/bridge'
import { cancelPlatformTurn, useBotStore } from '@/store/botStore'
import {
  isFinal,
  mentions,
  turnPrompt,
  type CollabRoom,
  type RoomMember,
  type RoomMessage
} from './model'
import { requestedTool } from './toolRequests'

export interface RoomTurnProgress {
  turn: number
  limit: number
}

interface RoomState {
  externalAudiences: Record<string, string | undefined>
  rooms: CollabRoom[]
  speakers: Record<string, string | undefined>
  turnProgress: Record<string, RoomTurnProgress | undefined>
  errors: Record<string, string | undefined>
}

export const useRooms = create<RoomState>()(
  persist(
    (): RoomState => ({
      rooms: [],
      speakers: {},
      turnProgress: {},
      errors: {},
      externalAudiences: {}
    }),
    {
      name: 'botark-collaboration-rooms',
      partialize: (s) => ({ rooms: s.rooms }),
      merge: (persisted, current) => {
        const raw = persisted && typeof persisted === 'object' ? (persisted as { rooms?: unknown }) : {}
        const safeRooms = Array.isArray(raw.rooms)
          ? raw.rooms
              .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string'))
              .map((r) => ({
                id: String(r.id),
                title: typeof r.title === 'string' && r.title.trim() ? r.title : '协作讨论',
                members: Array.isArray(r.members) ? (r.members as RoomMember[]) : [],
                messages: Array.isArray(r.messages) ? (r.messages as RoomMessage[]) : [],
                mode: r.mode === 'manual' ? ('manual' as const) : ('auto' as const),
                limit: typeof r.limit === 'number' && r.limit > 0 ? r.limit : 6,
                brief: typeof r.brief === 'string' ? r.brief : '',
                slackParent: typeof r.slackParent === 'string' ? r.slackParent : undefined,
                slackChannel: typeof r.slackChannel === 'string' ? r.slackChannel : undefined,
                slackThread: typeof r.slackThread === 'string' ? r.slackThread : undefined,
                finalId: typeof r.finalId === 'string' ? r.finalId : undefined,
                createdAt: typeof r.createdAt === 'number' ? r.createdAt : undefined
              }))
          : []
        return { ...current, rooms: safeRooms }
      }
    }
  )
)

const pendingTurns = new Map<string, Promise<unknown>>()
const runs = new Map<string, AbortController>()
const activeAccounts = new Set<string>()
const roomById = (id: string) => useRooms.getState().rooms.find((r) => r.id === id)

function update(id: string, fn: (room: CollabRoom) => CollabRoom) {
  useRooms.setState((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? fn(r) : r)) }))
}

export function stopRoom(id: string) {
  runs.get(id)?.abort()
  runs.delete(id)
  useRooms.setState((s) => ({
    speakers: { ...s.speakers, [id]: undefined },
    turnProgress: { ...s.turnProgress, [id]: undefined }
  }))
}

function setError(id: string, error?: string) {
  useRooms.setState((s) => ({ errors: { ...s.errors, [id]: error } }))
}

export function renameRoom(id: string, title: string) {
  const trimmed = title.trim()
  if (!trimmed) return
  update(id, (r) => ({ ...r, title: trimmed }))
}

export function updateRoomConfig(
  id: string,
  patch: Partial<Pick<CollabRoom, 'mode' | 'limit'>>
) {
  update(id, (r) => ({
    ...r,
    ...(patch.mode ? { mode: patch.mode } : {}),
    ...(patch.limit !== undefined
      ? { limit: Math.max(1, Math.min(24, Math.round(patch.limit))) }
      : {})
  }))
}

export function clearRoomTranscript(id: string) {
  stopRoom(id)
  setError(id, undefined)
  update(id, (r) => ({
    ...r,
    messages: [],
    finalId: undefined,
    brief: '',
    members: r.members.map((m) => ({ ...m, cursor: 0 }))
  }))
}

export function deleteRoom(id: string) {
  stopRoom(id)
  const toRemove = new Set(
    useRooms
      .getState()
      .rooms.filter((r) => r.id === id || r.slackParent === id)
      .map((r) => r.id)
  )
  for (const rid of toRemove) stopRoom(rid)
  useRooms.setState((s) => ({
    rooms: s.rooms.filter((r) => !toRemove.has(r.id))
  }))
  const botState = useBotStore.getState()
  if (botState.selectedBotId && toRemove.has(botState.selectedBotId)) {
    const remainingRoom = useRooms.getState().rooms[0]?.id
    const firstBot = botState.bots[0]?.id ?? null
    botState.selectBot(remainingRoom ?? firstBot)
  }
}

export function addRoom(title: string, ids: string[], mode: CollabRoom['mode'], limit: number) {
  const { bots, accounts } = useBotStore.getState()
  const members: RoomMember[] = ids.map((id) => {
    const bot = bots.find((b) => b.id === id)
    if (!bot || accounts[bot.activeAccountId]?.status !== 'online')
      throw new Error('请选择已连接的 Bot')
    return {
      botId: id,
      platform: bot.platformId,
      accountId: bot.activeAccountId,
      name: bot.name.trim(),
      agentId: bot.selectedAgentId,
      sessionId: ['dot', 'grok'].includes(bot.platformId) ? bot.activeSessionId : undefined,
      cursor: 0
    }
  })
  if (members.length < 2 || members.length > 6) throw new Error('请选择 2–6 位成员')
  if (new Set(members.map((m) => m.name.toLowerCase())).size !== members.length)
    throw new Error('请先为同名 Bot 设置不同的名称')
  if (!Number.isInteger(limit) || limit < 1 || limit > 24) throw new Error('轮数应为 1–24')
  const room: CollabRoom = {
    id: createId('room'),
    title: title.trim() || members.map((m) => m.name).join(' · '),
    members,
    messages: [],
    mode,
    limit,
    brief: '',
    createdAt: Date.now()
  }
  useRooms.setState((s) => ({ rooms: [...s.rooms, room] }))
  return room
}

async function memberReply(room: CollabRoom, member: RoomMember, signal: AbortSignal) {
  const adapter = adapterRegistry.get(member.platform)
  const bot = useBotStore
    .getState()
    .bots.find((b) => b.id === member.botId && b.accountIds.includes(member.accountId))
  if (
    !bot ||
    !adapter ||
    adapter.getStatus(member.accountId) !== 'online' ||
    activeAccounts.has(member.accountId)
  ) {
    throw new Error(`@${member.name} 正忙或已断开连接`)
  }
  activeAccounts.add(member.accountId)
  const conversationId = 'room-turn-' + createId('turn')
  const replies = new Map<string, string>()
  const unsubscribe = adapter.onMessage((m) => {
    if (m.conversationId === conversationId && m.accountId === member.accountId && m.text.trim())
      replies.set(m.id, m.text)
  })
  let sessionId = member.sessionId
  const cancel = () => {
    void cancelPlatformTurn({
      ...bot,
      activeAccountId: member.accountId,
      activeSessionId: sessionId,
      selectedAgentId: member.agentId
    }).catch(() => {})
  }
  try {
    if (!sessionId && member.platform === 'hark') {
      const res = await getBridge()?.hark.rpc({
        accountId: member.accountId,
        op: 'createConversation',
        title: room.title
      })
      if (!res?.ok) throw new Error(res?.message ?? 'Hark unavailable')
      sessionId = (res.data as { conversationId: string }).conversationId
    } else if (!sessionId && member.platform === 'meta-muse') {
      sessionId = (await getBridge()?.muse.startSession(member.accountId))?.sessionId ?? undefined
      if (!sessionId) throw new Error('Muse 未返回协作会话')
    }
    if (sessionId && sessionId !== member.sessionId)
      update(room.id, (r) => ({
        ...r,
        members: r.members.map((m) => (m.botId === member.botId ? { ...m, sessionId } : m))
      }))
    let prompt = turnPrompt(room, member)
    const hub = getBridge()?.workspace
    const workspace = hub ? await hub.manage(room.id, { op: 'status' }) : undefined
    if (workspace?.tools.length) {
      prompt +=
        '\n\nTo request one workspace tool, reply with [TOOL] followed by JSON {"name":"…","args":{…}}. A person approves each call. Available tools: ' +
        JSON.stringify(workspace.tools.map((t) => ({ name: t.name, schema: t.inputSchema })))
    }
    signal.throwIfAborted()
    signal.addEventListener('abort', cancel, { once: true })
    const receipt = await adapter.sendMessage({
      conversationId,
      sessionId,
      accountId: member.accountId,
      agentId: member.agentId,
      hermesSessionKey: room.id + '-' + member.botId,
      text: prompt
    })
    signal.throwIfAborted()
    const text = [...replies.values()].join('\n\n')
    if (!text) throw new Error(`@${member.name} 没有返回文字回复`)
    return { text, sessionId: receipt.sessionId ?? sessionId }
  } finally {
    unsubscribe()
    activeAccounts.delete(member.accountId)
    signal.removeEventListener('abort', cancel)
  }
}

export async function submitBrief(
  id: string,
  input: string,
  author = 'User',
  messageId = createId('post')
) {
  const room = roomById(id)
  const text = input.trim()
  if (!room || !text) return
  stopRoom(id)
  setError(id)
  const controller = new AbortController()
  runs.set(id, controller)
  const message: RoomMessage = { id: messageId, author, text, createdAt: Date.now() }
  update(id, (r) => ({ ...r, brief: text, finalId: undefined, messages: [...r.messages, message] }))
  const queue = mentions(text, room.members)
  if (!queue.length && room.mode === 'auto') queue.push(room.members[0]!)
  try {
    const previous = pendingTurns.get(id)
    if (previous) await previous.catch(() => {})
    controller.signal.throwIfAborted()
    for (let turn = 0; turn < room.limit && queue.length; turn++) {
      const next = queue.shift()!
      const current = roomById(id)!
      const member = current.members.find((m) => m.botId === next.botId)!
      useRooms.setState((s) => ({
        speakers: { ...s.speakers, [id]: member.name },
        turnProgress: { ...s.turnProgress, [id]: { turn: turn + 1, limit: current.limit } }
      }))
      const pending = memberReply(current, member, controller.signal)
      pendingTurns.set(id, pending)
      const reply = await pending.finally(() => {
        if (pendingTurns.get(id) === pending) pendingTurns.delete(id)
      })
      controller.signal.throwIfAborted()
      const post: RoomMessage = {
        id: createId('post'),
        author: member.name,
        text: reply.text,
        createdAt: Date.now()
      }
      const done = isFinal(post.text)
      update(id, (r) => ({
        ...r,
        finalId: done ? post.id : undefined,
        messages: [...r.messages, post],
        members: r.members.map((m) =>
          m.botId === member.botId
            ? { ...m, cursor: r.messages.length + 1, sessionId: reply.sessionId }
            : m
        )
      }))
      if (done) break
      const tool = requestedTool(post.text)
      if (tool && turn + 1 < room.limit) {
        const bridge = getBridge()?.workspace
        if (!bridge) throw new Error('工作区不可用')
        const recipient = [
          room.title,
          room.members.map((m) => m.name).join(', '),
          useRooms.getState().externalAudiences[id]
        ]
          .filter(Boolean)
          .join(' · ')
        const result = await bridge.run(id, tool.name, tool.args, recipient)
        controller.signal.throwIfAborted()
        update(id, (r) => ({
          ...r,
          messages: [
            ...r.messages,
            { id: createId('post'), author: 'Tool', text: result, createdAt: Date.now() }
          ]
        }))
        queue.unshift(member)
        continue
      }
      if (room.mode === 'auto') {
        for (const target of mentions(post.text, room.members)) {
          if (target.botId !== member.botId && !queue.some((m) => m.botId === target.botId)) {
            queue.push(target)
          }
        }
      }
    }
  } catch (e) {
    if (!controller.signal.aborted) setError(id, e instanceof Error ? e.message : String(e))
  } finally {
    if (runs.get(id) === controller) {
      pendingTurns.delete(id)
      runs.delete(id)
      useRooms.setState((s) => ({
        speakers: { ...s.speakers, [id]: undefined },
        turnProgress: { ...s.turnProgress, [id]: undefined }
      }))
    }
  }
}
