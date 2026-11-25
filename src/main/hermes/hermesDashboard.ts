/** The Dashboard is a different server/protocol from Hermes' OpenAI-compatible API. */
import { createHash, randomBytes } from 'node:crypto'
import WebSocket from 'ws'

export type DashboardCredential = { provider: string; refreshToken: string; profile: string }
export type DashboardAccess = { token: string; expiresAt: number }
export type JsonRecord = Record<string, unknown>
type Http = typeof fetch
const callback = 'http://127.0.0.1/botark-dashboard-login'

export function normalizeDashboardUrl(raw: string): string {
  if (typeof raw !== 'string') throw new Error('请输入 Hermes Dashboard 地址')
  const input = raw.trim()
  if (!input || input.length > 2048 || /[\x00-\x20\x7f\\]/.test(input)) throw new Error('Hermes Dashboard 地址无效')
  let url: URL
  try { url = new URL(input.includes('://') ? input : `https://${input}`) }
  catch { throw new Error('Hermes Dashboard 地址无效') }
  if (url.username || url.password || url.search || url.hash ||
      !/^\/[A-Za-z0-9_./~-]*$/.test(url.pathname) || url.pathname.includes('//')) {
    throw new Error('Hermes Dashboard 地址不能包含凭据、查询参数或特殊路径')
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
      ['127.0.0.1', '[::1]'].includes(url.hostname) &&
      /^http:\/\/(127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(input))) {
    throw new Error('账号密码登录需要 HTTPS；仅本机 127.0.0.1 或 [::1] 可用 HTTP')
  }
  return url.origin + url.pathname.replace(/\/+$/, '')
}

