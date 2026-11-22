import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Code2, FolderOpen, Import, Link2, Loader2, Play, Unlink, X } from 'lucide-react'
import type { WorkspaceRequest, WorkspaceTool, WorkspaceView } from '@shared/workspace'
import { ArkMcpNodeSvg, ArkWorkspaceVaultSvg } from '@/components/ui/ArkGlyphs'
import { Button } from '@/components/ui/Button'
import { SwitchPill } from '@/components/ui/Controls'
import { TextInput } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { MENU_SURFACE } from '@/components/ui/Menu'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { getBridge } from '@/lib/bridge'
import { cn } from '@/lib/cn'

export interface WorkspaceToolsProps {
  scope: string
  recipient: string
  append: (text: string) => void
  hermesAccount?: string
  variant?: 'popover' | 'inspector'
}

type StudioTab = 'file' | 'folder' | 'mcp'

interface SchemaPropertySpec {
  key: string
  type: string
  description?: string
  required: boolean
}

function extractScalarFields(tool: WorkspaceTool | undefined): SchemaPropertySpec[] | null {
  if (!tool?.inputSchema || typeof tool.inputSchema !== 'object') return []
  const props = tool.inputSchema['properties']
  if (!props || typeof props !== 'object') return []
  const reqSet = new Set(
    Array.isArray(tool.inputSchema['required'])
      ? (tool.inputSchema['required'] as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
  )
  const out: SchemaPropertySpec[] = []
  for (const [key, raw] of Object.entries(props as Record<string, unknown>)) {
    const spec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const type = typeof spec['type'] === 'string' ? spec['type'] : 'string'
    if (type === 'object' || type === 'array') return null
    out.push({
      key,
      type,
      description: typeof spec['description'] === 'string' ? spec['description'] : undefined,
      required: reqSet.has(key)
    })
  }
  return out
}

function WorkspaceStudioBody({
  scope,
  recipient,
  append,
  hermesAccount,
  state,
  setState,
  onAfterAppend,
  onClose
}: {
  scope: string
  recipient: string
  append: (text: string) => void
  hermesAccount?: string
  state: WorkspaceView | undefined
  setState: (next: WorkspaceView) => void
  onAfterAppend?: () => void
  onClose?: () => void
}) {
  const bridge = getBridge()?.workspace
  const [tab, setTab] = useState<StudioTab>('file')
  const [path, setPath] = useState('.')
  const [range, setRange] = useState('')
  const [mcpTool, setMcpTool] = useState<string>('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [rawJsonMode, setRawJsonMode] = useState(false)
  const [argsJson, setArgsJson] = useState('{}')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)

  const externalTools = useMemo(
    () => (state?.tools ?? []).filter((t) => t.name !== 'read' && t.name !== 'list'),
    [state?.tools]
  )

  useEffect(() => {
    if (!externalTools.some((t) => t.name === mcpTool)) {
      setMcpTool(externalTools[0]?.name ?? '')
      setFieldValues({})
      setArgsJson('{}')
    }
  }, [externalTools, mcpTool])

  const selectedMcpSpec = useMemo(
    () => externalTools.find((t) => t.name === mcpTool),
    [externalTools, mcpTool]
  )
  const scalarFields = useMemo(() => extractScalarFields(selectedMcpSpec), [selectedMcpSpec])

  if (!bridge) return null

  const act = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setHint('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const manage = (request: Exclude<WorkspaceRequest, { op: 'run' }>, okHint?: string) =>
    act(async () => {
      const next = await bridge.manage(scope, request)
      setState(next)
      if (okHint) setHint(okHint)
    })

  const runReadOrList = (op: 'read' | 'list') =>
    act(async () => {
      const targetPath = path.trim() || '.'
      const lines =
        range.trim() && op === 'read' ? /^(\d+)\s*-\s*(\d+)$/.exec(range.trim()) : null
      if (
        range.trim() &&
        op === 'read' &&
        (!lines || +lines[1]! < 1 || +lines[2]! < +lines[1]!)
      ) {
        throw new Error('行号格式如 1-80')
      }
      let result = await bridge.run(scope, op, { path: targetPath }, recipient)
      if (lines) {
        result = result
          .split('\n')
          .slice(+lines[1]! - 1, +lines[2]!)
          .join('\n')
      }
      const label =
        op === 'read'
          ? `@file ${targetPath}${lines ? `:${lines[1]}-${lines[2]}` : ''}`
          : `@folder ${targetPath}`
      append(`[${label}]\n${result}`)
      onAfterAppend?.()
    })

  const runCustomMcpTool = () =>
    act(async () => {
      if (!mcpTool) return
      let parsedArgs: Record<string, unknown> = {}
      if (!rawJsonMode && scalarFields !== null) {
        for (const f of scalarFields) {
          const raw = (fieldValues[f.key] ?? '').trim()
          if (!raw) {
            if (f.required) throw new Error(`请填写 ${f.key}`)
            continue
          }
          if (f.type === 'number' || f.type === 'integer') {
            const num = Number(raw)
            if (Number.isNaN(num)) throw new Error(`${f.key} 需为数字`)
            parsedArgs[f.key] = num
          } else if (f.type === 'boolean') {
            parsedArgs[f.key] = raw === 'true' || raw === '1'
          } else {
            parsedArgs[f.key] = raw
          }
        }
      } else {
        try {
          parsedArgs = JSON.parse(argsJson || '{}') as Record<string, unknown>
        } catch {
          throw new Error('JSON 格式有误')
        }
      }
      const result = await bridge.run(scope, mcpTool, parsedArgs, recipient)
      append(`[${mcpTool}]\n${result}`)
      onAfterAppend?.()
    })

  const runningCount = (state?.servers ?? []).filter((s) => s.running).length

  return (
    <div className="flex flex-col gap-2.5">
      {onClose && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArkWorkspaceVaultSvg active className="size-4 text-accent-600" />
            <span className="text-[13px] font-semibold tracking-tight text-ink">本地工作区</span>
          </div>
          <IconButton label="关闭" onClick={onClose} className="-mr-1 size-7">
            <X />
          </IconButton>
        </div>
      )}

      {/* Compact Directory Bar */}
      <div className="rounded-xl border border-line bg-sunken/45 p-2.5">
        {state?.directory ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="size-1.5 shrink-0 rounded-full bg-status-online" />
                <span
                  className="truncate font-mono text-[11.5px] font-medium text-ink"
                  title={state.directory}
                >
                  {state.directory}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void manage({ op: 'bind' })}
                  className="h-6 px-2 text-[11px]"
                >
                  更换
                </Button>
                <button
                  type="button"
                  disabled={busy}
                  title="解除目录绑定"
                  aria-label="解除绑定"
                  onClick={() => void manage({ op: 'unbind' })}
                  className="press-icon grid size-6 place-items-center rounded-full text-ink-muted hover:bg-hover hover:text-status-error"
                >
                  <Unlink className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void manage({ op: 'import' }, '已导入 MCP')}
                className="h-6.5 px-2.5 text-[11px]"
              >
                <Import className="size-3" />
                导入 MCP
              </Button>
              {hermesAccount && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void manage({ op: 'hermes', accountId: hermesAccount }, '已接入 Hermes')
                  }
                  className="h-6.5 px-2.5 text-[11px]"
                >
                  <Link2 className="size-3" />
                  接入 Hermes
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-ink-secondary">选择项目目录以启用文件与 MCP</span>
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => void manage({ op: 'bind' })}
            >
              <FolderOpen className="size-3.5" />
              选择目录
            </Button>
          </div>
        )}
      </div>

      {state?.directory && (
        <>
          <SegmentedControl<StudioTab>
            value={tab}
            onValueChange={setTab}
            fullWidth
            size="xs"
            aria-label="工作区模式"
            options={[
              { value: 'file', label: '文件' },
              { value: 'folder', label: '目录' },
              {
                value: 'mcp',
                label: 'MCP',
                badge:
                  state.servers.length > 0 ? (
                    <span className="rounded-full bg-accent-50 px-1.5 text-[10px] font-semibold text-accent-600 tabular-nums">
                      {runningCount}/{state.servers.length}
                    </span>
                  ) : undefined
              }
            ]}
          />

          {tab === 'file' && (
            <div className="flex items-center gap-1.5 animate-veil-in">
              <TextInput
                aria-label="相对路径"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="src/App.tsx"
                className="h-8 min-w-0 flex-1 font-mono text-[12px]"
              />
              <TextInput
                aria-label="摘录行号"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="1-80"
                className="h-8 w-20 shrink-0 font-mono text-[12px]"
              />
              <Button
                size="sm"
                variant="primary"
                disabled={busy || !path.trim()}
                onClick={() => void runReadOrList('read')}
                className="h-8 px-3"
              >
                {busy ? <Loader2 className="animate-spin" /> : '插入'}
              </Button>
            </div>
          )}

          {tab === 'folder' && (
            <div className="flex items-center gap-1.5 animate-veil-in">
              <TextInput
                aria-label="目录相对路径"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="."
                className="h-8 min-w-0 flex-1 font-mono text-[12px]"
              />
              <Button
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => void runReadOrList('list')}
                className="h-8 px-3"
              >
                {busy ? <Loader2 className="animate-spin" /> : '插入目录树'}
              </Button>
            </div>
          )}

          {tab === 'mcp' && (
            <div className="flex flex-col gap-2 animate-veil-in">
              {state.servers.length === 0 ? (
                <p className="py-2 text-center text-[11.5px] text-ink-muted">
                  点击上方「导入 MCP」加载 mcpServers 配置
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {state.servers.map((srv) => (
                    <div
                      key={srv.name}
                      className="flex items-center justify-between gap-2 rounded-xl px-2 py-1 hover:bg-hover/60"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <ArkMcpNodeSvg
                          className={cn(
                            'size-3.5',
                            srv.running ? 'text-status-online' : 'text-ink-faint'
                          )}
                        />
                        <span className="truncate text-[12.5px] font-medium text-ink">
                          {srv.name}
                        </span>
                      </div>
                      <SwitchPill
                        size="sm"
                        checked={srv.running}
                        disabled={busy}
                        aria-label={`${srv.running ? '停止' : '启动'} ${srv.name}`}
                        onCheckedChange={() =>
                          void manage({ op: srv.running ? 'stop' : 'start', server: srv.name })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {externalTools.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Select
                      size="xs"
                      aria-label="工作区工具"
                      value={mcpTool}
                      onValueChange={(next) => {
                        setMcpTool(next)
                        setFieldValues({})
                        setArgsJson('{}')
                      }}
                      className="flex-1"
                      options={externalTools.map((t) => ({
                        value: t.name,
                        label: t.name,
                        description: t.description
                      }))}
                    />
                    {scalarFields !== null && scalarFields.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRawJsonMode((v) => !v)}
                        title={rawJsonMode ? '切换表单' : '切换 JSON'}
                        className="press-icon grid size-7 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-hover hover:text-ink"
                      >
                        <Code2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {!rawJsonMode && scalarFields !== null ? (
                    scalarFields.map((f) => (
                      <TextInput
                        key={f.key}
                        value={fieldValues[f.key] ?? ''}
                        onChange={(e) =>
                          setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        placeholder={`${f.key}${f.required ? ' *' : ''}`}
                        className="h-8 font-mono text-[12px]"
                      />
                    ))
                  ) : (
                    <textarea
                      aria-label="工具参数 JSON"
                      value={argsJson}
                      rows={2}
                      onChange={(e) => setArgsJson(e.target.value)}
                      placeholder='{"key": "value"}'
                      className="w-full resize-none rounded-lg border border-line-strong bg-sunken/40 px-2.5 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-accent-300"
                    />
                  )}

                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy || !mcpTool}
                    onClick={() => void runCustomMcpTool()}
                    className="w-full"
                  >
                    {busy ? <Loader2 className="animate-spin" /> : <Play />}
                    运行并插入
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {hint && <p className="text-[11px] text-status-online-ink">{hint}</p>}
      {error && (
        <p role="alert" className="text-[11px] text-status-error">
          {error}
        </p>
      )}
    </div>
  )
}

export function WorkspaceTools({
  scope,
  recipient,
  append,
  hermesAccount,
  variant = 'popover'
}: WorkspaceToolsProps) {
  const bridge = getBridge()?.workspace
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<WorkspaceView>()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ left: number; bottom: number } | null>(null)

  const refresh = useCallback(() => {
    if (!bridge) return
    void bridge
      .manage(scope, { op: 'status' })
      .then((v) => setState(v))
      .catch(() => undefined)
  }, [bridge, scope])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  useLayoutEffect(() => {
    if (!open || variant !== 'popover' || !triggerRef.current) return
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const panelWidth = 376
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - panelWidth - 12))
      const bottom = Math.max(12, window.innerHeight - rect.top + 10)
      setCoords({ left, bottom })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [open, variant])

  useEffect(() => {
    if (!open || variant !== 'popover') return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      if (target.closest('[data-radix-popper-content-wrapper]')) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, variant])

  if (!bridge) return null

  if (variant === 'inspector') {
    return (
      <div className="px-4 py-3">
        <WorkspaceStudioBody
          scope={scope}
          recipient={recipient}
          append={append}
          hermesAccount={hermesAccount}
          state={state}
          setState={setState}
        />
      </div>
    )
  }

  const bound = Boolean(state?.directory)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-label="本地工作区与 MCP"
        title={state?.directory ? `工作区：${state.directory}` : '本地工作区与 MCP'}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'no-drag press-icon relative grid size-8 shrink-0 place-items-center rounded-full transition-colors outline-none',
          open
            ? 'bg-active text-ink'
            : bound
              ? 'text-ink hover:bg-hover'
              : 'text-ink-secondary hover:bg-hover hover:text-ink'
        )}
      >
        <ArkWorkspaceVaultSvg active={bound} />
        {bound && (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-status-online ring-2 ring-surface"
          />
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="本地工作区"
            style={{ left: coords.left, bottom: coords.bottom }}
            className={cn(
              'no-drag fixed z-40 w-[min(376px,calc(100vw-24px))] p-3',
              MENU_SURFACE,
              'animate-pop-lift shadow-dialog'
            )}
          >
            <WorkspaceStudioBody
              scope={scope}
              recipient={recipient}
              append={append}
              hermesAccount={hermesAccount}
              state={state}
              setState={setState}
              onAfterAppend={() => setOpen(false)}
              onClose={() => setOpen(false)}
            />
          </div>,
          document.body
        )}
    </>
  )
}
