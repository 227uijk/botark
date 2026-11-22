import { expect, it, vi } from 'vitest'
import { receiveSlackMessage, startSlackRooms } from './slackRooms'
import { useRooms } from './roomStore'
import type { CollabRoom } from './model'
import type { SlackInbound } from '@shared/slack'

it('persists an inbound post once, keeps threads separate and forwards only new local posts', () => {
  const room: CollabRoom = { id: 'room', title: 'Review', members: [], limit: 8, mode: 'manual', brief: '', messages: [] }
  useRooms.setState({ rooms: [room] })
  const request = vi.fn().mockResolvedValue({})
  vi.stubGlobal('window', { electron: { slack: { request, onMessage: () => () => {} } } })
  const stop = startSlackRooms()
  try {
    const event: SlackInbound = { id: 'slack-C1-1.0', channel: 'C1', roomId: 'room', fork: true, thread: '1.0', text: 'Review thread one', user: 'U1' }
    receiveSlackMessage(event)
    receiveSlackMessage(event)
    receiveSlackMessage({ ...event, id: 'slack-C1-2.0', thread: '2.0', text: 'Review thread two' })
    const [parent, one, two] = useRooms.getState().rooms
    expect(parent?.messages).toEqual([])
    expect(one?.messages.map((m) => m.text)).toEqual(['Review thread one'])
    expect(two?.messages.map((m) => m.text)).toEqual(['Review thread two'])
    expect(request).not.toHaveBeenCalled()
    useRooms.setState((s) => ({ rooms: s.rooms.map((r) => r.id === one!.id ? {
      ...r, messages: [...r.messages, { id: 'local', author: 'Muse', text: 'Reviewed.' }]
    } : r) }))
    expect(request).toHaveBeenCalledExactlyOnceWith({ op: 'post', roomId: 'room', channel: 'C1', thread: '1.0', text: '[Muse] Reviewed.' })
  } finally { stop(); vi.unstubAllGlobals() }
})
