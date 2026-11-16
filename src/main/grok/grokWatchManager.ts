/**
 * Account-level persistent `WatchGrokBotTranscripts` multiplex manager for Grok Bot 0.79.3,
 * plus presigned attachment read cache (`ResolveGrokBotAttachmentReads`).
 *
 * Consumes all 12 server-streaming frame types from `WatchGrokBotTranscriptsResponse`:
 * - `rows` (entries + deletes + replay + multi-bubble assistant streaming)
 * - `agent_state` (`is_running`, `is_composing_message`, `activity`, `awaiting`, `has_running_subagents`)
 * - `turn_failed` (usage limits, rate limits, policy blocks, harness failures)
 * - `roster_changed` (real-time agent creation/edits/deletes/group changes)
 * - `box_state` (SandBox VM run state transitions)
 * - `page_title_changed` (AgentStore / Canvas document live updates)
 * - `cleared` (conversation reset / generation bump)
 * - `cursor_too_old` (automatic gap backfill via `ListGrokBotTranscriptEntries`)
 * - `absolute_lifetime_ms` (proactive reconnect before stream deadline)
 * - `ping` / `computer_actions` / `access_denied`
 */

import type { GrokMainEvent, MuseMediaPartView, MuseToolCallView } from '@shared/ipc'
import type { GrokConnectClient } from './connectClient'
import {
  parseGrokTranscriptEntry,
  type GrokPendingApprovalItem,
  type ParsedGrokTranscriptEntry
} from './grokTranscriptDecoder'

interface AgentCursorState {
  agentId: string
  generation: number
  afterUpdatedSeq: string
  sessionId: string
  /** Set when `cursor_too_old` fires so missed assistant messages in the gap are emitted during backfill. */
  backfillMinSeq?: string
}

interface PresignedCacheEntry {
  url: string
  expiresAtMs: number
  contentType?: string
}

