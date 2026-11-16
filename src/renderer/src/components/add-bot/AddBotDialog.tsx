import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { getPlatform } from '@adapters/platforms'
import { adapterRegistry } from '@adapters/registry'
import type { PlatformId } from '@adapters/types'
import { createId } from '@shared/id'
import { Camera, ChevronLeft, ChevronRight, ExternalLink, ListPlus, Plus, RefreshCw } from 'lucide-react'
import { MuseBatchImport } from './MuseBatchImport'
import { BotAvatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { PlatformGlyph } from '@/components/ui/PlatformGlyph'
import { useMorphHeight } from '@/hooks/useMorphHeight'
import { usePlatformLogin } from '@/hooks/usePlatformLogin'
import { avatarFromFile } from '@/lib/avatarImage'
import { getBridge } from '@/lib/bridge'
import { cn } from '@/lib/cn'
import { useBotStore } from '@/store/botStore'
import { BLANK_TEMPLATE, BOT_TEMPLATES, localizeTemplate, type BotTemplate } from '@/data/botTemplates'
import { useT, t as tStatic } from '@/lib/i18n'
import { usePrefsStore } from '@/store/prefsStore'

const NAME_MAX = 40

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : tStatic('Something went wrong.')
}

/** "Meta Muse", then "Meta Muse 2", … — never clashes with an existing bot. */
function freshName(base: string, taken: readonly string[]): string {
  const lower = new Set(taken.map((name) => name.toLowerCase()))
  if (!lower.has(base.toLowerCase())) return base
  for (let n = 2; ; n++) if (!lower.has(`${base} ${n}`.toLowerCase())) return `${base} ${n}`
}

export function AddBotDialog() {
  const open = useBotStore((s) => s.addBotOpen)
  const key = useBotStore((s) => s.addBotKey)
  const setOpen = useBotStore((s) => s.setAddBotOpen)
  if (key === 0) return null
  return <AddBotFlow key={key} open={open} onClose={() => setOpen(false)} />
}

function AddBotFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addBot = useBotStore((s) => s.addBot)
  const bots = useBotStore((s) => s.bots)
  const accounts = useBotStore((s) => s.accounts)
  const syncGrokAccountBots = useBotStore((s) => s.syncGrokAccountBots)
  const selectBot = useBotStore((s) => s.selectBot)
  const initialPlatform = useBotStore((s) => s.addBotInitialPlatform)
  const botId = useRef(createId('bot')).current
  const login = usePlatformLogin(botId)
  const listRef = useRef<HTMLUListElement>(null)
  const morph = useMorphHeight<HTMLDivElement>()
  const created = useRef(false)
  const grokSyncedRef = useRef(false)
  const [template, setTemplate] = useState<BotTemplate>(BLANK_TEMPLATE)
  const [batch, setBatch] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)
  const [grokAccountChoiceOpen, setGrokAccountChoiceOpen] = useState(false)
  const { phase } = login
  const t = useT()
  const locale = usePrefsStore((s) => s.locale)

  const liveGrokAccounts = Object.values(accounts).filter(
    (a) => a.platformId === 'grok' && (a.status === 'online' || a.status === 'busy')
  )

  // If opened with `initialPlatform === 'grok'` (e.g. from onboarding or CLI `--open-grok-login`),
  // jump straight into Grok login or account picker automatically!
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (!open || autoStartedRef.current || !initialPlatform) return
    if (initialPlatform === 'grok') {
      autoStartedRef.current = true
      if (liveGrokAccounts.length > 0) {
        setGrokAccountChoiceOpen(true)
      } else {
        login.start('grok')
      }
    }
  }, [open, initialPlatform, liveGrokAccounts.length])

  // Grok Bot: 1 account = many server-side Bots. As soon as sign-in completes,
  // sync all Bots under that Grok account into the left sidebar and close!
  useEffect(() => {
    if (phase.kind !== 'signed-in' || phase.platformId !== 'grok' || grokSyncedRef.current) return
    grokSyncedRef.current = true
    login.keep()
    created.current = true
    void syncGrokAccountBots(login.accountId, {
      includeDismissed: true,
      selectFirst: true
    }).finally(() => {
      onClose()
    })
  }, [phase, login, syncGrokAccountBots, onClose])

  const confirmLeaveBatch = () =>
    !batch ||
    !batchBusy ||
    window.confirm(
      t('Batch import is still running. Leaving cancels the unfinished accounts. Leave anyway?')
    )

  const close = () => {
    if (!confirmLeaveBatch()) return
    login.discard()
    onClose()
  }

  const handlePickPlatform = (platformId: PlatformId) => {
    if (platformId === 'grok' && liveGrokAccounts.length > 0) {
      setGrokAccountChoiceOpen(true)
      return
    }
    login.start(platformId)
  }

  const finish = (platformId: PlatformId, name: string, avatar: string | undefined) => {
    login.keep()
    created.current = true
    const picked = localizeTemplate(template, locale)
    addBot({
      id: botId,
      platformId,
      name,
      avatar,
      emoji: picked.emoji,
      description: picked.id === 'blank' ? undefined : picked.description,
      notes: picked.starter ? `${t('Starter brief')}（${picked.name}）:\n${picked.starter}` : undefined,
      accounts: [{ key: login.accountId, accountId: login.accountId, displayName: name, handle: '' }]
    })
  }

  const platform = phase.kind === 'idle' ? undefined : getPlatform(phase.platformId)
  const title = batch
    ? t('Batch import Muse accounts')
    : grokAccountChoiceOpen && phase.kind === 'idle'
      ? '添加 Grok Bot'
      : phase.kind === 'idle'
        ? t('New bot')
        : phase.kind === 'waiting'
          ? t('Sign in to {name}', { name: platform!.name })
          : phase.platformId === 'grok'
            ? '正在同步 Grok Bot 名单…'
            : t('Set up your bot')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title={title}
      className={batch ? 'w-[min(92vw,520px)]' : 'w-[min(92vw,440px)]'}
      headerStart={
        batch ? (
          <IconButton
            label={t('Back')}
            size="sm"
            onClick={() => confirmLeaveBatch() && setBatch(false)}
            className="-ml-1"
          >
            <ChevronLeft />
          </IconButton>
        ) : grokAccountChoiceOpen && phase.kind === 'idle' ? (
          <IconButton
            label={t('Back')}
            size="sm"
            onClick={() => setGrokAccountChoiceOpen(false)}
            className="-ml-1"
          >
            <ChevronLeft />
          </IconButton>
        ) : phase.kind === 'waiting' ? (
          <IconButton label={t('Back')} size="sm" onClick={login.discard} className="-ml-1">
            <ChevronLeft />
          </IconButton>
        ) : null
      }
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        const preferred = listRef.current?.querySelector<HTMLButtonElement>(
          'button[data-initial-platform="true"]:not(:disabled)'
        )
        ;(preferred ?? listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus()
      }}
      onCloseAutoFocus={(event) => {
        if (!created.current) return
        event.preventDefault()
        window.dispatchEvent(new Event('bothub:focus-composer'))
      }}
    >
      <div
        className="overflow-hidden transition-[height] duration-[420ms] ease-spring-shape motion-reduce:transition-none"
        style={{ height: morph.height }}
      >
        <div ref={morph.ref}>
          {batch && (
            <MuseBatchImport
              key="batch"
              onBusyChange={setBatchBusy}
              onDone={() => {
                created.current = true
                onClose()
              }}
            />
          )}
          {!batch && phase.kind === 'idle' && grokAccountChoiceOpen && (
            <GrokExistingAccountStep
              accounts={liveGrokAccounts}
              onCreated={(newBotId) => {
                created.current = true
                if (newBotId) selectBot(newBotId)
                onClose()
              }}
              onLoginNewAccount={() => {
                setGrokAccountChoiceOpen(false)
                login.start('grok')
              }}
            />
          )}
          {!batch && phase.kind === 'idle' && !grokAccountChoiceOpen && (
            <PlatformStep
              key="platform"
              listRef={listRef}
              initialPlatform={initialPlatform}
              error={phase.error}
              onPick={handlePickPlatform}
              onBatch={() => setBatch(true)}
            />
          )}
          {!batch && phase.kind === 'waiting' && (
            <LoginWaiting
              key="login"
              platformId={phase.platformId}
              accountId={login.accountId}
              windowClosed={phase.windowClosed}
              onReopen={login.reopen}
            />
          )}
          {!batch && phase.kind === 'signed-in' && phase.platformId === 'grok' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <RefreshCw className="size-5 animate-spin text-ink-secondary" />
              <p className="text-[13.5px] text-ink-secondary">
                登录成功，正在将该账号下的全部 Grok Bot 同步到左侧列表…
              </p>
            </div>
          )}
          {!batch && phase.kind === 'signed-in' && phase.platformId !== 'grok' && (
            <NameStep
              key="name"
              platformId={phase.platformId}
              template={template}
              onTemplate={setTemplate}
              defaultName={freshName(
                localizeTemplate(template, locale).name || getPlatform(phase.platformId).name,
                bots.map((b) => b.name)
              )}
              onDone={(name, avatar) => finish(phase.platformId, name, avatar)}
            />
          )}
        </div>
      </div>
    </Dialog>
  )
}

