import type { AdapterEvent } from '@adapters/types'
import type { Bot } from '@/types'

export function belongsToSelectedSession(event: AdapterEvent, bots: Bot[]): boolean {
  const source = event.type === 'message' ? event.message : event
  if ('conversationId' in source && source.conversationId.startsWith('room-turn-')) return false
  if (!('sessionId' in source) || !source.sessionId) return true
  const bot = 'conversationId' in source
    ? bots.find((b) => b.id === source.conversationId)
    : bots.find((b) => b.activeAccountId === source.accountId)
  return !!bot && bot.activeAccountId === source.accountId &&
    (!bot.activeSessionId || bot.activeSessionId === source.sessionId)
}