export interface GrokAccountWatchHandle {
  accountId: string
  stop: () => void
  rebindNetwork: () => void
  updateTargets: (
    agentIds: string[],
    conversationMap?: Record<string, string | string[]>
  ) => void
  listApprovals: (agentId?: string) => GrokPendingApprovalItem[]
  removeApproval: (idOrPrefix: string) => void
  resolveMediaUrls: (
    client: GrokConnectClient,
    agentId: string,
    sessionId: string,
    media: MuseMediaPartView[] | undefined
  ) => Promise<MuseMediaPartView[] | undefined>
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function maxSeqStr(a: string, b: string): string {
  try {
    const ba = BigInt(a || '0')
    const bb = BigInt(b || '0')
    return ba >= bb ? ba.toString() : bb.toString()
  } catch {
    return b || a || '0'
  }
}

function seqGreaterThan(a: string, b: string): boolean {
  try {
    return BigInt(a || '0') > BigInt(b || '0')
  } catch {
    return a !== b && Boolean(a)
  }
}

const ACTIVITY_LABELS: Record<string, { text: string; emoji: string }> = {
  '1': { text: '正在执行命令…', emoji: '⚡' },
  GROK_BOT_AGENT_ACTIVITY_CODE_RUNNING_COMMAND: { text: '正在执行命令…', emoji: '⚡' },
  '2': { text: '正在编辑文件…', emoji: '✏️' },
  GROK_BOT_AGENT_ACTIVITY_CODE_EDITING_FILE: { text: '正在编辑文件…', emoji: '✏️' },
  '3': { text: '正在读取文件…', emoji: '📄' },
  GROK_BOT_AGENT_ACTIVITY_CODE_READING_FILES: { text: '正在读取文件…', emoji: '📄' },
  '4': { text: '正在搜索工作区…', emoji: '🔍' },
  GROK_BOT_AGENT_ACTIVITY_CODE_SEARCHING: { text: '正在搜索工作区…', emoji: '🔍' },
  '5': { text: '正在操作云端电脑…', emoji: '🖥️' },
  GROK_BOT_AGENT_ACTIVITY_CODE_USING_COMPUTER: { text: '正在操作云端电脑…', emoji: '🖥️' },
  '6': { text: '正在浏览网页…', emoji: '🌐' },
  GROK_BOT_AGENT_ACTIVITY_CODE_BROWSING_WEB: { text: '正在浏览网页…', emoji: '🌐' },
  '7': { text: '正在委派子代理…', emoji: '🤖' },
  GROK_BOT_AGENT_ACTIVITY_CODE_DELEGATING_TO_AGENT: { text: '正在委派子代理…', emoji: '🤖' },
  '8': { text: '正在检索记忆与历史…', emoji: '🧠' },
  GROK_BOT_AGENT_ACTIVITY_CODE_RECALLING: { text: '正在检索记忆与历史…', emoji: '🧠' },
  '9': { text: '正在调用外部工具…', emoji: '🔌' },
  GROK_BOT_AGENT_ACTIVITY_CODE_CALLING_SERVICE: { text: '正在调用外部工具…', emoji: '🔌' },
  '10': { text: '正在准备交互卡片…', emoji: '🗂️' },
  GROK_BOT_AGENT_ACTIVITY_CODE_PREPARING_PROMPT: { text: '正在准备交互卡片…', emoji: '🗂️' },
  '11': { text: '正在思考…', emoji: '💭' },
  GROK_BOT_AGENT_ACTIVITY_CODE_WORKING: { text: '正在思考…', emoji: '💭' },
  '12': { text: '正在启动云端沙盒…', emoji: '🚀' },
  GROK_BOT_AGENT_ACTIVITY_CODE_STARTING_UP: { text: '正在启动云端沙盒…', emoji: '🚀' },
  '13': { text: '正在联网搜索…', emoji: '🔎' },
  GROK_BOT_AGENT_ACTIVITY_CODE_SEARCHING_WEB: { text: '正在联网搜索…', emoji: '🔎' }
}

const watches = new Map<string, AccountWatchController>()

class AccountWatchController implements GrokAccountWatchHandle {
  readonly accountId: string
  private readonly createClient: () => Promise<GrokConnectClient>
  private readonly emit: (event: GrokMainEvent) => void
  private readonly cursors = new Map<string, AgentCursorState>()
  private readonly conversationsByAgent = new Map<string, string[]>()
  private readonly approvals = new Map<string, GrokPendingApprovalItem>()
  private readonly presignedReads = new Map<string, PresignedCacheEntry>()
  private readonly recentToolsByAgent = new Map<string, Map<string, MuseToolCallView>>()

  private stopped = false
  private currentAbort: AbortController | null = null
  private loopPromise: Promise<void> | null = null
  private restartRequested = false

  constructor(opts: {
    accountId: string
    createClient: () => Promise<GrokConnectClient>
    emit: (event: GrokMainEvent) => void
  }) {
    this.accountId = opts.accountId
    this.createClient = opts.createClient
    this.emit = opts.emit
  }

  private emitAssistantEntry(
    agentId: string,
    sessionId: string,
    parsed: ParsedGrokTranscriptEntry,
    resolvedMedia: MuseMediaPartView[] | undefined,
    toolsArr: MuseToolCallView[] | undefined
  ): void {
    const convIds = this.conversationsByAgent.get(agentId)
    const targets = convIds && convIds.length > 0 ? convIds : [undefined]
    for (const conversationId of targets) {
      this.emit({
        type: 'stream',
        accountId: this.accountId,
        conversationId,
        agentId,
        sessionId: sessionId || undefined,
        messageId: `grok_${parsed.entryId}`,
        text: parsed.text,
        done: !parsed.isStreaming,
        ...(parsed.widgets?.length ? { widgets: parsed.widgets } : {}),
        ...(parsed.richWidgets?.length ? { richWidgets: parsed.richWidgets } : {}),
        ...(toolsArr ? { tools: toolsArr } : {}),
        ...(resolvedMedia?.length ? { media: resolvedMedia } : {})
      })
    }
  }

