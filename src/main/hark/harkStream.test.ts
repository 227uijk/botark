import type { Session } from 'electron'
import { expect, it, vi } from 'vitest'
import { readHarkStream } from './harkClient'

it('decodes split SSE records for the selected conversation and ignores heartbeat events', async () => {
  const chunks = ['event: ping\r\ndata: beat\r\n\r\ndata: {"text":"', 'line"}\ndata: part two\n\n']
  const fetch = vi.fn(async () => new Response(new ReadableStream({
    start(controller) {
      for (const part of chunks) controller.enqueue(new TextEncoder().encode(part))
      controller.close()
    }
  }), { headers: { 'Content-Type': 'text/event-stream' } }))
  const frames: string[] = []
  await readHarkStream({ fetch } as unknown as Session, 'fixture/thread', 'manager', 'initial',
    new AbortController().signal, (frame) => frames.push(frame))
  expect(frames).toEqual(['{"text":"line"}\npart two'])
  const url = new URL((fetch.mock.calls as unknown as [string][])[0]![0])
  expect(url.searchParams.get('conversationId')).toBe('fixture/thread')
})
