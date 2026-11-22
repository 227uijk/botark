import type { Session } from 'electron'

const guardedSessions = new WeakSet<object>()

export function cleanChromeUserAgentForGoogle(rawUa: string, chromeVersion = process.versions?.chrome): string {
  const cleaned = rawUa
    .replace(/\s+Electron\/[^\s]+/gi, '')
    .replace(/\s+(?:BotArk|BotHub)\/[^\s]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (/Chrome\/[\d.]+/i.test(cleaned)) return cleaned
  const ver = chromeVersion && /^\d+/.test(chromeVersion) ? chromeVersion : '136.0.0.0'
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver} Safari/537.36`
}

export function buildChromeClientHints(chromeVersion = process.versions?.chrome): {
  secChUa: string
  secChUaFullVersionList: string
} {
  const full = chromeVersion && /^\d+(\.\d+)*$/.test(chromeVersion) ? chromeVersion : '136.0.0.0'
  const major = full.split('.')[0] || '136'
  return {
    secChUa: `"Chromium";v="${major}", "Google Chrome";v="${major}", "Not-A.Brand";v="99"`,
    secChUaFullVersionList: `"Chromium";v="${full}", "Google Chrome";v="${full}", "Not-A.Brand";v="99.0.0.0"`
  }
}

export function sanitizeGoogleRequestHeaders(
  requestHeaders: Record<string, string>,
  chromeVersion = process.versions?.chrome
): Record<string, string> {
  const next = { ...requestHeaders }
  const hints = buildChromeClientHints(chromeVersion)

  let sawUaKey = false
  let sawSecChUa = false
  for (const key of Object.keys(next)) {
    const lower = key.toLowerCase()
    if (lower === 'user-agent') {
      next[key] = cleanChromeUserAgentForGoogle(next[key] ?? '', chromeVersion)
      sawUaKey = true
    } else if (lower === 'sec-ch-ua') {
      next[key] = hints.secChUa
      sawSecChUa = true
    } else if (lower === 'sec-ch-ua-full-version-list') {
      next[key] = hints.secChUaFullVersionList
    }
  }
  if (!sawUaKey) {
    next['User-Agent'] = cleanChromeUserAgentForGoogle('', chromeVersion)
  }
  if (!sawSecChUa) {
    next['Sec-CH-UA'] = hints.secChUa
  }
  return next
}

/**
 * Strip `Electron/...` and `"Electron"` Client Hints strictly on Google OAuth hosts
 * (`*.google.com`, `*.youtube.com`) so popup initial navigations never trigger
 * Google's `disallowed_useragent` ("此浏览器或应用可能不安全") block, while leaving
 * non-Google origins (such as Cloudflare Turnstile pages) untouched.
 */
export function installGoogleOAuthHeaderGuard(ses: Session | undefined | null): void {
  if (!ses || typeof ses !== 'object') return
  if (guardedSessions.has(ses)) return
  const webRequest = (ses as Session & { webRequest?: Session['webRequest'] }).webRequest
  if (!webRequest || typeof webRequest.onBeforeSendHeaders !== 'function') return
  guardedSessions.add(ses)

  webRequest.onBeforeSendHeaders(
    {
      urls: ['*://*.google.com/*', '*://google.com/*', '*://*.youtube.com/*']
    },
    (details, callback) => {
      callback({
        requestHeaders: sanitizeGoogleRequestHeaders(details.requestHeaders)
      })
    }
  )
}