  private async hydrateOmittedEntry(
    client: GrokConnectClient,
    agentId: string,
    sessionId: string,
    stub: ParsedGrokTranscriptEntry
  ): Promise<ParsedGrokTranscriptEntry> {
    try {
      let beforeSeq: string | undefined
      try {
        const s = BigInt(stub.seq || '0')
        if (s > 0n) beforeSeq = (s + 1n).toString()
      } catch {
        beforeSeq = undefined
      }
      const page = (await client.listTranscriptEntries({
        agentId,
        sessionId: sessionId || undefined,
        beforeSeq,
        limit: 5
      })) as Record<string, unknown>
      const entries = Array.isArray(page['entries'])
        ? (page['entries'] as Array<Record<string, unknown>>)
        : []
      const match = entries.find((raw) => {
        const eid = str(raw['entry_id'] ?? raw['entryId'])
        const seq = str(raw['seq'])
        return (eid && eid === stub.entryId) || (seq && seq === stub.seq)
      })
      if (match && !(match['body_omitted'] ?? match['bodyOmitted'])) {
        const hydrated = parseGrokTranscriptEntry(match, agentId, sessionId)
        if (hydrated) return hydrated
      }
    } catch {
      /* fallback to stub if hydration RPC fails */
    }
    return stub
  }

  rebindNetwork(): void {
    this.presignedReads.clear()
    if (!this.stopped) {
      this.triggerReconnect()
    }
  }

  updateTargets(
    agentIds: string[],
    conversationMap?: Record<string, string | string[]>
  ): void {
    if (conversationMap) {
      this.conversationsByAgent.clear()
      for (const [agentId, conv] of Object.entries(conversationMap)) {
        if (!agentId) continue
        const list = (Array.isArray(conv) ? conv : [conv]).filter(Boolean)
        if (list.length > 0) {
          this.conversationsByAgent.set(agentId, [...new Set(list)])
        }
      }
    }
    let addedNew = false
    for (const id of agentIds) {
      if (!id) continue
      if (!this.cursors.has(id)) {
        this.cursors.set(id, {
          agentId: id,
          generation: 0,
          afterUpdatedSeq: '0',
          sessionId: ''
        })
        addedNew = true
      }
    }
    if (!this.stopped && (!this.loopPromise || addedNew)) {
      this.triggerReconnect()
    }
  }

  listApprovals(agentId?: string): GrokPendingApprovalItem[] {
    const all = [...this.approvals.values()]
    return agentId ? all.filter((a) => a.agentId === agentId) : all
  }

  removeApproval(idOrPrefix: string): void {
    let changed = false
    for (const [k, v] of this.approvals.entries()) {
      if (
        k === idOrPrefix ||
        v.id === idOrPrefix ||
        v.requestId === idOrPrefix ||
        v.id.startsWith(`${idOrPrefix}:`)
      ) {
        this.approvals.delete(k)
        changed = true
      }
    }
    if (changed) {
      this.broadcastApprovals()
    }
  }

  private broadcastApprovals(agentId?: string): void {
    this.emit({
      type: 'approvals',
      accountId: this.accountId,
      agentId,
      pending: this.listApprovals()
    })
  }

  async resolveMediaUrls(
    client: GrokConnectClient,
    agentId: string,
    sessionId: string,
    media: MuseMediaPartView[] | undefined
  ): Promise<MuseMediaPartView[] | undefined> {
    if (!media || media.length === 0) return media
    const now = Date.now()
    const toResolve: string[] = []
    for (const part of media) {
      if (!part.path || /^https?:\/\/|^data:/i.test(part.path)) continue
      const cached = this.presignedReads.get(`${agentId}:${part.path}`)
      if (!cached || cached.expiresAtMs - now < 30_000) {
        toResolve.push(part.path)
      }
    }

    if (toResolve.length > 0) {
      try {
        const res = await client.resolveAttachmentReads({
          agentId,
          sessionId: sessionId || undefined,
          paths: [...new Set(toResolve)]
        })
        const reads = Array.isArray(res['reads']) ? (res['reads'] as unknown[]) : []
        for (const r of reads) {
          const ro = asObj(r)
          if (!ro) continue
          const p = str(ro['path'])
          const url = str(ro['url'])
          const exp = Number(ro['expiresAtMs'] ?? ro['expires_at_ms'] ?? now + 15 * 60_000)
          const ct = str(ro['contentType'] ?? ro['content_type']) || undefined
          if (p && url) {
            this.presignedReads.set(`${agentId}:${p}`, {
              url,
              expiresAtMs: exp > 0 ? exp : now + 15 * 60_000,
              contentType: ct
            })
          }
        }
      } catch {
        /* keep raw paths if presign fails */
      }
    }

    return media.map((part) => {
      if (!part.path || /^https?:\/\/|^data:/i.test(part.path)) return part
      const cached = this.presignedReads.get(`${agentId}:${part.path}`)
      if (!cached) return part
      const mime = part.mimeType || cached.contentType
      return {
        ...part,
        path: cached.url,
        mimeType: mime,
        kind: mime?.startsWith('image/') ? 'image' : part.kind
      }
    })
  }

