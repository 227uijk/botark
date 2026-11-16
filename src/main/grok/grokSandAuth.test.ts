import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', isReady: () => false },
  BrowserWindow: class {},
  safeStorage: {
    isAsyncEncryptionAvailable: async () => true,
    encryptStringAsync: async (s: string) => Buffer.from(s, 'utf8'),
    decryptStringAsync: async (b: Buffer) => ({ result: b.toString('utf8'), shouldReEncrypt: false })
  }
}))

import {
  createSandPollWake,
  extractAccountHandleFromJwt,
  parseAnyGrokCredentialInput,
  parseWorkosCookieOrToken,
  pollSandAuth
} from './grokSandAuth'

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.signature_padding_value_for_valid_length_12345`
}

describe('grokSandAuth universal credential parser & wakeable poll', () => {
  it('extracts email handle from JWT payload', () => {
    const jwt = fakeJwt({ sub: 'auth0|user_123', email: 'alice@example.com', exp: 1999999999 })
    expect(extractAccountHandleFromJwt(jwt)).toBe('alice@example.com')
  })

  it('parses URL-encoded WorkosCursorSessionToken inside a full Cookie header', () => {
    const jwt = fakeJwt({ sub: 'user_01ABC', email: 'grok@x.ai' })
    const cookieHeader = `Cookie: theme=dark; WorkosCursorSessionToken=user_01ABC%3A%3A${jwt}; other=1`
    const parsed = parseWorkosCookieOrToken(cookieHeader)
    expect(parsed).toEqual({
      accessToken: jwt,
      accountSlot: 'grok@x.ai'
    })
  })

  it('parses xAI OAuth JSON and Cursor JSON via parseAnyGrokCredentialInput', async () => {
    const xaiJwt = fakeJwt({ sub: 'xai_u_99', email: 'elon@x.ai', client_id: 'xai_client_1' })
    const res = await parseAnyGrokCredentialInput(
      JSON.stringify({
        xaiAccessToken: xaiJwt,
        xaiRefreshToken: 'xai_rt_secret',
        xaiAccessTokenExpiresAt: 1999999999,
        xaiIssuer: 'https://auth.grok.com'
      })
    )
    expect(res).toMatchObject({
      accessToken: xaiJwt,
      refreshToken: 'xai_rt_secret',
      authId: 'elon@x.ai',
      xaiIssuer: 'https://auth.grok.com',
      authKind: 'xai'
    })
  })

  it('exchanges a Cursor/Grok API key when non-JWT credential is provided', async () => {
    const jwt = fakeJwt({ sub: 'user_api_1', email: 'dev@cursor.com' })
    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({ accessToken: jwt, refreshToken: 'rt_from_key' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })
    const res = await parseAnyGrokCredentialInput('key_live_1234567890', {
      fetchImpl: mockFetch as unknown as typeof fetch
    })
    expect(mockFetch).toHaveBeenCalledOnce()
    expect(res).toMatchObject({
      accessToken: jwt,
      refreshToken: 'rt_from_key',
      authId: 'dev@cursor.com'
    })
  })

  it('wakes pollSandAuth immediately without waiting for backoff timer', async () => {
    const jwt = fakeJwt({ sub: 'user_wake', email: 'fast@grok.com' })
    const wake = createSandPollWake()
    let calls = 0
    const start = Date.now()
    const mockFetch = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        setTimeout(() => wake.wake(), 10)
        return new Response('not ready', { status: 404 })
      }
      return new Response(
        JSON.stringify({ accessToken: jwt, refreshToken: 'rt_wake' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    })

    const tokens = await pollSandAuth('uuid-1', 'verifier-1', {
      fetchImpl: mockFetch as unknown as typeof fetch,
      wake
    })
    expect(tokens.accessToken).toBe(jwt)
    expect(tokens.authId).toBe('fast@grok.com')
    expect(Date.now() - start).toBeLessThan(400)
  })
})
