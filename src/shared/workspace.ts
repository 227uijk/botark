export interface WorkspaceTool {
  name: string
  description?: string
  inputSchema: { type: 'object'; [key: string]: unknown }
}
export type WorkspaceRequest =
  | { op: 'status' | 'bind' | 'unbind' | 'import' }
  | { op: 'start' | 'stop'; server: string }
  | { op: 'run'; tool: string; args: Record<string, unknown>; recipient: string }
  | { op: 'hermes'; accountId: string }
export interface WorkspaceView {
  directory?: string
  servers: { name: string; running: boolean }[]
  tools: WorkspaceTool[]
}
export interface WorkspaceBridge {
  manage(scope: string, request: Exclude<WorkspaceRequest, { op: 'run' }>): Promise<WorkspaceView>
  run(scope: string, tool: string, args: Record<string, unknown>, recipient: string): Promise<string>
}
export const WORKSPACE_CHANNEL = 'botark:workspace'