  private triggerReconnect(): void {
    this.restartRequested = true
    if (this.currentAbort) {
      this.currentAbort.abort()
    }
    if (!this.loopPromise && !this.stopped) {
      this.loopPromise = this.runLoop().finally(() => {
        this.loopPromise = null
      })
    }
  }

  stop(): void {
    this.stopped = true
    if (this.currentAbort) {
      this.currentAbort.abort()
      this.currentAbort = null
    }
  }

  private async seedInitialWatermarks(client: GrokConnectClient): Promise<void> {
    const unseeded = [...this.cursors.values()].filter((c) => c.afterUpdatedSeq === '0')
    if (unseeded.length === 0) return
    await Promise.all(
      unseeded.slice(0, 8).map(async (cursor) => {
        try {
          const page = (await client.listTranscriptEntries({
            agentId: cursor.agentId,
            sessionId: cursor.sessionId,
            limit: cursor.backfillMinSeq !== undefined ? 40 : 20
          })) as Record<string, unknown>
          const gen = Number(page['generation'] ?? 0)
          if (Number.isFinite(gen) && gen >= 0) cursor.generation = gen
          const entries = Array.isArray(page['entries'])
            ? (page['entries'] as Array<Record<string, unknown>>)
            : []
          // Sort chronologically so backfilled gap messages arrive in natural order
          const ordered = [...entries].sort((a, b) => {
            try {
              const sa = BigInt(str(a['seq'] || '0'))
              const sb = BigInt(str(b['seq'] || '0'))
              return sa < sb ? -1 : sa > sb ? 1 : 0
            } catch {
              return 0
            }
          })
          const minSeq = cursor.backfillMinSeq
          cursor.backfillMinSeq = undefined
          for (const raw of ordered) {
            let parsed = parseGrokTranscriptEntry(raw, cursor.agentId, cursor.sessionId)
            if (!parsed) continue
            if (parsed.bodyOmitted) {
              parsed = await this.hydrateOmittedEntry(
                client,
                cursor.agentId,
                cursor.sessionId,
                parsed
              )
            }
            const prevMax = cursor.afterUpdatedSeq
            cursor.afterUpdatedSeq = maxSeqStr(prevMax, parsed.updatedSeq)
            if (parsed.settledApprovalKey) {
              this.removeApproval(parsed.settledApprovalKey)
            } else if (parsed.approval) {
              this.approvals.set(parsed.approval.id, parsed.approval)
            }
            if (
              minSeq !== undefined &&
              parsed.role === 'assistant' &&
              seqGreaterThan(parsed.updatedSeq, minSeq)
            ) {
              const resolvedMedia = await this.resolveMediaUrls(
                client,
                cursor.agentId,
                cursor.sessionId,
                parsed.media
              )
              const hasPayload =
                Boolean(parsed.text) ||
                Boolean(parsed.widgets?.length) ||
                Boolean(parsed.richWidgets?.length) ||
                Boolean(resolvedMedia?.length)
              if (hasPayload) {
                this.emitAssistantEntry(
                  cursor.agentId,
                  cursor.sessionId,
                  parsed,
                  resolvedMedia,
                  undefined
                )
              }
            }
          }
        } catch {
          /* ignore per-agent seed failure */
        }
      })
    )
    if (this.approvals.size > 0) {
      this.broadcastApprovals()
    }
  }

