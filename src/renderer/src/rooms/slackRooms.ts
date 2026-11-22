import type { SlackInbound } from '@shared/slack'
import type { SlackBridge } from '@shared/slack'
import { getBridge } from '@/lib/bridge'
import { submitBrief, useRooms } from './roomStore'
import type { CollabRoom } from './model'

export function receiveSlackMessage(event: SlackInbound): boolean {
  const rooms = useRooms.getState().rooms
  const parent = rooms.find((r) => r.id === event.roomId)
  if (!parent) return false
  const id = event.fork ? event.roomId + '/slack/' + event.channel + '/' + event.thread : parent.id
  let room = rooms.find((r) => r.id === id)
  if (!room) {
    room = { ...parent, id, title: parent.title + ' · ' + event.text.slice(0, 40),
      messages: [], brief: '', finalId: undefined, slackParent: parent.id, slackThread: event.thread, slackChannel: event.channel,
      members: parent.members.map((m) => ({ ...m, cursor: 0, sessionId: ['grok', 'dot'].includes(m.platform) ? m.sessionId : undefined })) }
    useRooms.setState((s) => ({ rooms: [...s.rooms, room!] }))
  }
  if (!room.messages.some((m) => m.id === event.id)) void submitBrief(id, event.text, 'Slack ' + event.user, event.id)
  return true
}

function publishNew(bridge: SlackBridge, room: CollabRoom, previousLength: number) {
  for (const message of room.messages.slice(previousLength)) {
    if (message.id.startsWith('slack-')) continue
    void bridge.request({ op: 'post', roomId: room.slackParent ?? room.id, thread: room.slackThread, channel: room.slackChannel,
      text: `[${message.author}] ${message.text}` }).catch((e) => useRooms.setState((s) => ({
        errors: { ...s.errors, [room.id]: `Slack 同步失败：${e instanceof Error ? e.message : String(e)}` }
      })))
  }
}
export function startSlackRooms() {
  const bridge = getBridge()?.slack
  if (!bridge) return () => {}
  const off = bridge.onMessage((msg) => {
    if (receiveSlackMessage(msg)) void bridge.request({ op: 'received', id: msg.id }).catch(() => {})
  })
  const stop = useRooms.subscribe((state, before) => {
    if (state.rooms === before.rooms) return
    for (const room of state.rooms) {
      const old = before.rooms.find((r) => r.id === room.id)
      if (old && room.messages.length > old.messages.length) publishNew(bridge, room, old.messages.length)
    }
  })
  return () => { off(); stop() }
}
