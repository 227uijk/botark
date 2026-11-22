import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { registerWorkspaceIpc, stopWorkspaces } from './hub'
import type { WorkspaceRequest, WorkspaceView } from '@shared/workspace'
import type { BrowserWindow } from 'electron'

const mocks = vi.hoisted(() => ({ open: vi.fn(), confirm: vi.fn(), handle: vi.fn() }))
vi.mock('electron', () => ({ BrowserWindow: {}, ipcMain: { handle: mocks.handle },
  dialog: { showOpenDialog: mocks.open, showMessageBox: mocks.confirm } }))
vi.mock('../hermes/hermesStore', () => ({ getHermesAccount: () => ({ baseUrl: 'http://localhost:8080' }) }))
const sender = { mainFrame: {} }
let root: string
const request = (scope: string, req: WorkspaceRequest): Promise<WorkspaceView> =>
  mocks.handle.mock.calls[0]![1]({ sender, senderFrame: sender.mainFrame }, scope, req)
beforeEach(async () => {
  vi.clearAllMocks()
  root = await mkdtemp(join(tmpdir(), 'hub-fixture-'))
  mocks.open.mockResolvedValue({ canceled: false, filePaths: [root] })
  mocks.confirm.mockResolvedValue({ response: 1 })
  registerWorkspaceIpc(() => ({ webContents: sender } as unknown as BrowserWindow))
  await request('room', { op: 'bind' })
})
afterEach(async () => { stopWorkspaces(); await rm(root, { recursive: true, force: true }) })
it('serves an authenticated loopback MCP client and requires approval for each write', async () => {
  const yaml = join(root, 'config.yaml')
  await writeFile(yaml, 'model: fixture\n')
  mocks.open.mockResolvedValue({ canceled: false, filePaths: [yaml] })
  await request('room', { op: 'hermes', accountId: 'local' })
  const config = parse(await readFile(yaml, 'utf8'))
  expect(config.model).toBe('fixture')
  const { url, headers } = config.mcp_servers.botark_workspace
  expect((await fetch(url, { method: 'POST' })).status).toBe(403)
  const client = new Client({ name: 'fixture', version: '1' })
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }))
    expect((await client.listTools()).tools.map((t) => t.name)).toContain('patch')
    const call = { name: 'write', arguments: { path: 'draft.txt', text: 'accepted' } }
    mocks.confirm.mockResolvedValueOnce({ response: 0 })
    expect((await client.callTool(call)).isError).toBe(true)
    await expect(readFile(join(root, 'draft.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect((await client.callTool(call)).isError).toBeFalsy()
    expect(await readFile(join(root, 'draft.txt'), 'utf8')).toBe('accepted')

    const imported = join(root, 'mcp.json')
    await writeFile(imported, JSON.stringify({ mcpServers: { fixture: { url, headers } } }))
    mocks.open.mockResolvedValue({ canceled: false, filePaths: [root] })
    await request('other', { op: 'bind' })
    mocks.open.mockResolvedValue({ canceled: false, filePaths: [imported] })
    await request('other', { op: 'import' })
    expect((await request('other', { op: 'start', server: 'fixture' })).tools.map((t) => t.name)).toContain('fixture__read')
    expect((await request('other', { op: 'stop', server: 'fixture' })).tools.map((t) => t.name)).not.toContain('fixture__read')
  } finally { await client.close() }
})

it('starts and stops an imported stdio server using its actual MCP handshake', async () => {
  const script = [
    "const { Server } = require('@modelcontextprotocol/sdk/server/index.js')",
    "const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')",
    "const { ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js')",
    "const server = new Server({name:'fixture',version:'1'}, {capabilities:{tools:{}}})",
    "server.setRequestHandler(ListToolsRequestSchema, async () => ({tools:[{name:'hello',inputSchema:{type:'object'}}]}))",
    "server.connect(new StdioServerTransport())"
  ].join('\n')
  const file = join(root, 'fixture.json')
  await writeFile(file, JSON.stringify({ mcpServers: { local: { command: process.execPath, args: ['-e', script] } } }))
  mocks.open.mockResolvedValue({ canceled: false, filePaths: [file] })
  await request('room', { op: 'import' })
  const started = await request('room', { op: 'start', server: 'local' })
  expect(started.tools.map((t) => t.name)).toContain('local__hello')
  const stopped = await request('room', { op: 'stop', server: 'local' })
  expect(stopped.servers).toEqual([{ name: 'local', running: false }])
})
