import { afterEach, expect, it, vi } from 'vitest'
import type { HermesRpcResponse } from '@shared/ipc'
import { HermesAdapter } from './HermesAdapter'

afterEach(() => vi.unstubAllGlobals())

it('does not clear a newer turn when the superseded send settles', async () => {
  let finishFirst!: (res: HermesRpcResponse) => void
  let finishSecond!: (res: HermesRpcResponse) => void
  const rpc = vi.fn()
    .mockReturnValueOnce(new Promise((resolve) => { finishFirst = resolve }))
    .mockReturnValueOnce(new Promise((resolve) => { finishSecond = resolve }))
  vi.stubGlobal('window', { electron: { hermes: { onEvent: () => () => undefined, rpc } } })
  const adapter = new HermesAdapter()
  const listener = vi.fn()
  adapter.subscribe(listener)
  const message = { accountId: 'fixture', conversationId: 'bot', text: 'Hello' }

  const first = adapter.sendMessage(message)
  const second = adapter.sendMessage({ ...message, text: 'New turn' })
  listener.mockClear()
  finishFirst({ ok: false, status: 500, message: 'Fixture cancelled' })
  await first.catch(() => undefined)

  expect(adapter.getStatus(message.accountId)).toBe('busy')
  expect(listener).not.toHaveBeenCalled()

  finishSecond({ ok: true, data: { text: 'New reply' } })
  await second
  expect(adapter.getStatus(message.accountId)).toBe('online')
  expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'typing', isTyping: false }))
})
