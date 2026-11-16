import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  GROK_CHANNELS,
  type GrokAuthSessionPayload,
  type GrokAuthStatus,
  type GrokOpenLoginRequest,
  type GrokRpcRequest,
  type GrokSetAccessTokenRequest
} from '@shared/ipc'
import { loadAccountProxyUrl } from '../muse/accountProxy'
import { clearGrokMainAuth, getGrokMainAuth, setGrokMainAuth } from './grokAuthStore'
import { cancelGrokLogin, onGrokAuthCaptured, openGrokLoginWindow } from './grokLogin'
import { getOrCreateGrokMachineId } from './grokMachineId'
import { runGrokRpc } from './grokRpc'
import {
  clearAllSandTokens,
  clearSandTokens,
  extractAccountHandleFromJwt,
  listPersistedSandAccountIds,
  loadSandTokens,
  parseAnyGrokCredentialInput,
  persistSandTokens,
  type SandTokens
} from './grokSandAuth'
import { stopGrokAccountWatch } from './grokWatchManager'

function ownerWindow(event: IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

function broadcastAuthEvent(payload: {
  accountId: string
  signedIn: boolean
  accountSlot?: string
  teamId?: string
  machineId?: string
  windowClosed?: boolean
}): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || win.webContents.isDestroyed()) continue
    if (payload.signedIn) {
      // Security: never broadcast raw Bearer accessToken to renderer; all RPCs execute in main.
      win.webContents.send(GROK_CHANNELS.event, {
        type: 'auth',
        accountId: payload.accountId,
        signedIn: true as const,
        accountSlot: payload.accountSlot,
        teamId: payload.teamId,
        machineId: payload.machineId
      })
    } else {
      win.webContents.send(GROK_CHANNELS.event, {
        type: 'auth',
        accountId: payload.accountId,
        signedIn: false as const,
        windowClosed: payload.windowClosed
      })
    }
  }
}

async function hydrateFromDisk(accountId: string): Promise<SandTokens | null> {
  const sand = await loadSandTokens(accountId)
  if (!sand?.accessToken) return null
  if (!getGrokMainAuth(accountId)?.accessToken) {
    const slot =
      extractAccountHandleFromJwt(sand.accessToken) ?? sand.authId ?? sand.selectedTeamId
    setGrokMainAuth({
      accountId,
      accessToken: sand.accessToken,
      accountSlot: slot,
      teamId: sand.selectedTeamId,
      machineId: getOrCreateGrokMachineId(accountId)
    })
  }
  return sand
}

async function statusFor(accountId: string): Promise<GrokAuthStatus> {
  const sand = await hydrateFromDisk(accountId)
  const auth = getGrokMainAuth(accountId)
  const hasProxy = Boolean(await loadAccountProxyUrl(accountId).catch(() => true))
  return {
    accountId,
    signedIn: Boolean(auth?.accessToken),
    accountSlot: auth?.accountSlot,
    teamId: auth?.teamId,
    machineId: auth?.machineId,
    hasRefreshToken: Boolean(sand?.refreshToken),
    authKind: sand?.authKind ?? (auth?.accessToken ? 'web' : undefined),
    hasProxy
  }
}

let registered = false