  private async runLoop(): Promise<void> {
    let consecutiveFailures = 0
    while (!this.stopped) {
      this.restartRequested = false
      const ac = new AbortController()
      this.currentAbort = ac
      let lifetimeTimer: ReturnType<typeof setTimeout> | undefined

      try {
        const client = await this.createClient()
        await this.seedInitialWatermarks(client)

        const cursors = [...this.cursors.values()].map((c) => ({
          agent_id: c.agentId,
          generation: c.generation,
          after_updated_seq: c.afterUpdatedSeq || '0',
          session_id: c.sessionId || ''
        }))

        for await (const frame of client.watchTranscripts(
          {
            cursors,
            includeUnlistedAgents: true,
            inlineBodyMaxBytes: 262_144
          },
          ac.signal
        )) {
          consecutiveFailures = 0

          // 1. Lifetime header frame (`absolute_lifetime_ms` / `absoluteLifetimeMs`)
          const lifetimeMs = Number(
            frame['absolute_lifetime_ms'] ?? frame['absoluteLifetimeMs'] ?? 0
          )
          if (lifetimeMs > 5_000 && !lifetimeTimer) {
            lifetimeTimer = setTimeout(
              () => {
                this.restartRequested = true
                ac.abort()
              },
              Math.max(5_000, lifetimeMs - 3_000)
            )
          }

          await this.handleFrame(client, frame)
        }
      } catch {
        if (this.stopped) break
        if (!this.restartRequested) {
          consecutiveFailures++
          const backoffMs = Math.min(20_000, Math.round(1_200 * Math.pow(1.7, consecutiveFailures - 1)))
          await new Promise((r) => setTimeout(r, backoffMs))
        }
      } finally {
        if (lifetimeTimer) clearTimeout(lifetimeTimer)
        if (this.currentAbort === ac) this.currentAbort = null
      }
    }
  }

