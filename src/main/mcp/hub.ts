import { createServer, type Server as HttpServer } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { parseDocument } from 'yaml'
import { WORKSPACE_CHANNEL, type WorkspaceRequest, type WorkspaceTool, type WorkspaceView } from '@shared/workspace'
import { createMutex } from '@shared/proxyPool'
import { getHermesAccount } from '../hermes/hermesStore'
import { fileTools, workspaceFile } from './workspaceFiles'

type Config = { command: string; args?: string[]; env?: Record<string, string> } |
  { url: string; headers?: Record<string, string> }
interface External {
  config: Config
  client?: Client
  tools: WorkspaceTool[]
}
interface Binding {
  root: string
  servers: Map<string, External>
  endpoint?: { server: HttpServer; url: string; token: string }
}
const scopes = new Map<string, Binding>()
const manage = createMutex()

function view(binding?: Binding): WorkspaceView {
  if (!binding) return { servers: [], tools: [] }
  const servers = [...binding.servers]
  return {
    directory: binding.root,
    servers: servers.map(([name, ext]) => ({ name, running: !!ext.client })),
    tools: [...fileTools, ...servers.flatMap(([server, ext]) => ext.tools.map((t) => ({ ...t, name: server + '__' + t.name })))]
  }
}

async function approve(win: BrowserWindow, message: string, detail: string) {
  const choice = await dialog.showMessageBox(win, {
    type: 'question', message, detail, buttons: ['取消', '允许一次'], defaultId: 0, cancelId: 0, noLink: true
  })
  if (choice.response !== 1) throw new Error('用户已取消本次操作')
}

async function invoke(win: BrowserWindow, binding: Binding, scope: string, tool: string, args: Record<string, unknown>, recipient: string) {
  if (!view(binding).tools.some((t) => t.name === tool)) throw new Error('工具不可用')
  await approve(win, `${recipient} 请求使用 ${tool}`, `目录：${binding.root}\n参数：${JSON.stringify(args, null, 2)}`)
  if (scopes.get(scope) !== binding) throw new Error('目录授权已变更')
  const separator = tool.indexOf('__')
  if (separator < 0) return workspaceFile(binding.root, tool, args)
  const ext = binding.servers.get(tool.slice(0, separator))
  if (!ext?.client) throw new Error('MCP 服务已停止')
  const result = await ext.client.callTool({ name: tool.slice(separator + 2), arguments: args })
  const text = JSON.stringify(result.content ?? result)
  return text.length > 96000 ? text.slice(0, 96000) + '\n… (result truncated)' : text
}

async function startExternal(ext: External, win: BrowserWindow, name: string) {
  if (ext.client) return
  const config = ext.config
  const client = new Client({ name: 'BotArk', version: '1' })
  await approve(win, `启动 MCP 服务 ${name}`, 'command' in config
    ? `以当前用户身份运行本地程序：${config.command} ${JSON.stringify(config.args ?? [])}\n该程序可以访问当前用户可访问的文件。`
    : `连接 ${new URL(config.url).origin}`)
  const transport = 'command' in config ? new StdioClientTransport({ ...config, stderr: 'ignore' }) :
    new StreamableHTTPClientTransport(new URL(config.url), { requestInit: { headers: config.headers } })
  try {
    await client.connect(transport)
    const tools: WorkspaceTool[] = []
    let cursor: string | undefined
    do {
      const page = await client.listTools({ cursor })
      tools.push(...page.tools)
      cursor = page.nextCursor
    } while (cursor)
    ext.client = client
    ext.tools = tools
    client.onclose = () => { if (ext.client === client) { ext.client = undefined; ext.tools = [] } }
  } catch (e) { await client.close(); throw e }
}

async function dispose(binding: Binding) {
  binding.endpoint?.server.closeAllConnections()
  binding.endpoint?.server.close()
  await Promise.all([...binding.servers.values()].map((ext) => ext.client?.close()))
}

async function startEndpoint(scope: string, binding: Binding, win: BrowserWindow) {
  if (binding.endpoint) return binding.endpoint
  const token = randomBytes(32).toString('base64url')
  const http = createServer(async (req, res) => {
    if (req.url !== '/mcp' || req.headers.authorization !== 'Bearer ' + token || req.headers.origin) {
      res.writeHead(403).end()
      return
    }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }).end(); return }
    const server = new Server({ name: 'botark-workspace', version: '1' }, { capabilities: { tools: {} } })
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: view(binding).tools }))
    server.setRequestHandler(CallToolRequestSchema, async (call) => {
      try {
        const text = await invoke(win, binding, scope, call.params.name, call.params.arguments ?? {}, 'Hermes')
        return { content: [{ type: 'text', text }] }
      } catch (e) { return { isError: true, content: [{ type: 'text', text: String(e) }] } }
    })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    res.on('close', () => { void server.close() })
    try { await server.connect(transport); await transport.handleRequest(req, res) }
    catch { if (!res.headersSent) res.writeHead(500); res.end() }
  })
  await new Promise<void>((resolve, reject) => {
    http.once('error', reject)
    http.listen(0, '127.0.0.1', resolve)
  })
  const address = http.address()
  if (!address || typeof address === 'string') throw new Error('MCP listener unavailable')
  return binding.endpoint = { server: http, token, url: `http://127.0.0.1:${address.port}/mcp` }
}

