import { BrowserWindow, session as electronSession, shell } from 'electron'
import { applyProxyToPartition } from '../muse/accountProxy'
import { partitionForAccount } from '../webContentsViewManager'
import { DOT_ORIGIN, getStoredDotAccount, trySyncFromElectronPartition } from './dotClient'

const ALLOWED_DOT_HOST =
  /^(?:[\w-]+\.)*(?:chatgpt\.com|openai\.com|oaistatic\.com|oaiusercontent\.com|auth0\.com|google\.com|googleusercontent\.com|gstatic\.com|apple\.com|icloud\.com|live\.com|microsoftonline\.com|cloudflare\.com)$/i

function dotHostAllowed(url: string): boolean {
  try {
    return ALLOWED_DOT_HOST.test(new URL(url).hostname)
  } catch {
    return false
  }
}

export type DotLoginEvent =
  | {
      accountId: string
      signedIn: true
      handle?: string
      displayName?: string
      planType?: string
      chatgptAccountId?: string
    }
  | {
      accountId: string
      signedIn: false
      windowClosed?: boolean
    }

const loginWindows = new Map<string, BrowserWindow>()
const loginListeners = new Set<(event: DotLoginEvent) => void>()

export function onDotLoginEvent(listener: (event: DotLoginEvent) => void): () => void {
  loginListeners.add(listener)
  return () => loginListeners.delete(listener)
}

function emitLogin(event: DotLoginEvent): void {
  for (const listener of loginListeners) {
    try {
      listener(event)
    } catch (err) {
      console.error('[dot] login listener failed', err)
    }
  }
}

export async function openDotLoginWindow(
  accountId: string,
  parent?: BrowserWindow
): Promise<void> {
  const existing = loginWindows.get(accountId)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    return
  }

  // Enforce per-account proxy BEFORE loading chatgpt.com/dots (fail-closed on unreadable proxy).
  await applyProxyToPartition(accountId)

  const partition = partitionForAccount(accountId)
  const win = new BrowserWindow({
    width: 1020,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    parent: parent && !parent.isDestroyed() ? parent : undefined,
    title: '使用 ChatGPT Dot 登录 (chatgpt.com/dots)',
    backgroundColor: '#f7f7f8',
    autoHideMenuBar: true,
    webPreferences: {
      partition,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })

  loginWindows.set(accountId, win)

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (dotHostAllowed(url)) {
      void win.webContents.loadURL(url)
      return { action: 'deny' }
    }
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    if (!dotHostAllowed(url) && /^https?:\/\//.test(url)) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  let captured = false

  const pollSession = async () => {
    if (captured || win.isDestroyed()) return
    const synced = await trySyncFromElectronPartition(accountId).catch(() => undefined)
    if (synced && synced.accessToken) {
      captured = true
      emitLogin({
        accountId,
        signedIn: true,
        handle: synced.email || synced.chatgptAccountId || accountId,
        displayName: synced.displayName || synced.email?.split('@')[0] || 'Dot',
        planType: synced.planType,
        chatgptAccountId: synced.chatgptAccountId
      })
      if (!win.isDestroyed()) win.close()
    }
  }

  const interval = setInterval(() => {
    void pollSession()
  }, 1800)

  win.webContents.on('did-finish-load', () => void pollSession())
  win.webContents.on('did-navigate', () => void pollSession())
  win.webContents.on('did-redirect-navigation', () => void pollSession())

  win.on('closed', () => {
    clearInterval(interval)
    loginWindows.delete(accountId)
    if (!captured) {
      const existing = getStoredDotAccount(accountId)
      if (existing?.accessToken) {
        emitLogin({
          accountId,
          signedIn: true,
          handle: existing.email || existing.chatgptAccountId || accountId,
          displayName: existing.displayName || existing.email?.split('@')[0] || 'Dot',
          planType: existing.planType,
          chatgptAccountId: existing.chatgptAccountId
        })
      } else {
        emitLogin({
          accountId,
          signedIn: false,
          windowClosed: true
        })
      }
    }
  })

  await win.loadURL(`${DOT_ORIGIN}/dots`)
}

export async function cancelDotLogin(accountId: string): Promise<void> {
  const win = loginWindows.get(accountId)
  loginWindows.delete(accountId)
  if (win && !win.isDestroyed()) {
    win.destroy()
  }
  if (!getStoredDotAccount(accountId)?.accessToken) {
    try {
      const ses = electronSession.fromPartition(partitionForAccount(accountId))
      await ses.clearStorageData()
    } catch {
      /* ignore */
    }
  }
}
