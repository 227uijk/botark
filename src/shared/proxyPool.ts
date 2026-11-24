/** Pure proxy-pool bookkeeping, shared by the main process and tests. */

export interface PoolSlot {
  id: string
  assignedAccountId?: string
}

/**
 * Give every account in `accountIds` one pool slot (1-to-1, never shared).
 *
 * Keep the first saved slot for each live account. A slot is freed if it
 * duplicates an assignment or its account is neither listed nor kept
 * alive by `keep` (e.g. a login still in flight). Callers used to pass
 * partial lists (Muse ids only, or saved accounts without rows still
 * logging in), which freed live accounts' slots and handed the same proxy
 * to a second account.
 */
export function planPoolAssignment<T extends PoolSlot>(
  pool: readonly T[],
  accountIds: readonly string[],
  keep: (accountId: string) => boolean = () => false
): { pool: T[]; assigned: Array<{ accountId: string; slot: T }> } {
  const listed = new Set(accountIds)
  const held = new Map<string, T>()
  const next = pool.map((slot) => {
    const accountId = slot.assignedAccountId
    if (!accountId) return { ...slot }
    if (held.has(accountId) || (!listed.has(accountId) && !keep(accountId))) {
      return { ...slot, assignedAccountId: undefined }
    }
    const copy = { ...slot }
    held.set(accountId, copy)
    return copy
  })
  const free = next.filter((slot) => !slot.assignedAccountId).values()
  const assigned: Array<{ accountId: string; slot: T }> = []
  for (const accountId of listed) {
    const slot = held.get(accountId) ?? free.next().value
    if (!slot) continue // pool exhausted: this account stays on its current setting
    slot.assignedAccountId = accountId
    assigned.push({ accountId, slot })
  }
  return { pool: next, assigned }
}

/** Free the slot held by one account (failed/cancelled login, deleted account). */
export function releasePoolSlot<T extends PoolSlot>(pool: readonly T[], accountId: string): T[] {
  return pool.map((slot) => (slot.assignedAccountId === accountId ? { ...slot, assignedAccountId: undefined } : slot))
}

/** Serialize async read-modify-write sections (JSON stores on disk). */
export function createMutex(): <R>(fn: () => Promise<R> | R) => Promise<R> {
  let tail: Promise<unknown> = Promise.resolve()
  return <R>(fn: () => Promise<R> | R): Promise<R> => {
    const run = tail.then(fn, fn)
    tail = run.catch(() => undefined)
    return run
  }
}
