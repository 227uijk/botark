import { expect, it, vi } from 'vitest'
import { cancelAllHermesRuns, decideHermesApproval, listHermesApprovals, sendHermesMessage } from './hermesClient'

vi.mock('./hermesStore', () => ({
  getHermesAccount: () => ({ baseUrl: 'http://127.0.0.1:8642' })
}))

function streamingFixture() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const stream = new ReadableStream<Uint8Array>({ start: (value) => { controller = value } })
  return {
    response: new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    approval(runId: string, requestId: string) {
      controller.enqueue(new TextEncoder().encode(
        `event: approval.request\ndata: ${JSON.stringify({ run_id: runId, request_id: requestId, description: 'Fixture' })}\n\n`
      ))
    },
    close() { controller.close() }
  }
}

it('preserves the current run and approvals when a replaced stream finishes late', async () => {
  const accountId = 'shared-fixture'
  const old = streamingFixture()
  const next = streamingFixture()
  const oldActivity = vi.fn()
  const oldApprovals = vi.fn()
  const task = (stream: typeof old, opts: Partial<Parameters<typeof sendHermesMessage>[0]['callbacks']> = {}) =>
    sendHermesMessage({
      accountId, sessionId: 'session', text: 'Hello',
      callbacks: { onDelta: vi.fn(), ...opts },
      fetchImpl: async () => stream.response
    })
  const first = task(old, { onActivity: oldActivity, onApprovals: oldApprovals })
  let second: ReturnType<typeof task> | undefined

  try {
    old.approval('initial-run', 'initial-approval')
    await vi.waitFor(() => expect(listHermesApprovals(accountId).map((a) => a.id)).toEqual(['initial-approval']))

    second = task(next)
    next.approval('new-run', 'new-approval')
    await vi.waitFor(() => expect(listHermesApprovals(accountId).map((a) => a.id)).toEqual(['new-approval']))

    const stopped = expect(first).rejects.toMatchObject({ name: 'AbortError' })
    old.approval('initial-run', 'late-approval')
    old.close()
    await stopped
    expect(listHermesApprovals(accountId).map((a) => a.id)).toEqual(['new-approval'])
    expect(oldApprovals).not.toHaveBeenCalledWith([])
    expect(oldActivity).not.toHaveBeenCalledWith({ code: 'idle', busy: false })
    await expect(decideHermesApproval(accountId, 'initial-approval', 'deny')).rejects.toMatchObject({ status: 409 })
  } finally {
    cancelAllHermesRuns(accountId)
    next.close()
    await Promise.allSettled(second ? [first, second] : [first])
  }
})
