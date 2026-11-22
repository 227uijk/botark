import { useEffect, useState } from 'react'
import type { WorkspaceRequest, WorkspaceView } from '@shared/workspace'
import { getBridge } from '@/lib/bridge'
import { Button } from '@/components/ui/Button'

export function WorkspaceTools({ scope, recipient, append, hermesAccount }: {
  scope: string; recipient: string; append: (text: string) => void; hermesAccount?: string
}) {
  const bridge = getBridge()?.workspace
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<WorkspaceView>()
  const [tool, setTool] = useState('read')
  const [path, setPath] = useState('.')
  const [args, setArgs] = useState('{}')
  const [range, setRange] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    if (open && bridge) void bridge.manage(scope, { op: 'status' }).then((v) => { if (live) setState(v) })
      .catch((err) => { if (live) setError(String(err)) })
    return () => { live = false }
  }, [open, scope, bridge])
  if (!bridge) return null
  async function act(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  const manage = (request: Exclude<WorkspaceRequest, { op: 'run' }>) =>
    act(async () => setState(await bridge!.manage(scope, request)))
  const file = tool === 'read' || tool === 'list'
  const schema = state?.tools.find((t) => t.name === tool)?.inputSchema
  return <div className="shrink-0 py-1 text-xs">
    <button type="button" aria-expanded={open} className="text-ink-secondary" onClick={() => setOpen(!open)}>本地工作区与 MCP</button>
    {open && <fieldset disabled={busy} className="max-h-52 overflow-auto rounded border border-line p-2">
      <div className="flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => void manage({ op: 'bind' })}>{state?.directory ? '更换目录' : '选择目录'}</Button>
        {state?.directory && <><span className="truncate" title={state.directory}>{state.directory}</span>
          <Button size="sm" onClick={() => void manage({ op: 'unbind' })}>解除绑定</Button>
          <Button size="sm" onClick={() => void manage({ op: 'import' })}>导入 MCP 配置</Button>
          {hermesAccount && <Button size="sm" onClick={() => void manage({ op: 'hermes', accountId: hermesAccount })}>接入同机 Hermes</Button>}</>}
      </div>
      {state?.servers.map((s) => <div key={s.name} className="flex items-center gap-2 py-1">{s.name}
        <Button size="sm" onClick={() => void manage({ op: s.running ? 'stop' : 'start', server: s.name })}>{s.running ? '停止' : '启动'}</Button></div>)}
      {state?.directory && <div className="flex flex-wrap items-center gap-2 pt-2">
        <select aria-label="工作区工具" value={tool} onChange={(e) => { setTool(e.target.value); setArgs('{}') }}>
          {state.tools.map((t) => <option value={t.name} key={t.name}>{t.name === 'read' ? '@file' : t.name === 'list' ? '@folder' : t.name}</option>)}
        </select>
        {file ? <><input aria-label="相对路径" className="rounded border border-line px-1" value={path} onChange={(e) => setPath(e.target.value)} />
          {tool === 'read' && <input aria-label="摘录行号" placeholder="行号，如 1-80" value={range} onChange={(e) => setRange(e.target.value)} />}</> :
          <><code className="w-full break-all">{JSON.stringify(schema?.properties)}</code>
            <textarea aria-label="工具参数 JSON" value={args} onChange={(e) => setArgs(e.target.value)} /></>}
        <Button size="sm" onClick={() => void act(async () => {
          const lines = range.trim() && tool === 'read' ? /^(\d+)-(\d+)$/.exec(range.trim()) : null
          if (range.trim() && tool === 'read' && (!lines || +lines[1]! < 1 || +lines[2]! < +lines[1]!)) throw new Error('请输入有效行号范围')
          let result = await bridge!.run(scope, tool, file ? { path } : JSON.parse(args), recipient)
          if (lines) result = result.split('\n').slice(+lines[1]! - 1, +lines[2]!).join('\n')
          append(`[${file ? (tool === 'read' ? '@file ' : '@folder ') + path : tool}]\n${result}`)
        })}>将结果加入草稿</Button>
      </div>}
      {error && <p role="alert" className="text-status-error">{error}</p>}
    </fieldset>}
  </div>
}
