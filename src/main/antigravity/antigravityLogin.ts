/**
 * Interactive Google Antigravity login via BrowserWindow + isolated persist partition.
 *
 * Opens https://antigravity.google.com/ (redirects to Google Sign-In when signed out).
 * Uses a clean desktop Chrome User-Agent so Google OAuth never rejects the window.
 * Success is verified via live `GetUserProfile` RPC (`aicode.clients6.google.com`).
 * Never prints cookie or auth-header values.
 */

import { BrowserWindow, session as electronSession, shell } from 'electron'
import { applyProxyToPartition } from '../muse/accountProxy'
import { partitionForAccount } from '../webContentsViewManager'
import { listAntigravityCookieNames, probeAntigravitySession } from './antigravityClient'
import {
  ANTIGRAVITY_ORIGIN,
  cleanAntigravityChromeUserAgent,
  isAllowedAntigravityUrl
} from './antigravityProtocol'

const loginWindows = new Map<string, BrowserWindow>()

export type AntigravityLoginSuccess = {
  accountId: string
  signedIn: true
  handle: string
  displayName?: string
  planDisplayName?: string
  sessionCookieNames: string[]
}

export type AntigravityLoginEvent =
  | AntigravityLoginSuccess
  | { accountId: string; signedIn: false; windowClosed?: boolean }

export type AntigravityLoginListener = (event: AntigravityLoginEvent) => void

let loginListener: AntigravityLoginListener | undefined

export function onAntigravityLoginEvent(listener: AntigravityLoginListener): () => void {
  loginListener = listener
  return () => {
    if (loginListener === listener) loginListener = undefined
  }
}

function emit(event: AntigravityLoginEvent): void {
  try {
    loginListener?.(event)
  } catch (error) {
    console.error('[antigravity] login listener failed', error)
  }
}

function isAuthTriggerCookie(name: string): boolean {
  return (
    name === 'SAPISID' ||
    name === '__Secure-1PAPISID' ||
    name === '__Secure-3PAPISID' ||
    name === 'SID' ||
    name === '__Secure-1PSID' ||
    name === '__Secure-3PSID'
  )
}

export async function openAntigravityLoginWindow(accountId: string, parent?: BrowserWindow): Promise<void> {
  const existing = loginWindows.get(accountId)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    return
  }

  await applyProxyToPartition(accountId)

  const partition = partitionForAccount(accountId)
  const ses = electronSession.fromPartition(partition)
  const cleanUa = cleanAntigravityChromeUserAgent(ses.getUserAgent())
  ses.setUserAgent(cleanUa)

  // Already signed in on this partition?
  const already = await probeAntigravitySession(accountId)
  if (already.signedIn) {
    const cookieNames = await listAntigravityCookieNames(accountId)
    emit({
      accountId,
      signedIn: true,
      handle: already.profile.email,
      displayName: already.profile.email.split('@')[0] || 'Antigravity',
      planDisplayName: already.profile.planDisplayName,
      sessionCookieNames: cookieNames
    })
    return
  }

  const win = new BrowserWindow({
    width: 1080,
    height: 780,
    minWidth: 720,
    minHeight: 560,
    title: '使用 Google Antigravity 登录',
    backgroundColor: '#1f1f1f',
    autoHideMenuBar: true,
    parent: parent && !parent.isDestroyed() ? parent : undefined,
    webPreferences: {
      partition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })
  win.webContents.setUserAgent(cleanUa)
  loginWindows.set(accountId, win)

  const childPopups = new Set<BrowserWindow>()
  const closeChildPopups = () => {
    for (const child of childPopups) {
      try {
        if (!child.isDestroyed()) child.close()
      } catch {
        /* ignore */
      }
    }
    childPopups.clear()
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAntigravityUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 540,
          height: 700,
          title: 'Google 登录',
          autoHideMenuBar: true,
          parent: win.isDestroyed() ? undefined : win,
          webPreferences: {
            partition,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false
          }
        }
      }
    }
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAntigravityUrl(url) && /^https?:\/\//.test(url)) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  let settling = false
  let checking = false

  const finishIfSignedIn = async (): Promise<void> => {
    if (settling || checking || win.isDestroyed()) return
    checking = true
    try {
      const probe = await probeAntigravitySession(accountId)
      if (!probe.signedIn || settling || win.isDestroyed()) return
      settling = true
      const cookieNames = await listAntigravityCookieNames(accountId)
      emit({
        accountId,
        signedIn: true,
        handle: probe.profile.email,
        displayName: probe.profile.email.split('@')[0] || 'Antigravity',
        planDisplayName: probe.profile.planDisplayName,
        sessionCookieNames: cookieNames
      })
      closeChildPopups()
      try {
        if (!win.isDestroyed()) win.close()
      } catch {
        /* ignore */
      }
    } finally {
      checking = false
    }
  }

  const onNav = () => {
    void finishIfSignedIn()
  }
  win.webContents.on('did-finish-load', onNav)
  win.webContents.on('did-navigate', onNav)
  win.webContents.on('did-redirect-navigation', onNav)

  win.webContents.on('did-create-window', (childWin) => {
    childPopups.add(childWin)
    childWin.webContents.setUserAgent(cleanUa)
    childWin.webContents.on('did-finish-load', onNav)
    childWin.webContents.on('did-navigate', onNav)
    childWin.on('closed', () => {
      childPopups.delete(childWin)
      void finishIfSignedIn()
    })
  })

  const onCookie = (
    _event: unknown,
    cookie: { name: string },
    _cause: string,
    removed: boolean
  ) => {
    if (!removed && isAuthTriggerCookie(cookie.name)) {
      void finishIfSignedIn()
    }
  }
  ses.cookies.on('changed', onCookie)

  const poll = setInterval(() => {
    if (win.isDestroyed() || settling) {
      clearInterval(poll)
      return
    }
    void finishIfSignedIn()
  }, 1500)

  win.on('closed', () => {
    clearInterval(poll)
    ses.cookies.off('changed', onCookie)
    closeChildPopups()
    const wasTracked = loginWindows.get(accountId) === win
    if (wasTracked) loginWindows.delete(accountId)
    if (!wasTracked || settling) return
    void (async () => {
      const probe = await probeAntigravitySession(accountId)
      if (probe.signedIn) {
        const cookieNames = await listAntigravityCookieNames(accountId)
        emit({
          accountId,
          signedIn: true,
          handle: probe.profile.email,
          displayName: probe.profile.email.split('@')[0] || 'Antigravity',
          planDisplayName: probe.profile.planDisplayName,
          sessionCookieNames: cookieNames
        })
        return
      }
      emit({ accountId, signedIn: false, windowClosed: true })
    })()
  })

  try {
    await win.loadURL(ANTIGRAVITY_ORIGIN)
  } catch (error) {
    const code = (error as { errno?: number })?.errno
    if (code !== -3) {
      console.error('[antigravity] openLogin load failed', error)
    }
  }
}

export function closeAntigravityLoginWindow(accountId: string): void {
  const win = loginWindows.get(accountId)
  loginWindows.delete(accountId)
  if (win && !win.isDestroyed()) win.destroy()
}
