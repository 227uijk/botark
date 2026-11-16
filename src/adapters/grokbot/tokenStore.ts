import type { GrokAuthSession } from './types'

/**
 * In-memory session metadata store for the renderer/adapter process.
 * Real OAuth Bearer tokens remain isolated inside Electron main (`safeStorage`).
 */
const sessions = new Map<string, GrokAuthSession>()

export function getGrokAuth(accountId: string): GrokAuthSession | undefined {
  return sessions.get(accountId)
}

export function setGrokAuth(session: GrokAuthSession): void {
  sessions.set(session.accountId, { ...session, signedIn: session.signedIn ?? true })
}

export function clearGrokAuth(accountId: string): void {
  sessions.delete(accountId)
}

export function listGrokAuthAccountIds(): string[] {
  return [...sessions.keys()]
}
