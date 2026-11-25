import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import {
  HERMES_CHANNELS,
  type HermesAuthStatus,
  type HermesConfigureRequest,
  type HermesLocalDetection,
  type HermesRpcRequest,
  type HermesRpcResponse
} from '@shared/ipc'
import { loginDashboard, normalizeDashboardUrl, dashboardGet, DashboardError, DashboardSocket } from './hermesDashboard'
import { checkDashboardDirect, clearDashboardState, dashboardRpc, sendDashboardMessage, setDashboardAccess, verifyDashboardAccount } from './hermesDashboardAccount'
import type { HermesTurnEvent } from '../../adapters/hermes/events'
import { loadAccountProxyUrl } from '../muse/accountProxy'
import {
  cancelAllHermesRuns,
  createHermesSession,
  decideHermesApproval,
  deleteHermesJob,
  deleteHermesSession,
  getHermesCapabilities,
  getHermesHealth,
  getHermesSessionMessages,
  HermesApiError,
  listHermesApprovals,
  listHermesJobs,
  listHermesModels,
  listHermesSessions,
  listHermesSkills,
  listHermesToolsets,
  probeHermesServer,
  runHermesJob,
  sendHermesMessage,
  stopHermesRun,
  toggleHermesJob
} from './hermesClient'
import {
  clearHermesAccount,
  getHermesAccount,
  getHermesAccountMetadata,
  getHermesAccountRevision,
  hermesHandleFromUrl,
  listHermesAccountRecords,
  normalizeHermesBaseUrl,
  readLocalHermesEnv,
  sameHermesOrigin,
  saveHermesAccount,
  updateHermesAccountModel
} from './hermesStore'

function broadcast(payload: HermesTurnEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed() || win.webContents.isDestroyed()) continue
    win.webContents.send(HERMES_CHANNELS.event, payload)
  }
}

async function statusFor(accountId: string, verifyLive = true): Promise<HermesAuthStatus> {
  const hasProxy = Boolean(await loadAccountProxyUrl(accountId).catch(() => false))
  let acc: ReturnType<typeof getHermesAccountMetadata>
  let apiKey: string | undefined
  try {
    if (verifyLive) {
      const resolved = getHermesAccount(accountId)
      acc = resolved
      apiKey = resolved?.apiKey
    } else {
      acc = getHermesAccountMetadata(accountId)
    }
  } catch (error) {
    return {
      accountId,
      signedIn: false,
      hasProxy,
      error: error instanceof Error ? error.message : String(error)
    }
  }
  if (!acc) {
    return { accountId, signedIn: false, hasProxy }
  }
  const handle = hermesHandleFromUrl(acc.baseUrl, acc.model)
  if (!verifyLive) {
    return {
      accountId,
      signedIn: true,
      baseUrl: acc.baseUrl,
      handle,
      displayName: acc.displayName || 'Hermes',
      model: acc.model,
      hasApiKey: acc.hasApiKey,
      authMode: acc.authMode,
      dashboardProfile: acc.dashboardProfile,
      hasProxy
    }
  }
  if (acc.authMode === 'dashboard') {
    const common = { accountId, baseUrl: acc.baseUrl, handle, displayName: acc.displayName || 'Hermes',
      model: acc.model, authMode: acc.authMode, dashboardProfile: acc.dashboardProfile, hasProxy, supportsSessions: true }
    try {
      await verifyDashboardAccount(accountId)
      return { ...common, signedIn: true }
    } catch (error) {
      return { ...common, signedIn: false, error: error instanceof Error ? error.message : 'Hermes Dashboard 登录已失效' }
    }
  }
  const probe = await probeHermesServer({
    accountId,
    baseUrl: acc.baseUrl,
    apiKey
  })
  return {
    accountId,
    signedIn: probe.authenticated,
    baseUrl: acc.baseUrl,
    handle,
    displayName: acc.displayName || 'Hermes',
    model: acc.model || probe.defaultModel,
    version: probe.version,
    hasApiKey: acc.hasApiKey,
    hasProxy,
    supportsSessions: probe.supportsSessions,
    error: probe.error
  }
}