async function connectHermes(win: BrowserWindow, scope: string, binding: Binding, accountId: string) {
  const account = getHermesAccount(accountId)
  if (!account || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(account.baseUrl).hostname)) {
    throw new Error('Loopback MCP 需要同机 Hermes 网关')
  }
  const pick = await dialog.showOpenDialog(win, { title: '选择此 Hermes 实例的 config.yaml', properties: ['openFile'],
    filters: [{ name: 'Hermes YAML', extensions: ['yaml', 'yml'] }] })
  if (pick.canceled) return
  const path = await realpath(pick.filePaths[0]!)
  const original = await readFile(path, 'utf8')
  const config = parseDocument(original)
  if (config.errors.length) throw new Error('配置文件不是有效 YAML')
  await approve(win, '将本地工作区接入 Hermes', `${path}\nmcp_servers.botark_workspace 将指向 ${binding.root}。重新加载 Hermes 配置后生效。`)
  const endpoint = await startEndpoint(scope, binding, win)
  config.setIn(['mcp_servers', 'botark_workspace'], { url: endpoint.url, headers: { Authorization: 'Bearer ' + endpoint.token } })
  if (await readFile(path, 'utf8') !== original) throw new Error('Hermes 配置已变更，请重试')
  const tmp = path + '.' + randomUUID()
  try { await writeFile(tmp, config.toString(), { mode: 0o600, flag: 'wx' }); await rename(tmp, path) }
  finally { await rm(tmp, { force: true }) }
}

export function registerWorkspaceIpc(owner: () => BrowserWindow | null) {
  ipcMain.handle(WORKSPACE_CHANNEL, async (event, scope: string, request: WorkspaceRequest) => {
    const win = owner()
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Desktop window required')
    if (request.op === 'run') {
      const binding = scopes.get(scope)
      if (!binding) throw new Error('请选择工作区')
      return invoke(win, binding, scope, request.tool, request.args, request.recipient)
    }
    return manage(async () => {
      const binding = scopes.get(scope)
      if (request.op === 'status') return view(binding)
      if (request.op === 'bind') {
        const pick = await dialog.showOpenDialog(win, { title: '授权工作区目录', properties: ['openDirectory'] })
        if (pick.canceled) return view(binding)
        const replacement: Binding = { root: await realpath(pick.filePaths[0]!), servers: new Map() }
        scopes.set(scope, replacement)
        if (binding) await dispose(binding)
        return view(replacement)
      }
      if (!binding) throw new Error('请选择工作区')
      switch (request.op) {
        case 'unbind':
          scopes.delete(scope)
          await dispose(binding)
          return view()
        case 'hermes':
          await connectHermes(win, scope, binding, request.accountId)
          break
        case 'import': {
          const pick = await dialog.showOpenDialog(win, { title: '导入 mcpServers JSON', properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
          if (pick.canceled) break
          const json = JSON.parse(await readFile(pick.filePaths[0]!, 'utf8'))
          if (!json.mcpServers || typeof json.mcpServers !== 'object' || Array.isArray(json.mcpServers)) throw new Error('缺少 mcpServers 对象')
          const configs = Object.entries(json.mcpServers) as [string, Config][]
          for (const [name, config] of configs) {
            if (!/^[a-zA-Z0-9_-]+$/.test(name) || name.includes('__') || !config ||
                !(('command' in config && typeof config.command === 'string') ||
                  ('url' in config && ['http:', 'https:'].includes(new URL(config.url).protocol)))) {
              throw new Error(`无效的 MCP 配置：${name}`)
            }
          }
          for (const [name, config] of configs) {
            await binding.servers.get(name)?.client?.close()
            binding.servers.set(name, { config, tools: [] })
          }
          break
        }
        case 'start':
        case 'stop': {
          const ext = binding.servers.get(request.server)
          if (!ext) throw new Error('未知服务')
          if (request.op === 'start') await startExternal(ext, win, request.server)
          else { await ext.client?.close(); ext.client = undefined; ext.tools = [] }
          break
        }
      }
      return view(binding)
    })
  })
}

export function stopWorkspaces() {
  for (const binding of scopes.values()) void dispose(binding)
  scopes.clear()
}
