import { useCallback, useEffect, useState } from 'react'
import { harkProjects, type HarkProject } from '@shared/harkProjects'
import { getBridge } from '@/lib/bridge'
import { useBotStore } from '@/store/botStore'
import { Button } from '@/components/ui/Button'
import type { HarkRpcRequest } from '@shared/ipc'

async function rpc(request: HarkRpcRequest) {
  const result = await getBridge()?.hark.rpc(request)
  if (!result?.ok) throw new Error(result?.message ?? 'Hark unavailable')
  return result.data
}

export function HarkProjects({ botId, compact }: { botId: string; compact?: boolean }) {
  const bot = useBotStore((s) => s.bots.find((b) => b.id === botId))!
  const accountId = bot.activeAccountId
  const connected = useBotStore((s) => ['online', 'busy'].includes(s.accounts[accountId]?.status ?? ''))
  const [projects, setProjects] = useState<HarkProject[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [revision, setRevision] = useState(0)
  const invalidate = useCallback(() => setRevision((n) => n + 1), [])
  useEffect(() => {
    window.addEventListener('bothub:hark-projects', invalidate)
    return () => window.removeEventListener('bothub:hark-projects', invalidate)
  }, [invalidate])
  useEffect(() => {
    let current = true
    if (connected) void rpc({ accountId, op: 'listConversations' }).then(harkProjects)
      .then((rows) => { if (current) { setProjects(rows); setError('') } })
      .catch((e) => { if (current) setError(String(e.message)) })
    return () => { current = false }
  }, [accountId, connected, revision])

  async function perform(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }
  const select = (id: string) => perform(() => useBotStore.getState().switchHarkSession(botId, id))
  const changed = () => window.dispatchEvent(new Event('bothub:hark-projects'))
  if (!connected) return null
  return <div className="no-drag flex min-w-0 flex-wrap items-center gap-1 text-xs">
    {compact ? <>
      <select aria-label="切换 Hark 项目" className="max-w-32 rounded bg-surface px-1 py-1" value={bot.activeSessionId ?? ''}
        disabled={busy} onChange={(e) => void select(e.target.value)}>
        {!projects.some((p) => p.id === bot.activeSessionId) && <option value={bot.activeSessionId ?? ''}>当前会话</option>}
        {projects.filter((p) => !p.archived || p.id === bot.activeSessionId).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <Button size="sm" disabled={busy} onClick={() => setAdding(!adding)}>新建项目</Button>
      {adding && <form onSubmit={(e) => {
        e.preventDefault()
        void perform(async () => {
          await useBotStore.getState().startNewHarkSession(botId, title.trim())
          setAdding(false)
          setTitle('')
          changed()
        })
      }}><input autoFocus aria-label="项目名称" placeholder="项目名称" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button disabled={busy || !title.trim()}>创建</button></form>}
    </> : <ul className="w-full divide-y divide-line">{projects.map((p) =>
      <li key={p.id} className="flex items-center gap-2 py-1">
        <button className="min-w-0 flex-1 truncate text-left" disabled={busy || p.archived}
          aria-current={bot.activeSessionId === p.id} onClick={() => void select(p.id)}>{p.title}</button>
        {!p.main && <>
          <button disabled={busy} onClick={() => void perform(async () => {
            const data = await rpc({ accountId, op: 'call', path: `/project/${encodeURIComponent(p.id)}/preview-url` })
            const url = (data as { url?: string })?.url
            if (!url || new URL(url).protocol !== 'https:') throw new Error('项目暂无可用预览')
            await getBridge()?.muse.openHttps(url)
          })}>预览</button>
          <button disabled={busy} onClick={() => void perform(async () => {
            await rpc({ accountId, op: 'call', method: 'POST',
              path: `/conversations/${encodeURIComponent(p.id)}/${p.archived ? 'unarchive' : 'archive'}` })
            changed()
            const main = projects.find((row) => row.main)
            if (!p.archived && bot.activeSessionId === p.id && main) await useBotStore.getState().switchHarkSession(botId, main.id)
          })}>{p.archived ? '恢复' : '归档'}</button>
        </>}
      </li>)}</ul>}
    {error && <span role="alert" className="text-status-error">{error}</span>}
  </div>
}
