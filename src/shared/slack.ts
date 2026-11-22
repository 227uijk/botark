export const SLACK_CHANNEL = 'botark:slack'
export const SLACK_INBOUND = 'botark:slack:message'
export interface SlackBinding {
  roomId: string
  channel: string
  thread?: string
  defaultThread?: string
}
export interface SlackInbound {
  id: string
  roomId: string
  thread: string
  fork: boolean
  user: string
  text: string
}
export interface SlackState {
  connected: boolean
  saved: boolean
  bindings: SlackBinding[]
}
export type SlackRequest =
  | { op: 'status' | 'disconnect' | 'forget' }
  | { op: 'connect'; appToken?: string; botToken?: string }
  | { op: 'bind'; roomId: string; channel: string; thread?: string }
  | { op: 'unbind'; roomId: string }
  | { op: 'post'; roomId: string; thread?: string; text: string }
  | { op: 'received'; id: string }
export interface SlackBridge {
  request(req: SlackRequest): Promise<SlackState>
  onMessage(callback: (event: SlackInbound) => void): () => void
}
