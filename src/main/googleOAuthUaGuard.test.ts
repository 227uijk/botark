import { describe, expect, it } from 'vitest'
import { cleanChromeUserAgentForGoogle, sanitizeGoogleRequestHeaders } from './googleOAuthUaGuard'

describe('googleOAuthUaGuard', () => {
  it('strips Electron and BotArk tokens from User-Agent and Sec-CH-UA headers', () => {
    const raw =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) BotArk/0.12.0 Chrome/136.0.7103.49 Electron/36.2.1 Safari/537.36'
    expect(cleanChromeUserAgentForGoogle(raw, '136.0.7103.49')).toBe(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.49 Safari/537.36'
    )

    const sanitized = sanitizeGoogleRequestHeaders(
      {
        'User-Agent': raw,
        'sec-ch-ua': '"Not.A/Brand";v="99", "Electron";v="36", "Chromium";v="136"',
        'sec-ch-ua-full-version-list': '"Electron";v="36.2.1", "Chromium";v="136.0.7103.49"'
      },
      '136.0.7103.49'
    )
    expect(sanitized['User-Agent']).not.toContain('Electron')
    expect(sanitized['User-Agent']).not.toContain('BotArk')
    expect(sanitized['sec-ch-ua']).toBe('"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="99"')
    expect(sanitized['sec-ch-ua-full-version-list']).toBe(
      '"Chromium";v="136.0.7103.49", "Google Chrome";v="136.0.7103.49", "Not-A.Brand";v="99.0.0.0"'
    )
  })
})
