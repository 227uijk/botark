import { createServer, type Server } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WebSocketServer } from 'ws'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { HERMES_CHANNELS, type HermesAuthStatus } from '@shared/ipc'
import { registerHermesIpc } from './hermesIpc'
import { getHermesAccountMetadata, getDashboardCredential } from './hermesStore'
import { setDashboardAccess } from './hermesDashboardAccount'

const mock = vi.hoisted(() => ({
  path: '',
  handlers: new Map<string, (event: unknown, arg: unknown) => Promise<unknown>>(),
  contents: { mainFrame: {}, isDestroyed: () => false, send: vi.fn() },
  proxy: false
}))
vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => [{ isDestroyed: () => false, webContents: mock.contents }] },
  ipcMain: { handle: (name: string, fn: never) => mock.handlers.set(name, fn) },
  app: { getPath: () => mock.path },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) => value.toString().slice('encrypted:'.length)
  }
}))
vi.mock('../muse/accountProxy', () => ({ loadAccountProxyUrl: async () => mock.proxy ? 'http://example.com' : undefined }))

let fixture: Server
let websocket: WebSocketServer
let baseUrl: string
let authState = ''
let ticket = 0
let refreshes = 0
const scopedProfiles: unknown[] = []
const openTickets = new Set<string>()
const seen: string[] = []
const issue = (index: number) => ({ access_token: `access-${index}`, refresh_token: `refresh-${index}`, expires_at: Date.now() / 1000 + 900 })

beforeAll(async () => {
  mock.path = await mkdtemp(join(tmpdir(), 'botark-dashboard-test-'))
  registerHermesIpc(() => ({ webContents: mock.contents }) as never)
  fixture = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const route = url.pathname
    seen.push(route)
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk)
    const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}
    const json = (data: unknown, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(data))
    }
    switch (route) {
      case '/api/auth/providers': return json({ providers: [{ name: 'basic', supports_password: true }] })
      case '/auth/native/authorize':
        authState = url.searchParams.get('state') || ''
        res.writeHead(302, { location: '/login', 'set-cookie': 'hermes_session_pkce=fixture; HttpOnly' })
        return res.end()
      case '/auth/password-login':
        if (req.headers.cookie !== 'hermes_session_pkce=fixture' || payload.username !== 'test' || payload.password !== 'fixture-only-secret')
          return json({}, 401)
        return json({ ok: true, next: `http://127.0.0.1/botark-dashboard-login?state=${authState}&code=stub-code` })
      case '/auth/native/token':
        if (payload.code !== 'stub-code') return json({}, 401)
        return json(issue(0))
      case '/auth/native/refresh':
        if (payload.refresh_token !== `refresh-${refreshes}`) return json({}, 401)
        return json(issue(++refreshes))
      case '/api/auth/me':
      case '/api/auth/ws-ticket':
      case '/api/sessions/old-session/messages':
        if (req.headers.authorization !== `Bearer access-${refreshes}`) return json({}, 401)
        if (route.endsWith('me')) return json({ provider: 'basic' })
        if (route.endsWith('messages')) return json({ messages: [{ id: 1, role: 'assistant', content: 'Existing math history' }] })
        openTickets.add(String(++ticket))
        return json({ ticket: String(ticket) })
      default: return json({}, 404)
    }
  })
  websocket = new WebSocketServer({ noServer: true })
  fixture.on('upgrade', (req, sock, head) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (url.pathname !== '/api/ws' || !openTickets.delete(url.searchParams.get('ticket') ?? '')) { sock.destroy(); return }
    websocket.handleUpgrade(req, sock, head, ws => websocket.emit('connection', ws))
  })
  websocket.on('connection', ws => ws.on('message', input => {
    const frame = JSON.parse(String(input))
    const { id, method, params } = frame
    const reply = (result: object) => ws.send(JSON.stringify({ jsonrpc: '2.0', id, result }))
    const emit = (type: string, payload: object) => ws.send(JSON.stringify({
      jsonrpc: '2.0', method: 'event', params: { type, session_id: 'runtime-session', payload }
    }))
    if (params?.profile) scopedProfiles.push(params.profile)
    switch (method) {
      case 'profiles.list': return reply({ profiles: [{ name: 'math' }] })
      case 'session.list': return reply({ sessions: [{ id: 'old-session', title: 'Bot Chat' }] })
      case 'session.resume': return reply({ runtime: true, session_id: 'runtime-session', session_key: params.session_id, running: false })
      case 'client.capabilities': return reply({ server_requests: ['approval'] })
      case 'prompt.submit':
        reply({ status: 'streaming' })
        setImmediate(() => {
          emit('message.delta', { text: 'hello' })
          emit('message.complete', { text: 'hello from Hermes', status: 'complete' })
        })
        return
      default: return reply({})
    }
  }))
  await new Promise<void>((resolve, reject) => fixture.once('error', reject).listen(0, '127.0.0.1', () => resolve()))
  baseUrl = `http://127.0.0.1:${(fixture.address() as { port: number }).port}`
})
afterAll(async () => {
  for (const ws of websocket?.clients ?? []) ws.terminate()
  websocket?.close()
  fixture?.closeAllConnections()
  fixture?.close()
  await rm(mock.path, { recursive: true, force: true })
})
const event = { sender: mock.contents, senderFrame: mock.contents.mainFrame }
const call = (name: string, input?: unknown, client: unknown = event) => mock.handlers.get(name)!(client, input)
const credentials = { username: 'test', password: 'fixture-only-secret', profile: 'math' }
const accountId = 'dashboard-it'

