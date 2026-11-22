import { afterEach, expect, it, vi } from 'vitest'
import { adapterRegistry } from '@adapters/registry'
import type { IncomingMessage, OutgoingMessage, PlatformAdapter } from '@adapters/types'
import type { Bot } from '@/types'
import { useBotStore } from '@/store/botStore'
import { mentions, roomMarkdown, stripFinalPrefix, type CollabRoom } from './model'
import {
  clearRoomTranscript,
  deleteRoom,
  renameRoom,
  stopRoom,
  submitBrief,
  updateRoomConfig,
  useRooms
} from './roomStore'

const members = ['Muse', 'Dot'].map((name) => ({ name, botId: name, platform: 'dot' as const, accountId: name, cursor: 0 }))
function fixture(mode: CollabRoom['mode'], respond: (m: OutgoingMessage) => Promise<string>, limit = 8) {
  const room: CollabRoom = { id: 'room', title: 'Review', brief: '', members, mode, limit, messages: [] }
  useRooms.setState({ rooms: [room], speakers: {}, errors: {} })
  useBotStore.setState({ bots: members.map((m) => ({ id: m.botId, accountIds: [m.accountId] } as Bot)) })
  let emit!: (msg: IncomingMessage) => void
  vi.spyOn(adapterRegistry, 'get').mockReturnValue({ getStatus: () => 'online',
    onMessage: (listener: typeof emit) => { emit = listener; return () => {} },
    sendMessage: async (m: OutgoingMessage) => {
      const text = await respond(m)
      const message = { ...m, text, createdAt: 1, id: 'fixture' }
      emit({ ...message, conversationId: 'private-chat', text: '@Dot wrong transcript' })
      emit(message)
      return { messageId: 'receipt', acceptedAt: 1 }
    }
  } as unknown as PlatformAdapter)
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('routes complete names once and ignores email addresses', () => {
  expect(mentions('x@Muse.io @MuseExtra @Dot @Muse @Dot', members).map((m) => m.name)).toEqual(['Dot', 'Muse'])
})
it('relays tagged context and stops on a final deliverable even if it mentions a peer', async () => {
  const prompts: string[] = []
  fixture('auto', async (m) => { prompts.push(m.text); return m.accountId === 'Muse' ? '@Dot please review' : '[FINAL]\nAccepted @Muse' })
  await submitBrief('room', 'Review this')
  expect(prompts).toHaveLength(2)
  expect(prompts[1]).toContain('[Muse] @Dot please review')
  expect(roomMarkdown(useRooms.getState().rooms[0]!)).toBe('# Review\n\nAccepted @Muse\n')
})
it.each([['auto', 3], ['manual', 1]] as const)('bounds turns in %s mode', async (mode, count) => {
  fixture(mode, async (m) => m.accountId === 'Muse' ? '@Dot' : '@Muse', 3)
  await submitBrief('room', '@Muse review')
  expect(useRooms.getState().rooms[0]!.messages).toHaveLength(count + 1)
})
it('drops a result that arrives after Stop', async () => {
  let finish!: (text: string) => void
  fixture('auto', () => new Promise((resolve) => { finish = resolve }))
  const run = submitBrief('room', 'Start')
  stopRoom('room')
  finish('@Dot')
  await run
  expect(useRooms.getState().rooms[0]!.messages).toHaveLength(1)
})

it('completes a native room with an approved local tool while Slack is unavailable', async () => {
  const slack = vi.fn().mockRejectedValue(new Error('Slack unavailable'))
  const run = vi.fn().mockResolvedValue('Local fixture result')
  vi.stubGlobal('window', { electron: { workspace: {
    manage: async () => ({ tools: [{ name: 'read', inputSchema: { type: 'object' } }] }), run
  }, slack: { request: slack, onMessage: slack } } })
  const answers = ['@Dot review', '[TOOL] {"name":"read","args":{"path":"notes.txt"}}', '[FINAL] Accepted']
  fixture('auto', async (msg) => {
    if (answers.length === 1) expect(msg.text).toContain('[Tool] Local fixture result')
    return answers.shift()!
  })
  await submitBrief('room', 'Review the notes')
  const room = useRooms.getState().rooms[0]!
  expect(room.finalId).toBe(room.messages.at(-1)?.id)
  expect(roomMarkdown(room)).toContain('Accepted')
  expect(run).toHaveBeenCalledOnce()
  expect(slack).not.toHaveBeenCalled()
})

it('renames, updates config, clears transcripts, and removes forked Slack threads on delete', () => {
  const parent: CollabRoom = {
    id: 'room-parent',
    title: 'Original',
    brief: 'Old brief',
    members,
    mode: 'auto',
    limit: 8,
    finalId: 'm2',
    messages: [
      { id: 'm1', author: 'User', text: 'Brief' },
      { id: 'm2', author: 'Muse', text: '[FINAL]\nSummary' }
    ]
  }
  const child: CollabRoom = {
    ...parent,
    id: 'room-parent/slack/C1/1.0',
    slackParent: 'room-parent',
    messages: []
  }
  useRooms.setState({ rooms: [parent, child], speakers: {}, turnProgress: {}, errors: {} })
  useBotStore.setState({ selectedBotId: parent.id, bots: [{ id: 'fallback-bot', accountIds: [] } as unknown as Bot] })

  expect(stripFinalPrefix('[FINAL]\nSummary')).toBe('Summary')
  renameRoom(parent.id, '  Architecture Review  ')
  updateRoomConfig(parent.id, { mode: 'manual', limit: 99 })
  expect(useRooms.getState().rooms[0]).toMatchObject({
    title: 'Architecture Review',
    mode: 'manual',
    limit: 24
  })

  clearRoomTranscript(parent.id)
  expect(useRooms.getState().rooms[0]).toMatchObject({
    messages: [],
    finalId: undefined,
    brief: ''
  })

  deleteRoom(parent.id)
  expect(useRooms.getState().rooms).toEqual([])
  expect(useBotStore.getState().selectedBotId).toBe('fallback-bot')
})