function GrokExistingAccountStep({
  accounts,
  onCreated,
  onLoginNewAccount
}: {
  accounts: Array<{ id: string; displayName: string; handle: string }>
  onCreated: (botId?: string) => void
  onLoginNewAccount: () => void
}) {
  const syncGrokAccountBots = useBotStore((s) => s.syncGrokAccountBots)
  const bots = useBotStore((s) => s.bots)
  const [targetAccId, setTargetAccId] = useState(accounts[0]?.id ?? '')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleCreateOnAccount = async () => {
    const trimmed = newName.trim()
    if (!trimmed || !targetAccId) return
    const grok = getBridge()?.grok
    if (!grok?.rpc) return
    setBusy(true)
    setError('')
    try {
      const agentId = crypto.randomUUID()
      const res = await grok.rpc({
        accountId: targetAccId,
        op: 'call',
        method: 'CreateGrokBotAgent',
        params: {
          legacy_agent_id: agentId,
          agent_id: agentId,
          name: trimmed,
          title: trimmed,
          description: '',
          avatar_shape: 'sparkle',
          avatar_color: 'blue',
          harness: 2,
          create_intent: 1,
          create_caller: 5
        }
      })
      if (!res.ok) throw new Error(res.message || '创建失败')
      await syncGrokAccountBots(targetAccId, { includeDismissed: true })
      const createdBot = useBotStore
        .getState()
        .bots.find((b) => b.platformId === 'grok' && b.selectedAgentId === agentId)
      onCreated(createdBot?.id)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleSyncAll = async () => {
    if (!targetAccId) return
    setBusy(true)
    setError('')
    try {
      await syncGrokAccountBots(targetAccId, { includeDismissed: true, selectFirst: true })
      const first = useBotStore
        .getState()
        .bots.find((b) => b.platformId === 'grok' && b.accountIds.includes(targetAccId))
      onCreated(first?.id)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const existingCount = bots.filter(
    (b) => b.platformId === 'grok' && b.accountIds.includes(targetAccId)
  ).length

  return (
    <div className="flex animate-veil-in flex-col gap-3.5 pt-1">
      <div className="rounded-xl border border-line bg-surface p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-ink">在已登录账号下新建 Bot</span>
          {accounts.length > 1 ? (
            <select
              value={targetAccId}
              onChange={(e) => setTargetAccId(e.target.value)}
              className="rounded-lg border border-line bg-main px-2 py-1 text-[12px] text-ink"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.handle || a.displayName}
                </option>
              ))}
            </select>
          ) : (
            <span className="truncate font-mono text-[11.5px] text-ink-muted">
              {accounts[0]?.handle || accounts[0]?.displayName}（已同步 {existingCount} 个 Bot）
            </span>
          )}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="输入新 Bot 名称…"
            className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-main px-3 text-[13px] text-ink outline-none focus:border-accent-600"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                e.preventDefault()
                void handleCreateOnAccount()
              }
            }}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !newName.trim()}
            onClick={() => void handleCreateOnAccount()}
          >
            <Plus className="size-3.5" /> 新建
          </Button>
        </div>
        <div className="mt-2 flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSyncAll()}
            className="inline-flex items-center gap-1 text-[12px] text-ink-secondary hover:text-ink"
          >
            <RefreshCw className={cn('size-3', busy && 'animate-spin')} />
            重新同步该账号下的全部 Bot 到左侧列表
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onLoginNewAccount}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-dashed border-line px-3.5 text-[13px] text-ink-secondary transition-colors hover:border-ink/25 hover:bg-hover hover:text-ink"
      >
        <span>登录或导入另一个 Grok Bot 账号</span>
        <ChevronRight className="size-4" />
      </button>

      {error && <p className="text-[12px] text-status-error">{error}</p>}
    </div>
  )
}

function moveFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]
  if (next) {
    event.preventDefault()
    next.focus()
  }
}

function PlatformStep({
  listRef,
  initialPlatform,
  error,
  onPick,
  onBatch
}: {
  listRef: RefObject<HTMLUListElement | null>
  initialPlatform?: PlatformId | null
  error?: string
  onPick: (platformId: PlatformId) => void
  onBatch: () => void
}) {
  const platforms = adapterRegistry.listPlatforms().filter((p) => p.usable)
  const t = useT()
  return (
    <div className="animate-veil-in">
      <ul ref={listRef} className="flex flex-col gap-0.5" onKeyDown={moveFocus} aria-label={t('Platforms')}>
        {platforms.map((p) => {
          const highlighted = initialPlatform === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                data-initial-platform={highlighted ? 'true' : undefined}
                onClick={() => onPick(p.id)}
                className={cn(
                  'group flex h-12 w-full items-center gap-3 rounded-[10px] px-2.5 text-left transition-colors duration-100',
                  highlighted
                    ? 'bg-accent-50/50 ring-1 ring-accent/40 hover:bg-accent-50'
                    : 'hover:bg-hover active:bg-active'
                )}
              >
                <PlatformGlyph platform={p} size="md" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{p.name}</span>
                  {p.id === 'grok' && (
                    <span className="block truncate text-[11.5px] text-ink-muted">
                      登录一次自动同步账号下全部 Bot
                    </span>
                  )}
                </div>
                <ChevronRight
                  className={cn(
                    'size-4 text-ink-muted transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100',
                    highlighted ? 'opacity-100 text-accent-600' : 'opacity-0'
                  )}
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={onBatch}
        className="mt-2.5 flex h-10 w-full items-center gap-2.5 rounded-[10px] border border-dashed border-line px-3 text-left text-[13px] text-ink-secondary transition-colors hover:border-ink/20 hover:bg-hover hover:text-ink"
      >
        <ListPlus className="size-4" aria-hidden />
        <span className="flex-1">{t('Batch import Muse accounts')}</span>
      </button>
      {error && (
        <p className="mt-3 px-2 text-[12px] text-status-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Shared by the add-bot and add-account flows. */
export function LoginWaiting({
  platformId,
  accountId,
  windowClosed,
  onReopen
}: {
  platformId: PlatformId
  accountId?: string
  windowClosed: boolean
  onReopen: () => void
}) {
  const platform = getPlatform(platformId)
  const actionRef = useRef<HTMLButtonElement>(null)
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [rawInput, setRawInput] = useState('')
  const [refreshInput, setRefreshInput] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [browserOpened, setBrowserOpened] = useState(false)

  useEffect(() => actionRef.current?.focus(), [])

  const openGrokInSystemBrowser = async () => {
    if (!accountId || !window.electron?.grok?.openLogin) return
    setErr('')
    try {
      await window.electron.grok.openLogin({ accountId, openInBrowser: true })
      setBrowserOpened(true)
    } catch (e) {
      setErr(errorMessage(e))
    }
  }

  const quickImportGrokRaw = async () => {
    if (!accountId || !rawInput.trim() || !window.electron?.grok?.setAccessToken) return
    setBusy(true)
    setErr('')
    try {
      const st = await window.electron.grok.setAccessToken({
        accountId,
        accessToken: rawInput.trim(),
        refreshToken: refreshInput.trim() || undefined
      })
      if (!st.signedIn) {
        setErr('凭据无效，请检查粘贴的内容')
      }
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const quickImportDotRaw = async () => {
    if (!accountId || (!rawInput.trim() && !refreshInput.trim()) || !window.electron?.dot?.importCredentials) return
    setBusy(true)
    setErr('')
    try {
      await window.electron.dot.importCredentials({
        accountId,
        rawInput: rawInput.trim(),
        refreshToken: refreshInput.trim() || undefined
      })
      await window.electron.dot.cancelLogin?.(accountId).catch(() => undefined)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const quickImportHarkRaw = async () => {
    if (!accountId || !rawInput.trim() || !window.electron?.hark?.importCredentials) return
    setBusy(true)
    setErr('')
    try {
      const st = await window.electron.hark.importCredentials({
        accountId,
        rawInput: rawInput.trim()
      })
      if (!st.signedIn) {
        setErr('未检测到有效 Hark 会话，请检查 Cookie / Session Token')
        return
      }
      await window.electron.hark.cancelLogin?.(accountId).catch(() => undefined)
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex animate-step-in flex-col items-center gap-4 pt-3 pb-2 text-center" role="status">
      <PlatformGlyph platform={platform} size="lg" />
      <p
        key={windowClosed ? 'closed' : browserOpened ? 'browser' : 'waiting'}
        className={cn(
          'animate-veil-in text-[14px] leading-5',
          windowClosed && !browserOpened ? 'text-ink' : 'shimmer-text'
        )}
      >
        {browserOpened
          ? '已在默认浏览器打开授权页，点击确认后将自动同步…'
          : windowClosed
            ? t('The sign-in window was closed')
            : t('Waiting for you to sign in…')}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          ref={actionRef}
          variant={windowClosed && !browserOpened ? 'primary' : 'secondary'}
          onClick={() => {
            setBrowserOpened(false)
            onReopen()
          }}
        >
          {windowClosed && !browserOpened ? t('Open again') : t('Show window')}
        </Button>

        {platformId === 'grok' && accountId && (
          <Button variant="secondary" disabled={busy} onClick={() => void openGrokInSystemBrowser()}>
            <ExternalLink className="size-3.5" />
            默认浏览器授权
          </Button>
        )}

        {(platformId === 'grok' || platformId === 'dot' || platformId === 'hark') && accountId && (
          <Button variant="ghost" disabled={busy} onClick={() => setShowRaw((v) => !v)}>
            粘贴凭据导入
          </Button>
        )}
      </div>

      {platformId === 'grok' && showRaw && (
        <div className="flex w-full flex-col gap-1.5 text-left">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="粘贴 Access Token (eyJ...)、WorkosCursorSessionToken Cookie、JSON 或 API Key…"
            rows={3}
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-surface p-2 font-mono text-[11.5px] text-ink outline-none focus:border-accent-600"
          />
          <input
            value={refreshInput}
            onChange={(e) => setRefreshInput(e.target.value)}
            placeholder="可选：Refresh Token（用于自动续期）"
            className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-[11.5px] text-ink outline-none focus:border-accent-600"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={busy || !rawInput.trim()}
            onClick={() => void quickImportGrokRaw()}
          >
            {busy ? '正在验证并同步 Bot…' : '导入并同步全部 Bot'}
          </Button>
        </div>
      )}

      {platformId === 'dot' && showRaw && (
        <div className="flex w-full flex-col gap-1.5 text-left">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="粘贴 ChatGPT access_token (eyJ...)、refresh_token (rt_...) 或 JSON…"
            rows={3}
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-surface p-2 font-mono text-[11.5px] text-ink outline-none"
          />
          <input
            value={refreshInput}
            onChange={(e) => setRefreshInput(e.target.value)}
            placeholder="可选：refresh_token (rt_...)"
            className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 font-mono text-[11.5px] text-ink outline-none"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={busy || (!rawInput.trim() && !refreshInput.trim())}
            onClick={() => void quickImportDotRaw()}
          >
            {busy ? '正在验证凭据…' : '导入凭据并继续'}
          </Button>
        </div>
      )}

      {platformId === 'hark' && showRaw && (
        <div className="flex w-full flex-col gap-1.5 text-left">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="粘贴 Hark Cookie（含 __Secure-hark.session_token=...）或 Session Token…"
            rows={3}
            spellCheck={false}
            className="w-full rounded-lg border border-line bg-surface p-2 font-mono text-[11.5px] text-ink outline-none"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={busy || !rawInput.trim()}
            onClick={() => void quickImportHarkRaw()}
          >
            {busy ? '正在验证会话…' : '导入凭据并继续'}
          </Button>
        </div>
      )}

      {err && <p className="text-[12px] text-status-error">{err}</p>}
    </div>
  )
}

function NameStep({
  platformId,
  template,
  onTemplate,
  defaultName,
  onDone
}: {
  platformId: PlatformId
  template: BotTemplate
  onTemplate: (template: BotTemplate) => void
  defaultName: string
  onDone: (name: string, avatar: string | undefined) => void
}) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | undefined>()
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const finalName = name.trim() || defaultName
  const t = useT()
  const emoji = template.emoji

  useEffect(() => inputRef.current?.focus(), [])

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      setAvatar(await avatarFromFile(file))
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  return (
    <form
      className="flex animate-step-in flex-col items-center gap-5 pt-2"
      onSubmit={(event) => {
        event.preventDefault()
        onDone(finalName, avatar)
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={avatar ? t('Change photo') : t('Add a photo')}
          title={avatar ? t('Change photo') : t('Add a photo')}
          className="group press-icon relative block rounded-full"
        >
          <span key={avatar ?? 'mark'} className="inline-flex animate-mark-pop">
            <BotAvatar emoji={emoji} seed={platformId} avatar={avatar} platformId={platformId} size="xl" />
          </span>
          <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-[0.5px] border-line-strong bg-main text-ink-secondary shadow-float transition-colors group-hover:text-ink">
            <Camera className="size-3.5" aria-hidden />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void pickFile(file)
          }}
        />
      </div>

      <div className="flex w-full flex-col gap-1.5">
        <input
          ref={inputRef}
          value={name}
          maxLength={NAME_MAX}
          onChange={(event) => setName(event.target.value)}
          placeholder={defaultName}
          aria-label={t('Bot name')}
          className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-center text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-100 placeholder:text-ink-muted focus:border-accent-600 focus:ring-3 focus:ring-accent-100"
        />
        <TemplateStep selected={template.id} onPick={onTemplate} />
        {error && (
          <p className="text-center text-[12px] text-status-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex w-full items-center justify-end gap-2">
        {avatar && (
          <Button variant="ghost" className="mr-auto -ml-2" onClick={() => setAvatar(undefined)}>
            {t('Remove photo')}
          </Button>
        )}
        <Button variant="primary" type="submit">
          {t('Done')}
        </Button>
      </div>
    </form>
  )
}

function TemplateStep({ selected, onPick }: { selected: string; onPick: (template: BotTemplate) => void }) {
  const t = useT()
  const locale = usePrefsStore((s) => s.locale)
  return (
    <div className="mt-1 flex flex-col gap-1.5" role="radiogroup" aria-label={t('Starting style (optional)')}>
      <p className="px-0.5 text-left text-[12px] font-medium text-ink-muted">{t('Starting style (optional)')}</p>
      <ul className="grid grid-cols-2 gap-1.5">
        {BOT_TEMPLATES.map((raw) => {
          const tpl = localizeTemplate(raw, locale)
          const on = selected === raw.id
          return (
            <li key={raw.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(raw)}
                title={tpl.description}
                className={cn(
                  'press flex h-full w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                  on ? 'border-accent-600 bg-accent-50' : 'border-line bg-surface hover:border-line-strong hover:bg-hover'
                )}
              >
                <span className="text-[16px] leading-none" aria-hidden>
                  {raw.id === 'blank' ? '＋' : tpl.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium text-ink">
                    {raw.id === 'blank' ? t('None') : tpl.name}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
