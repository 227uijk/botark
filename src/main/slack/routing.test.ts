import { expect, it } from 'vitest'
import { routeSlackMessage, splitSlackText } from './routing'

const bindings = [{ roomId: 'r', channel: 'C1', thread: '1.0' }]
const event = { type: 'message', text: '<@UBOT> @Muse review', user: 'U1', channel: 'C1', ts: '2.0', thread_ts: '1.0' }
it('routes the mapped thread and deduplicates message/app_mention by Slack message identity', () => {
  const first = routeSlackMessage(bindings, event, 'UBOT')
  expect(first).toMatchObject({ roomId: 'r', text: '@Muse review', fork: false })
  expect(routeSlackMessage(bindings, { ...event, type: 'app_mention' }, 'UBOT')).toEqual(first)
  expect(routeSlackMessage(bindings, { ...event, thread_ts: '3.0' }, 'UBOT')).toBeUndefined()
})
it('filters bots, edited messages and unrelated channels', () => {
  for (const change of [{ user: 'UBOT' }, { bot_id: 'B1' }, { subtype: 'message_changed' }, { channel: 'C2' }]) {
    expect(routeSlackMessage(bindings, { ...event, ...change }, 'UBOT')).toBeUndefined()
  }
})
it('isolates subsequent top-level discussions in channel mode', () => {
  expect(routeSlackMessage([{ roomId: 'r', channel: 'C1', defaultThread: '0.0' }], event, 'UBOT')?.fork).toBe(true)
})
it('preserves long unicode messages across Slack posts', () => {
  const input = '🙂'.repeat(12002)
  expect(splitSlackText(input)).toHaveLength(2)
  expect(splitSlackText(input).join('')).toBe(input)
})