it('logs in through Desktop IPC, keeps and resumes the old profile session, and rotates a persisted refresh token', async () => {
  const result = await call(HERMES_CHANNELS.configure, { accountId, baseUrl, dashboardLogin: credentials }) as HermesAuthStatus
  expect(result).toMatchObject({ signedIn: true, authMode: 'dashboard', dashboardProfile: 'math', hasApiKey: false })
  expect(JSON.stringify(result)).not.toMatch(/fixture-only-secret|access-0|refresh-0/)
  const saved = await readFile(join(mock.path, 'hermes-accounts.json'), 'utf8')
  expect(saved).toContain('dashboardAuthEnc')
  expect(saved).not.toMatch(/fixture-only-secret|access-0|refresh-0|apiKeyEnc/)
  expect(getDashboardCredential(accountId)?.refreshToken).toBe('refresh-0')
  const rpc = (op: string, fields: object = {}) => call(HERMES_CHANNELS.rpc, { accountId, op, ...fields })
  expect(await rpc('listSessions')).toMatchObject({ ok: true, data: [{ id: 'old-session', title: 'Bot Chat' }] })
  expect(await rpc('getSessionMessages', { sessionId: 'old-session' })).toMatchObject({ ok: true, data: [{ text: 'Existing math history' }] })
  expect(await rpc('sendMessage', { sessionId: 'old-session', text: 'test chat', requestId: 'run1' })).toMatchObject({
    ok: true, data: { sessionId: 'old-session', text: 'hello from Hermes' }
  })
  expect(mock.contents.send.mock.calls.map(([, data]) => data)).toContainEqual(expect.objectContaining({
    type: 'accepted', requestId: 'run1', sessionId: 'old-session'
  }))
  expect(scopedProfiles.length).toBeGreaterThanOrEqual(4)
  expect(scopedProfiles.every(p => p === 'math')).toBe(true)
  setDashboardAccess(accountId, { token: 'expired', expiresAt: 0 })
  await Promise.all([rpc('listSessions'), rpc('getSessionMessages', { sessionId: 'old-session' })])
  expect(refreshes).toBe(1)
  expect(getDashboardCredential(accountId)?.refreshToken).toBe('refresh-1')
  expect(seen).not.toContain('/v1/models')

  await expect(call(HERMES_CHANNELS.configure, { accountId, baseUrl }, { ...event, senderFrame: {} })).rejects.toThrow('Desktop window required')
  expect(getHermesAccountMetadata(accountId)?.authMode).toBe('dashboard')
  await call(HERMES_CHANNELS.clearAuth, accountId)
  expect(getDashboardCredential(accountId)).toBeUndefined()
})

it('never saves a session for an absent profile, embedded frame, or proxy-only account', async () => {
  const input = { accountId: 'wrong-profile', baseUrl, dashboardLogin: { ...credentials, profile: 'missing' } }
  await expect(call(HERMES_CHANNELS.configure, input, { ...event, senderFrame: {} })).rejects.toThrow('Desktop window required')
  mock.proxy = true
  try {
    const before = seen.length
    expect(await call(HERMES_CHANNELS.configure, input)).toMatchObject({ signedIn: false, error: expect.stringContaining('代理') })
    expect(seen).toHaveLength(before)
  } finally { mock.proxy = false }
  // The previous test changed the fixture's active bearer generation.
  refreshes = 0
  expect(await call(HERMES_CHANNELS.configure, input)).toMatchObject({ signedIn: false, error: expect.stringContaining('Profile') })
  expect(getHermesAccountMetadata(input.accountId)).toBeNull()
})