export function registerGrokIpc(): void {
  if (registered) return
  registered = true

  onGrokAuthCaptured((ev) => {
    if (ev.signedIn) {
      broadcastAuthEvent({
        accountId: ev.accountId,
        signedIn: true,
        accountSlot: ev.accountSlot,
        teamId: ev.teamId,
        machineId: ev.machineId
      })
    } else {
      broadcastAuthEvent({
        accountId: ev.accountId,
        signedIn: false,
        windowClosed: ev.windowClosed
      })
    }
  })

  ipcMain.handle(GROK_CHANNELS.openLogin, async (event, request: unknown) => {
    if (typeof request !== 'object' || request === null) {
      throw new TypeError('Invalid grok openLogin')
    }
    const req = request as GrokOpenLoginRequest
    if (typeof req.accountId !== 'string') throw new TypeError('Invalid accountId')
    await openGrokLoginWindow(req.accountId, ownerWindow(event), {
      openInBrowser: Boolean(req.openInBrowser)
    })
    return { ok: true as const }
  })

  ipcMain.handle(GROK_CHANNELS.cancelLogin, async (_event, accountId: unknown) => {
    if (typeof accountId !== 'string') throw new TypeError('Invalid accountId')
    cancelGrokLogin(accountId)
    return { ok: true as const }
  })

  ipcMain.handle(GROK_CHANNELS.setAccessToken, async (_event, request: unknown) => {
    if (typeof request !== 'object' || request === null) {
      throw new TypeError('Invalid setAccessToken')
    }
    const req = request as GrokSetAccessTokenRequest
    if (
      typeof req.accountId !== 'string' ||
      typeof req.accessToken !== 'string' ||
      !req.accessToken.trim()
    ) {
      throw new TypeError('accountId and accessToken required')
    }
    const machineId = req.machineId?.trim() || getOrCreateGrokMachineId(req.accountId)
    const existing = await loadSandTokens(req.accountId)

    const resolved = await parseAnyGrokCredentialInput(req.accessToken, {
      refreshToken: req.refreshToken,
      accountSlot: req.accountSlot,
      teamId: req.teamId,
      existing,
      accountId: req.accountId
    })
    if (!resolved?.accessToken) {
      throw new Error(
        '无法识别该凭据：请粘贴有效的 Grok/Sand Access Token (eyJ...)、WorkosCursorSessionToken Cookie、JSON 或 API Key'
      )
    }

    cancelGrokLogin(req.accountId)

    const resolvedSlot =
      extractAccountHandleFromJwt(resolved.accessToken) ?? resolved.authId ?? req.accountSlot

    setGrokMainAuth({
      accountId: req.accountId,
      accessToken: resolved.accessToken,
      accountSlot: resolvedSlot,
      teamId: resolved.selectedTeamId ?? req.teamId,
      machineId
    })

    try {
      await persistSandTokens(req.accountId, {
        ...resolved,
        authId: resolvedSlot
      })
    } catch (error) {
      console.warn(
        '[grok] safeStorage persist failed; session is memory-only until restart',
        error
      )
    }

    broadcastAuthEvent({
      accountId: req.accountId,
      signedIn: true,
      accountSlot: resolvedSlot,
      teamId: resolved.selectedTeamId ?? req.teamId,
      machineId
    })

    return statusFor(req.accountId)
  })

  ipcMain.handle(GROK_CHANNELS.clearAuth, async (_event, accountId: unknown) => {
    if (typeof accountId !== 'string') throw new TypeError('Invalid accountId')
    if (accountId === '*') {
      stopGrokAccountWatch('*')
      for (const id of listPersistedSandAccountIds()) {
        cancelGrokLogin(id)
        clearGrokMainAuth(id)
      }
      clearAllSandTokens()
      return { accountId: '*', signedIn: false }
    }
    cancelGrokLogin(accountId)
    stopGrokAccountWatch(accountId)
    clearGrokMainAuth(accountId)
    clearSandTokens(accountId)
    return statusFor(accountId)
  })

  ipcMain.handle(GROK_CHANNELS.authStatus, async (_event, accountId: unknown) => {
    if (typeof accountId !== 'string') throw new TypeError('Invalid accountId')
    return statusFor(accountId)
  })

  ipcMain.handle(
    GROK_CHANNELS.getSession,
    async (_event, accountId: unknown): Promise<GrokAuthSessionPayload> => {
      if (typeof accountId !== 'string') throw new TypeError('Invalid accountId')
      const sand = await hydrateFromDisk(accountId)
      const auth = getGrokMainAuth(accountId)
      if (!auth?.accessToken) {
        return { accountId, signedIn: false as const }
      }
      // Security: omit raw `accessToken` from renderer IPC payload.
      return {
        accountId,
        signedIn: true as const,
        accountSlot: auth.accountSlot,
        teamId: auth.teamId,
        machineId: auth.machineId,
        hasRefreshToken: Boolean(sand?.refreshToken),
        authKind: sand?.authKind ?? 'cursor'
      }
    }
  )

  ipcMain.handle(GROK_CHANNELS.rpc, async (_event, request: unknown) => {
    if (typeof request !== 'object' || request === null) {
      return { ok: false as const, status: 0, message: 'Invalid grok rpc request' }
    }
    const req = request as GrokRpcRequest
    if (typeof req.accountId !== 'string' || typeof req.op !== 'string') {
      return { ok: false as const, status: 0, message: 'accountId and op required' }
    }
    return runGrokRpc(req)
  })
}

export {
  setGrokChecksumCalculator,
  getGrokChecksumCalculator,
  createCursorChecksum
} from './connectClient'