async function runHermesRpc(req: HermesRpcRequest & { requestId?: string }): Promise<HermesRpcResponse> {
  try {
    const dashboard = getHermesAccountMetadata(req.accountId)?.authMode === 'dashboard'
    if (dashboard && req.op !== 'sendMessage' && req.op !== 'setModel') {
      return { ok: true, data: await dashboardRpc(req) }
    }
    switch (req.op) {
      case 'health':
        return { ok: true, data: await getHermesHealth(req.accountId) }
      case 'models':
        return { ok: true, data: await listHermesModels(req.accountId) }
      case 'capabilities':
        return { ok: true, data: await getHermesCapabilities(req.accountId) }
      case 'skills':
        return { ok: true, data: await listHermesSkills(req.accountId) }
      case 'toolsets':
        return { ok: true, data: await listHermesToolsets(req.accountId) }
      case 'listJobs':
        return { ok: true, data: await listHermesJobs(req.accountId) }
      case 'toggleJob':
        return { ok: true, data: await toggleHermesJob(req.accountId, req.jobId, Boolean(req.pause)) }
      case 'runJob':
        return { ok: true, data: await runHermesJob(req.accountId, req.jobId) }
      case 'deleteJob':
        return { ok: true, data: await deleteHermesJob(req.accountId, req.jobId) }
      case 'listSessions':
        return { ok: true, data: await listHermesSessions(req.accountId, req.limit ?? 50) }
      case 'createSession':
        return { ok: true, data: await createHermesSession(req.accountId, { title: req.title, model: req.model }) }
      case 'deleteSession':
        return { ok: true, data: await deleteHermesSession(req.accountId, req.sessionId) }
      case 'getSessionMessages':
        return { ok: true, data: await getHermesSessionMessages(req.accountId, req.sessionId) }
      case 'setModel': {
        const updated = await updateHermesAccountModel(req.accountId, req.model)
        return {
          ok: true,
          data: {
            accountId: updated.accountId,
            model: updated.model,
            handle: hermesHandleFromUrl(updated.baseUrl, updated.model)
          }
        }
      }
      case 'listApprovals':
        return { ok: true, data: listHermesApprovals(req.accountId) }
      case 'decideApproval':
        await decideHermesApproval(req.accountId, req.approvalId, req.decision)
        return { ok: true, data: { ok: true } }
      case 'stopRun': {
        await stopHermesRun(req.accountId, req.requestId)
        return { ok: true, data: { ok: true } }
      }
      case 'sendMessage': {
        const turn = { accountId: req.accountId, requestId: req.requestId }
        const sendArgs: Parameters<typeof sendHermesMessage>[0] = {
          ...turn,
          botId: req.botId,
          sessionId: req.sessionId,
          sessionKey: req.sessionKey,
          text: req.text,
          model: req.model,
          attachments: req.attachments,
          callbacks: {
            onAccepted: (sessionId) => {
              if (req.requestId) broadcast({ type: 'accepted', accountId: req.accountId, requestId: req.requestId, sessionId })
            },
            onDelta: (payload) => {
              broadcast({
                type: 'stream',
                ...turn,
                conversationId: req.botId,
                sessionId: payload.sessionId,
                messageId: payload.messageId,
                text: payload.text,
                done: payload.done,
                ...(payload.tools ? { tools: payload.tools } : {}),
                ...(payload.media ? { media: payload.media } : {})
              })
            },
            onActivity: (act, sessionId) => {
              broadcast({
                type: 'activity',
                ...turn,
                sessionId,
                activityCode: act.code,
                activityText: act.text,
                activityEmoji: act.emoji,
                busy: act.busy
              })
            },
            onApprovals: (pending, sessionId) => {
              broadcast({
                type: 'approvals',
                ...turn,
                sessionId,
                pending
              })
            }
          }
        }
        const result = dashboard ? await sendDashboardMessage(req, sendArgs.callbacks) : await sendHermesMessage(sendArgs)
        return { ok: true, data: result }
      }
      default:
        return { ok: false, status: 400, message: 'Unknown Hermes RPC op' }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, status: 0, code: 'aborted', message: error.message }
    }
    if (error instanceof DashboardError) {
      return { ok: false, status: error.status, message: error.message }
    }
    if (error instanceof HermesApiError) {
      return {
        ok: false,
        status: error.status,
        code: error.code,
        message: error.message,
        body: typeof error.body === 'string' ? error.body : error.body ? JSON.stringify(error.body) : undefined
      }
    }
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

let registered = false

export function registerHermesIpc(mainWindow?: () => BrowserWindow | null): void {
  if (registered) return
  registered = true
  const assertDesktop = (event: IpcMainInvokeEvent) => {
    if (!mainWindow) return // unit tests inject their renderer boundary separately.
    const win = mainWindow()
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) {
      throw new Error('Desktop window required')
    }
  }

  ipcMain.handle(HERMES_CHANNELS.detectLocal, async (_event, customBaseUrl?: unknown): Promise<HermesLocalDetection> => {
    const local = readLocalHermesEnv()
    const targetUrl =
      typeof customBaseUrl === 'string' && customBaseUrl.trim()
        ? (() => {
            try {
              return normalizeHermesBaseUrl(customBaseUrl)
            } catch {
              return local.baseUrl
            }
          })()
        : local.baseUrl
    const matchesLocal = sameHermesOrigin(targetUrl, local.baseUrl)
    const probe = await probeHermesServer({
      baseUrl: targetUrl,
      apiKey: matchesLocal ? local.apiKey : undefined
    })
    return {
      reachable: probe.reachable,
      baseUrl: targetUrl,
      version: probe.version,
      platform: probe.platform,
      hasLocalEnvKey: matchesLocal && local.hasApiKey,
      localEnvHost: local.host,
      localEnvPort: local.port,
      requiresAuth: probe.requiresAuth
    }
  })

  ipcMain.handle(HERMES_CHANNELS.configure, async (_event, request: unknown): Promise<HermesAuthStatus> => {
    if (typeof request !== 'object' || request === null) {
      throw new TypeError('Invalid hermes configure request')
    }
    const req = request as HermesConfigureRequest
    const accountId = typeof req.accountId === 'string' ? req.accountId.trim() : ''
    if (!accountId) throw new TypeError('accountId required')
    const expectedRevision = getHermesAccountRevision(accountId)
    if (req.dashboardLogin !== undefined || getHermesAccountMetadata(accountId)?.authMode === 'dashboard') assertDesktop(_event)
    if (req.dashboardLogin !== undefined) {
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(accountId) || ['__proto__', 'constructor', 'prototype'].includes(accountId)) {
        throw new TypeError('Invalid accountId')
      }
      try {
        const form = req.dashboardLogin
        if (!form || typeof form.username !== 'string' || typeof form.password !== 'string' ||
            (form.profile !== undefined && typeof form.profile !== 'string')) {
          throw new DashboardError('请输入有效的 Hermes 用户名和密码')
        }
        const baseUrl = normalizeDashboardUrl(req.baseUrl)
        await checkDashboardDirect(accountId)
        const profile = form.profile?.trim() ?? ''
        const { credential, access } = await loginDashboard(baseUrl, form.username.trim(), form.password, profile)
        await dashboardGet(baseUrl, access.token, '/api/auth/me')
        const link = await DashboardSocket.connect(baseUrl, access.token)
        try {
          if (profile) {
            const { profiles } = await link.call('profiles.list', { include_sessions: false })
            if (!Array.isArray(profiles) || !profiles.some(p => p && typeof p === 'object' && p.name === profile)) {
              throw new DashboardError('Hermes Dashboard 没有这个 Profile，或当前账号无权访问')
            }
          }
          // Verify a working session endpoint before persisting any token.
          await link.call('session.list', { ...(profile ? { profile } : {}), limit: 1 })
        } finally { link.close() }
        const saved = await saveHermesAccount({ accountId, baseUrl, expectedRevision,
          dashboardAuth: credential, displayName: req.displayName?.trim() || 'Hermes', model: req.model?.trim() })
        cancelAllHermesRuns(accountId)
        clearDashboardState(accountId)
        setDashboardAccess(accountId, access)
        const handle = hermesHandleFromUrl(saved.baseUrl, saved.model)
        const displayName = saved.displayName || 'Hermes'
        broadcast({ type: 'login', accountId, signedIn: true, handle, displayName })
        return { accountId, signedIn: true, handle, displayName, baseUrl, authMode: 'dashboard',
          dashboardProfile: profile, model: saved.model, hasApiKey: false, hasProxy: false, supportsSessions: true }
      } catch (error) {
        return { accountId, signedIn: false, authMode: 'dashboard',
          error: error instanceof DashboardError || error instanceof Error && /^(账号密码登录|Hermes Dashboard 地址|请输入 Hermes|验证期间|系统钥匙串)/.test(error.message)
            ? error.message : 'Hermes Dashboard 登录失败，请检查服务器配置' }
      }
    }
    const baseUrl = normalizeHermesBaseUrl(req.baseUrl)

    const suppliedKey = typeof req.apiKey === 'string' ? req.apiKey.trim() : ''
    let effectiveKey = suppliedKey
    if (!suppliedKey && req.useLocalKey) {
      const local = readLocalHermesEnv()
      if (local.apiKey && sameHermesOrigin(baseUrl, local.baseUrl)) effectiveKey = local.apiKey
    }
    let keepExistingKey = false
    if (!effectiveKey && req.keepExistingKey) {
      const prev = getHermesAccountMetadata(accountId)
      if (prev?.hasApiKey && sameHermesOrigin(baseUrl, prev.baseUrl)) {
        effectiveKey = getHermesAccount(accountId)?.apiKey || ''
        keepExistingKey = Boolean(effectiveKey)
      }
    }

    const probe = await probeHermesServer({
      accountId,
      baseUrl,
      apiKey: effectiveKey || undefined
    })
    if (!probe.reachable || !probe.authenticated) {
      return {
        accountId,
        signedIn: false,
        baseUrl,
        version: probe.version,
        hasApiKey: Boolean(effectiveKey),
        error: probe.error || '无法验证 Hermes API Server 连接'
      }
    }

    const saved = await saveHermesAccount({
      accountId,
      baseUrl,
      expectedRevision,
      apiKey: keepExistingKey ? undefined : effectiveKey || undefined,
      keepExistingKey,
      displayName: req.displayName?.trim() || 'Hermes',
      model: req.model?.trim() || probe.defaultModel
    })

    clearDashboardState(accountId)
    const handle = hermesHandleFromUrl(saved.baseUrl, saved.model)
    broadcast({
      type: 'login',
      accountId,
      signedIn: true,
      handle,
      displayName: saved.displayName || 'Hermes'
    })

    const hasProxy = Boolean(await loadAccountProxyUrl(accountId).catch(() => false))
    return {
      accountId,
      signedIn: true,
      baseUrl: saved.baseUrl,
      handle,
      displayName: saved.displayName || 'Hermes',
      model: saved.model,
      version: probe.version,
      hasApiKey: saved.hasApiKey,
      hasProxy,
      supportsSessions: probe.supportsSessions
    }
  })

  ipcMain.handle(HERMES_CHANNELS.authStatus, async (_event, accountId: unknown): Promise<HermesAuthStatus> => {
    if (typeof accountId !== 'string' || !accountId.trim()) {
      throw new TypeError('Invalid accountId')
    }
    if (getHermesAccountMetadata(accountId.trim())?.authMode === 'dashboard') assertDesktop(_event)
    return statusFor(accountId.trim(), true)
  })

  ipcMain.handle(HERMES_CHANNELS.listAccounts, async (): Promise<HermesAuthStatus[]> => {
    const records = listHermesAccountRecords()
    return Promise.all(records.map((r) => statusFor(r.accountId, false)))
  })

  ipcMain.handle(HERMES_CHANNELS.clearAuth, async (_event, accountId: unknown): Promise<HermesAuthStatus> => {
    if (typeof accountId !== 'string' || !accountId.trim()) {
      throw new TypeError('Invalid accountId')
    }
    const id = accountId.trim()
    if (getHermesAccountMetadata(id)?.authMode === 'dashboard') assertDesktop(_event)
    cancelAllHermesRuns(id)
    await clearHermesAccount(id)
    clearDashboardState(id)
    broadcast({ type: 'login', accountId: id, signedIn: false })
    return { accountId: id, signedIn: false }
  })

  ipcMain.handle(HERMES_CHANNELS.rpc, async (_event, request: unknown): Promise<HermesRpcResponse> => {
    if (typeof request !== 'object' || request === null) {
      return { ok: false, status: 0, message: 'Invalid hermes rpc request' }
    }
    const req = request as HermesRpcRequest & { requestId?: string }
    if (typeof req.accountId !== 'string' || typeof req.op !== 'string') {
      return { ok: false, status: 0, message: 'accountId and op required' }
    }
    if (getHermesAccountMetadata(req.accountId)?.authMode === 'dashboard') assertDesktop(_event)
    return runHermesRpc(req)
  })
}