  private async handleFrame(
    client: GrokConnectClient,
    frame: Record<string, unknown>
  ): Promise<void> {
    // 2. `rows` (`GrokBotTranscriptRows`)
    const rows = asObj(frame['rows'] ?? frame['Rows'])
    if (rows) {
      const agentId = str(rows['agentId'] ?? rows['agent_id'])
      const sessionId = str(rows['sessionId'] ?? rows['session_id'])
      const isReplay = rows['replay'] === true
      const generation = Number(rows['generation'] ?? 0)
      if (agentId) {
        const cur = this.cursors.get(agentId) ?? {
          agentId,
          generation,
          afterUpdatedSeq: '0',
          sessionId
        }
        cur.generation = generation
        this.cursors.set(agentId, cur)
      }

      const deletes = Array.isArray(rows['deletes'])
        ? (rows['deletes'] as Array<Record<string, unknown>>)
        : []
      if (deletes.length > 0) {
        const deletedMessageIds: string[] = []
        for (const d of deletes) {
          const delObj = asObj(d)
          if (!delObj) continue
          const updSeq = str(delObj['updatedSeq'] ?? delObj['updated_seq'] ?? delObj['seq'] ?? '0')
          const cur = this.cursors.get(agentId)
          if (cur) {
            cur.afterUpdatedSeq = maxSeqStr(cur.afterUpdatedSeq, updSeq)
          }
          const entryId = str(delObj['entryId'] ?? delObj['entry_id'] ?? delObj['seq'])
          if (entryId) {
            deletedMessageIds.push(`grok_${entryId}`)
            this.removeApproval(entryId)
          }
        }
        if (deletedMessageIds.length > 0) {
          this.emit({
            type: 'message_deleted',
            accountId: this.accountId,
            agentId,
            sessionId: sessionId || undefined,
            messageIds: deletedMessageIds
          })
        }
      }

      const entries = Array.isArray(rows['entries'])
        ? (rows['entries'] as Array<Record<string, unknown>>)
        : []

      let toolMap = this.recentToolsByAgent.get(agentId)
      if (!toolMap) {
        toolMap = new Map()
        this.recentToolsByAgent.set(agentId, toolMap)
      }

      for (const raw of entries) {
        let parsed = parseGrokTranscriptEntry(raw, agentId, sessionId)
        if (!parsed) continue

        if (parsed.bodyOmitted) {
          parsed = await this.hydrateOmittedEntry(client, agentId, sessionId, parsed)
        }

        const cur = this.cursors.get(agentId)
        if (cur) {
          cur.afterUpdatedSeq = maxSeqStr(cur.afterUpdatedSeq, parsed.updatedSeq)
        }

        if (parsed.settledApprovalKey) {
          this.removeApproval(parsed.settledApprovalKey)
        }
        if (parsed.approval) {
          this.approvals.set(parsed.approval.id, parsed.approval)
          this.broadcastApprovals(agentId)
        }

        if (parsed.role === 'tool' && parsed.toolCall) {
          toolMap.set(parsed.toolCall.id, parsed.toolCall)
          if (toolMap.size > 12) {
            const oldest = toolMap.keys().next().value
            if (oldest) toolMap.delete(oldest)
          }
          continue
        }

        // Skip replaying already-hydrated messages unless streaming
        if (isReplay && !parsed.isStreaming) continue

        if (parsed.role === 'assistant') {
          const resolvedMedia = await this.resolveMediaUrls(
            client,
            agentId,
            sessionId,
            parsed.media
          )
          const hasPayload =
            Boolean(parsed.text) ||
            Boolean(parsed.widgets?.length) ||
            Boolean(parsed.richWidgets?.length) ||
            Boolean(resolvedMedia?.length)
          if (!hasPayload) continue

          const toolsArr = toolMap.size > 0 ? [...toolMap.values()] : undefined
          this.emitAssistantEntry(agentId, sessionId, parsed, resolvedMedia, toolsArr)
          if (!parsed.isStreaming) {
            toolMap.clear()
          }
        }
      }
      return
    }

    // 3. `agent_state` (`GrokBotAgentLiveState`)
    const agentState = asObj(frame['agent_state'] ?? frame['agentState'])
    if (agentState) {
      const agentId = str(agentState['agentId'] ?? agentState['agent_id'])
      const sessionId = str(agentState['sessionId'] ?? agentState['session_id']) || undefined
      const isRunning = Boolean(agentState['isRunning'] ?? agentState['is_running'])
      const isComposing = Boolean(
        agentState['isComposingMessage'] ?? agentState['is_composing_message']
      )
      const hasSubagents = Boolean(
        agentState['hasRunningSubagents'] ?? agentState['has_running_subagents']
      )
      const actObj = asObj(agentState['activity'])
      const code = str(actObj?.['code'] ?? (isRunning ? '11' : '0'))
      const mapped = ACTIVITY_LABELS[code]
      this.emit({
        type: 'activity',
        accountId: this.accountId,
        agentId,
        sessionId,
        busy: isRunning || isComposing,
        isComposing,
        hasRunningSubagents: hasSubagents,
        activityCode: code,
        activityText: mapped?.text ?? (isComposing ? '正在输入回复…' : isRunning ? '正在运行…' : undefined),
        activityEmoji: mapped?.emoji
      })
      return
    }

    // 4. `turn_failed` (`GrokBotTurnFailed`)
    const turnFailed = asObj(frame['turn_failed'] ?? frame['turnFailed'])
    if (turnFailed) {
      const agentId = str(turnFailed['agentId'] ?? turnFailed['agent_id'])
      const sessionId = str(turnFailed['sessionId'] ?? turnFailed['session_id']) || undefined
      const turnId = str(turnFailed['turnId'] ?? turnFailed['turn_id']) || undefined
      const code = str(turnFailed['code'] ?? 'FAILED')
      const summary = str(turnFailed['summary'] ?? 'Grok Bot 执行该轮对话失败')
      this.emit({
        type: 'turn_failed',
        accountId: this.accountId,
        agentId,
        sessionId,
        turnId,
        code,
        summary
      })
      return
    }

    // 5. `roster_changed` (`GrokBotRosterChanged`)
    const rosterChanged = asObj(frame['roster_changed'] ?? frame['rosterChanged'])
    if (rosterChanged) {
      const kind = str(rosterChanged['kind'] ?? 'UPDATED')
      const agentId = str(rosterChanged['agentId'] ?? rosterChanged['agent_id'])
      const agent = asObj(rosterChanged['agent']) ?? undefined
      if (agentId && !this.cursors.has(agentId) && !kind.includes('DELETED')) {
        this.cursors.set(agentId, {
          agentId,
          generation: 0,
          afterUpdatedSeq: '0',
          sessionId: ''
        })
      }
      this.emit({
        type: 'roster_changed',
        accountId: this.accountId,
        kind,
        agentId,
        agent
      })
      return
    }

    // 6. `box_state` (`SandBoxStateChanged`)
    const boxState = asObj(frame['box_state'] ?? frame['boxState'])
    if (boxState) {
      this.emit({
        type: 'box_state',
        accountId: this.accountId,
        state: boxState
      })
      return
    }

    // 7. `page_title_changed` (`GrokBotPageTitleChanged`)
    const pageChanged = asObj(frame['page_title_changed'] ?? frame['pageTitleChanged'])
    if (pageChanged) {
      this.emit({
        type: 'page_changed',
        accountId: this.accountId,
        storeId: str(pageChanged['storeId'] ?? pageChanged['store_id']),
        canvasId: str(pageChanged['canvasId'] ?? pageChanged['canvas_id']) || undefined,
        documentId: str(pageChanged['documentId'] ?? pageChanged['document_id']),
        title: str(pageChanged['title']),
        contentChanged: Boolean(pageChanged['contentChanged'] ?? pageChanged['content_changed'])
      })
      return
    }

    // 8. `cleared` (`GrokBotTranscriptCleared`) -> bump generation and reset seq
    const cleared = asObj(frame['cleared'])
    if (cleared) {
      const agentId = str(cleared['agentId'] ?? cleared['agent_id'])
      const newGen = Number(cleared['newGeneration'] ?? cleared['new_generation'] ?? 0)
      const cur = this.cursors.get(agentId)
      if (cur) {
        cur.generation = newGen
        cur.afterUpdatedSeq = '0'
      }
      return
    }

    // 9. `cursor_too_old` (`GrokBotTranscriptCursorTooOld`) -> backfill missed gap and reconnect
    const tooOld = asObj(frame['cursor_too_old'] ?? frame['cursorTooOld'])
    if (tooOld) {
      const agentId = str(tooOld['agentId'] ?? tooOld['agent_id'])
      const cur = this.cursors.get(agentId)
      if (cur) {
        cur.backfillMinSeq = cur.afterUpdatedSeq || '0'
        cur.afterUpdatedSeq = '0'
        this.triggerReconnect()
      }
    }
  }
}

export function ensureGrokAccountWatch(opts: {
  accountId: string
  agentIds?: string[]
  conversationMap?: Record<string, string | string[]>
  createClient: () => Promise<GrokConnectClient>
  emit: (event: GrokMainEvent) => void
}): GrokAccountWatchHandle {
  let ctrl = watches.get(opts.accountId)
  if (!ctrl) {
    ctrl = new AccountWatchController({
      accountId: opts.accountId,
      createClient: opts.createClient,
      emit: opts.emit
    })
    watches.set(opts.accountId, ctrl)
  }
  ctrl.updateTargets(opts.agentIds ?? [], opts.conversationMap)
  return ctrl
}

export function getGrokAccountWatch(accountId: string): GrokAccountWatchHandle | undefined {
  return watches.get(accountId)
}

export function rebindGrokAccountWatch(accountId: string): void {
  if (accountId === '*') {
    for (const ctrl of watches.values()) ctrl.rebindNetwork()
    return
  }
  watches.get(accountId)?.rebindNetwork()
}

export function stopGrokAccountWatch(accountId: string): void {
  if (accountId === '*') {
    for (const ctrl of watches.values()) ctrl.stop()
    watches.clear()
    return
  }
  const ctrl = watches.get(accountId)
  if (ctrl) {
    ctrl.stop()
    watches.delete(accountId)
  }
}
