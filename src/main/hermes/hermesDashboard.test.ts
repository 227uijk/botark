import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { loginDashboard, normalizeDashboardUrl } from './hermesDashboard'

describe('Dashboard password transport', () => {
  it('requires HTTPS and accepts only canonical literal loopback HTTP', () => {
    expect(normalizeDashboardUrl('hermes.example.net:9443/team/')).toBe('https://hermes.example.net:9443/team')
    expect(normalizeDashboardUrl('http://127.0.0.1:9119')).toBe('http://127.0.0.1:9119')
    expect(normalizeDashboardUrl('http://[::1]:9119/')).toBe('http://[::1]:9119')
    for (const url of ['http://example.com', 'http://localhost', 'http://100.100.0.1', 'http://127.1',
      'http://2130706433', 'https://user:secret@example.com', 'https://example.com/?token=q',
      'https://example.com/#token=q', 'file:///etc/passwd', 'https://example.com/%2f']) {
      expect(() => normalizeDashboardUrl(url)).toThrow()
    }
  })

  function fixture(nextState?: string) {
    let challenge = '', state = ''
    const fn = vi.fn<typeof fetch>().mockImplementation(async (raw, init) => {
      const url = new URL(String(raw))
      expect(url.origin).toBe('https://hermes.example')
      expect(init?.redirect).toBe(url.pathname.endsWith('/authorize') ? 'manual' : 'error')
      const data = init?.body ? JSON.parse(String(init.body)) : {}
      switch (url.pathname) {
        case '/mount/api/auth/providers':
          return Response.json({ providers: [{ name: 'basic', supports_password: true }, { name: 'sso', supports_password: false }] })
        case '/mount/auth/native/authorize':
          expect(url.searchParams.get('code_challenge_method')).toBe('S256')
          expect(url.searchParams.get('provider')).toBe('basic')
          expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1/botark-dashboard-login')
          challenge = url.searchParams.get('code_challenge')!
          state = url.searchParams.get('state')!
          return new Response(null, { status: 302, headers: {
            'set-cookie': '__Secure-hermes_session_pkce=fake-broker; Secure; HttpOnly;',
            location: 'https://ignored.example/'
          } })
        case '/mount/auth/password-login':
          expect(data).toEqual({ username: 'test', password: '  test secret  ', provider: 'basic' })
          expect(new Headers(init?.headers).get('cookie')).toBe('__Secure-hermes_session_pkce=fake-broker')
          return Response.json({ ok: true, next: `http://127.0.0.1/botark-dashboard-login?code=temporary&state=${nextState ?? state}` })
        case '/mount/auth/native/token':
          expect(data.code).toBe('temporary')
          expect(createHash('sha256').update(data.code_verifier).digest('base64url')).toBe(challenge)
          expect(new Headers(init?.headers).get('cookie')).toBeNull()
          return Response.json({ access_token: 'test-access', refresh_token: 'test-refresh', expires_at: Date.now() / 1000 + 900 })
        default: throw new Error('Unexpected origin or route')
      }
    })
    return fn
  }

  it('uses PKCE, forwards only the flow cookie and never follows either redirect', async () => {
    const fetcher = fixture()
    const result = await loginDashboard('https://hermes.example/mount', 'test', '  test secret  ', 'math', fetcher)
    expect(result.credential).toEqual({ provider: 'basic', refreshToken: 'test-refresh', profile: 'math' })
    expect(result.access.token).toBe('test-access')
    expect(fetcher).toHaveBeenCalledTimes(4)
    expect(fetcher.mock.calls.filter(([, init]) => String(init?.body).includes('test secret'))).toHaveLength(1)
  })

  it('rejects a mismatched state before redeeming a token', async () => {
    const fetcher = fixture('invalid-callback-state')
    await expect(loginDashboard('https://hermes.example/mount', 'test', '  test secret  ', 'math', fetcher)).rejects.toThrow('无法验证')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('does not transmit secrets if the input address or profile is unsafe', async () => {
    const fetcher = fixture()
    await expect(loginDashboard('http://hermes.example', 'test', '  test secret  ', 'math', fetcher)).rejects.toThrow('HTTPS')
    await expect(loginDashboard('https://hermes.example', 'test', '  test secret  ', '../math', fetcher)).rejects.toThrow('Profile')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
