import type { PlatformId } from '@adapters/types'

export interface RoomMember {
  botId: string
  accountId: string
  platform: PlatformId
  name: string
  agentId?: string
  sessionId?: string
  cursor: number
}
export interface RoomMessage {
  id: string
  author: string
  text: string
}
export interface CollabRoom {
  id: string
  title: string
  members: RoomMember[]
  messages: RoomMessage[]
  mode: 'manual' | 'auto'
  limit: number
  brief: string
  slackParent?: string
  slackChannel?: string
  slackThread?: string
  finalId?: string
}

export function mentions(text: string, members: RoomMember[]): RoomMember[] {
  const escaped = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return members.map((member) => ({
    member, index: text.search(new RegExp(`(?<![\\p{L}\\p{N}_])@${escaped(member.name)}(?![\\p{L}\\p{N}_])`, 'iu'))
  })).filter((match) => match.index >= 0).sort((a, b) => a.index - b.index).map((match) => match.member)
}

export function turnPrompt(room: CollabRoom, member: RoomMember): string {
  const context = room.messages.slice(Math.max(member.cursor, room.messages.length - 20))
    .map((m) => `[${m.author}] ${m.text}`).join('\n')
  return [
    `Collaboration room: ${room.title}. You are @${member.name}.`,
    `Members: ${room.members.map((m) => '@' + m.name).join(', ')}.`,
    'Review, revise and choose a writer as needed. Mention a peer only to request their next turn. Start the final deliverable with [FINAL] on its own line.',
    `Human brief: ${room.brief}`, context
  ].join('\n\n')
}

export function isFinal(text: string): boolean {
  return /^\[FINAL\](?:\s|$)/i.test(text.trimStart())
}

export function roomMarkdown(room: CollabRoom): string {
  const final = room.messages.find((m) => m.id === room.finalId)
  return final ? `# ${room.title}\n\n${final.text.replace(/^\s*\[FINAL\]\s*/i, '')}\n` :
    `# ${room.title}\n\n${room.messages.map((m) => `## ${m.author}\n\n${m.text}`).join('\n\n')}\n`
}
