/**
 * Pure helpers for Meta Muse login windows, OAuth/SSO popups, and session validation.
 */

const EXACT_OR_SUBDOMAIN_HOSTS = [
  'muse.ai',
  'meta.ai',
  'metaaivm.com',
  'meta.com',
  'facebook.com',
  'fbcdn.net',
  'instagram.com',
  'cdninstagram.com',
  'google.com',
  'googleusercontent.com',
  'gstatic.com',
  'googleapis.com',
  'apple.com',
  'icloud.com'
] as const

function matchesHostSuffix(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

/**
 * Returns true for URLs that Muse's login & SSO flows (native OTP, AYMH redirect cycle,
 * Meta/Facebook/Instagram/Google/Apple OAuth, and `agent.meta.ai/oidc/start` broker)
 * are allowed to navigate to or open in an isolated same-partition child popup.
 */
export function isAllowedMuseUrl(url: string): boolean {
  if (!url || url === 'about:blank') return true
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    return EXACT_OR_SUBDOMAIN_HOSTS.some((domain) => matchesHostSuffix(host, domain))
  } catch {
    return false
  }
}

/**
 * Strip `Electron/<ver>` and app identifiers (`BotArk/...`, `BotHub/...`) so
 * Google OAuth (`disallowed_useragent`) and Meta CAA/OIDC endpoints treat the
 * login window as standard desktop Chrome.
 */
export function cleanMuseChromeUserAgent(rawUa: string): string {
  const cleaned = rawUa
    .replace(/\s+Electron\/[\d.]+/gi, '')
    .replace(/\s+(?:BotArk|BotHub)\/[\d.a-z-]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (/Chrome\/[\d.]+/i.test(cleaned)) return cleaned
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
}

/** True when the login window is currently on a Meta/Muse human-check or CVM checkpoint URL. */
export function isMuseCheckpointUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return /\/checkpoints?(?:\/|$)/i.test(u.pathname) || u.searchParams.get('checkpoint') === '1'
  } catch {
    return /\/checkpoints?(?:\/|$|\?)/i.test(url)
  }
}

/** True when the partition cookie list contains a non-empty `hatch_sess` cookie. */
export function hasNonEmptyHatchSession(cookies: ReadonlyArray<{ name?: string; value?: string }>): boolean {
  return cookies.some((c) => c.name === 'hatch_sess' && typeof c.value === 'string' && c.value.trim().length > 0)
}