function obj(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export class DashboardError extends Error {
  constructor(message: string, readonly status = 0) { super(message); this.name = 'DashboardError' }
}

async function request(base: string, path: string, init: RequestInit, fetcher: Http): Promise<Response> {
  try {
    return await fetcher(base + path, {
      ...init,
      redirect: init.redirect ?? 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new DashboardError('无法连接 Hermes Dashboard；请检查地址、TLS 和网络')
  }
}

async function expectJson(res: Response): Promise<JsonRecord> {
  if (!res.ok) {
    if (res.status === 401) throw new DashboardError('Hermes 验证失败或登录已过期，请重新登录', 401)
    if (res.status === 429) throw new DashboardError('Hermes 登录尝试过多，请稍后重试', 429)
    throw new DashboardError(`Hermes Dashboard 请求失败（HTTP ${res.status}）`, res.status)
  }
  if (!(res.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
    throw new DashboardError('该地址没有返回 Hermes Dashboard API 数据')
  }
  try { return obj(await res.json()) }
  catch { throw new DashboardError('Hermes Dashboard 返回的数据无效') }
}

function jsonPost(data: JsonRecord, extra?: Record<string, string>): RequestInit {
  return { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', ...extra }, body: JSON.stringify(data) }
}

function tokenResult(result: JsonRecord): DashboardAccess & { refreshToken: string } {
  const token = string(result.access_token)
  const refreshToken = string(result.refresh_token)
  const expiresAt = typeof result.expires_at === 'number' ? result.expires_at * 1000 : 0
  if (!token || !refreshToken || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new DashboardError('Hermes Dashboard 未返回可续期的有效会话')
  }
  return { token, refreshToken, expiresAt }
}

export async function loginDashboard(baseUrl: string, username: string, password: string, profile: string,
  fetcher: Http = fetch): Promise<{ credential: DashboardCredential; access: DashboardAccess }> {
  const base = normalizeDashboardUrl(baseUrl)
  if (!username || !password || username.length > 1024 || password.length > 4096) {
    throw new DashboardError('请输入有效的 Hermes 用户名和密码')
  }
  if (profile && !/^[a-zA-Z0-9_-]{1,64}$/.test(profile)) throw new DashboardError('Hermes Profile 名称无效')
  const data = await expectJson(await request(base, '/api/auth/providers', {}, fetcher))
  const providers = (Array.isArray(data.providers) ? data.providers : []).map(obj)
    .filter(p => p.supports_password === true && /^[a-zA-Z0-9_-]{1,128}$/.test(string(p.name)))
  const preferred = providers.find(p => p.name === 'password' || p.name === 'basic')
  const provider = string((preferred ?? (providers.length === 1 ? providers[0] : undefined))?.name)
  if (!provider) throw new DashboardError('该服务器没有唯一可用的 Hermes Dashboard 密码登录方式')
  const verifier = randomBytes(32).toString('base64url')
  const state = randomBytes(32).toString('base64url')
  const authParams = new URLSearchParams({
    provider, code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256', redirect_uri: callback, state,
  })
  // Read the server's flow cookie only. Do not follow the login redirect and
  // never open or navigate to the synthetic loopback return address.
  const start = await request(base, '/auth/native/authorize?' + authParams, { redirect: 'manual' }, fetcher)
  const pkce = start.headers.getSetCookie().map(value => value.split(';', 1)[0])
    .find(value => /^(?:(?:__Host|__Secure)-)?hermes_session_pkce(?:_[A-Za-z0-9_-]+)?=[^\r\n;]+$/.test(value))
  if (start.status !== 302 || !pkce) throw new DashboardError('该 Hermes Dashboard 不支持此客户端的原生密码登录')
  const login = await expectJson(await request(base, '/auth/password-login',
    jsonPost({ provider, username, password }, { cookie: pkce }), fetcher))
  let next: URL
  try { next = new URL(string(login.next)) } catch { throw new DashboardError('Hermes 登录响应无法验证') }
  if (next.origin + next.pathname !== callback || next.username || next.password || next.hash ||
      next.searchParams.getAll('state').length !== 1 || next.searchParams.get('state') !== state ||
      next.searchParams.getAll('code').length !== 1 || !next.searchParams.get('code')) {
    throw new DashboardError('Hermes 登录响应无法验证')
  }
  const { refreshToken, ...access } = tokenResult(await expectJson(await request(base, '/auth/native/token',
    jsonPost({ code: next.searchParams.get('code'), code_verifier: verifier }), fetcher)))
  return { credential: { provider, refreshToken, profile }, access }
}

export async function refreshDashboard(base: string, last: DashboardCredential, fetcher: Http = fetch) {
  const { refreshToken, ...access } = tokenResult(await expectJson(await request(normalizeDashboardUrl(base),
    '/auth/native/refresh', jsonPost({ refresh_token: last.refreshToken, provider: last.provider }), fetcher)))
  return { credential: { ...last, refreshToken }, access }
}

export async function dashboardGet(base: string, token: string, path: string, fetcher: Http = fetch) {
  return expectJson(await request(normalizeDashboardUrl(base), path,
    { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } }, fetcher))
}

export class DashboardSocket {
  private next = 0
  private pending = new Map<number, { reject: (e: Error) => void; resolve: (r: JsonRecord) => void }>()
  private ended = false
  private listeners = new Set<(packet: JsonRecord) => void>()
  private closeListeners = new Set<() => void>()
  private constructor(private ws: WebSocket) {
    ws.on('error', () => this.end())
    ws.on('close', () => this.end())
    ws.on('message', (raw, binary) => {
      if (binary || this.ended) return
      let frame: JsonRecord
      try { frame = obj(JSON.parse(String(raw))) } catch { return }
      if (frame.jsonrpc !== '2.0') return
      if (typeof frame.id === 'number' && this.pending.has(frame.id)) {
        const p = this.pending.get(frame.id)!
        this.pending.delete(frame.id)
        if (frame.error) p.reject(new DashboardError('Hermes Dashboard 操作失败', Number(obj(frame.error).code) || 0))
        else p.resolve(obj(frame.result))
      } else if (typeof frame.method === 'string') {
        for (const listener of this.listeners) listener(frame)
      }
    })
  }
  static async connect(base: string, token: string, fetcher: Http = fetch): Promise<DashboardSocket> {
    const verified = normalizeDashboardUrl(base)
    const grant = await expectJson(await request(verified, '/api/auth/ws-ticket',
      jsonPost({}, { authorization: `Bearer ${token}` }), fetcher))
    const ticket = string(grant.ticket)
    if (!ticket || ticket.length > 4096) throw new DashboardError('Hermes Dashboard 未返回 WebSocket 连接票据')
    const url = new URL(verified + '/api/ws')
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.searchParams.set('ticket', ticket)
    const ws = new WebSocket(url, { followRedirects: false, rejectUnauthorized: true, handshakeTimeout: 15_000, maxPayload: 16 * 1024 * 1024 })
    const connection = new DashboardSocket(ws)
    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve)
      connection.onClose(() => reject(new DashboardError('无法建立 Hermes Dashboard 会话连接')))
    })
    return connection
  }
  onFrame(listener: (packet: JsonRecord) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  onClose(listener: () => void) {
    if (this.ended) listener()
    else this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }
  reply(id: string | number, result?: JsonRecord) {
    if (!this.ended && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id,
        ...(result ? { result } : { error: { code: -32601, message: 'Unsupported client request' } }) }))
    }
  }
  async call(method: string, params: JsonRecord = {}, timeoutMs = 30_000): Promise<JsonRecord> {
    if (this.ended || this.ws.readyState !== WebSocket.OPEN) throw new DashboardError('Hermes Dashboard 会话连接已关闭')
    const id = ++this.next
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new DashboardError('Hermes Dashboard 请求超时'))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: r => { clearTimeout(timer); resolve(r) },
        reject: e => { clearTimeout(timer); reject(e) },
      })
      try { this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params })) }
      catch {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(new DashboardError('Hermes Dashboard 发送失败'))
      }
    })
  }
  close() { this.end(); this.ws.terminate() }
  private end() {
    if (this.ended) return
    this.ended = true
    for (const p of this.pending.values()) p.reject(new DashboardError('Hermes Dashboard 连接中断'))
    this.pending.clear()
    for (const cb of this.closeListeners) cb()
    this.closeListeners.clear()
    this.listeners.clear()
  }
}
