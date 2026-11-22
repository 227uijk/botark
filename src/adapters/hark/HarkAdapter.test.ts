import { afterEach, expect, it, vi } from 'vitest'
import type { HarkRpcRequest } from '@shared/ipc'
import { HarkAdapter } from './HarkAdapter'

afterEach(() => vi.unstubAllGlobals())
it('reads, sends and watches the explicitly selected conversation', async () => {
  const rpc = vi.fn(async (req: HarkRpcRequest) => ({
    ok: true, data: req.op === 'conversationSnapshot'
      ? { conversationId: req.conversationId, messages: [{ id: 'old' }] } : {}
  }))
  vi.stubGlobal('window', { electron: { hark: { onEvent: () => () => {}, rpc } } })
  await new HarkAdapter().sendMessage({ accountId: 'account', conversationId: 'bot', sessionId: 'project', text: 'Hi' })
  expect(rpc.mock.calls.map(([r]) => r.op)).toEqual(['conversationSnapshot', 'sendMessage', 'pollReply'])
  for (const [request] of rpc.mock.calls) expect(request).toMatchObject({ conversationId: 'project' })
  expect(rpc.mock.calls[2]?.[0]).toMatchObject({ afterMessageIds: ['old'] })
})
