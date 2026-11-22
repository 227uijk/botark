import { useEffect, useRef, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useBotStore } from '@/store/botStore'
import { addRoom, stopRoom, submitBrief, useRooms } from './roomStore'
import { roomMarkdown, type CollabRoom } from './model'

const NEW_ROOM = 'room-create'
export function RoomList({ compact = false }: { compact?: boolean }) {
  const rooms = useRooms((s) => s.rooms)
  const select = useBotStore((s) => s.selectBot)
  const selected = useBotStore((s) => s.selectedBotId)
  return <section className="no-drag max-h-40 shrink-0 overflow-y-auto border-t border-line px-2 py-1 text-xs">
    <button title="新建协作群聊" className="flex w-full items-center justify-between gap-2 py-1.5" onClick={() => select(NEW_ROOM)}>
      {compact ? <Users size={16} /> : <>协作群聊 <Plus size={15} /></>}
    </button>
    {rooms.map((r) => <button key={r.id} title={r.title} aria-current={r.id === selected}
      className="block w-full truncate rounded px-2 py-1 text-left hover:bg-hover aria-current:bg-active"
      onClick={() => select(r.id)}>{compact ? r.title.slice(0, 1) : r.title}</button>)}
  </section>
}

function CreateRoom() {
  const { bots, accounts, selectBot } = useBotStore()
  const [ids, setIds] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<CollabRoom['mode']>('manual')
  const [limit, setLimit] = useState(8)
  const [error, setError] = useState('')
  const connected = bots.filter((b) => accounts[b.activeAccountId]?.status === 'online')
  return <form className="m-auto flex w-full max-w-lg flex-col gap-4 p-6" onSubmit={(e) => {
    e.preventDefault()
    try { selectBot(addRoom(title, ids, mode, limit).id) } catch (err) { setError(String(err)) }
  }}>
    <h1 className="text-xl font-semibold">新建协作群聊</h1>
    <label>群聊名称<input className="block w-full rounded border border-line p-2" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    <fieldset><legend>选择 2–6 位已连接的成员</legend>
      {connected.length < 2 && <p className="text-ink-muted">请先连接至少两个 Bot。</p>}
      {connected.map((b) => <label key={b.id} className="flex gap-2 py-1"><input type="checkbox"
        checked={ids.includes(b.id)} disabled={!ids.includes(b.id) && ids.length === 6}
        onChange={(e) => setIds(e.target.checked ? [...ids, b.id] : ids.filter((id) => id !== b.id))} />{b.name}</label>)}
    </fieldset>
    <label>发言模式 <select value={mode} onChange={(e) => setMode(e.target.value as CollabRoom['mode'])}>
      <option value="manual">仅手动 @</option><option value="auto">自主接力讨论</option></select></label>
    <label>每次指令最多发言 <input className="w-14" type="number" min={1} max={24} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /> 轮</label>
    {error && <p role="alert">{error}</p>}
    <Button type="submit" variant="primary" disabled={ids.length < 2}>创建群聊</Button>
  </form>
}

const templates = ['方案评审：请相互审阅方案，列出分歧，由一位成员综合定稿。', '联合调研：请分工查证资料，交叉核实结论与来源。', '共同交付：请协商分工、评审各自的草稿，并推选执笔者交付最终版本。']
export function RoomView({ id }: { id: string }) {
  const room = useRooms((s) => s.rooms.find((r) => r.id === id))
  const speaker = useRooms((s) => s.speakers[id])
  const error = useRooms((s) => s.errors[id])
  const [text, setText] = useState('')
  const transcript = useRef<HTMLDivElement>(null)
  useEffect(() => { transcript.current?.scrollTo(0, transcript.current.scrollHeight) }, [room?.messages.length])
  if (!room) return <CreateRoom />
  const mention = /(?:^|\s)@([^@\n]*)$/u.exec(text)
  return <main className="flex h-full min-h-0 flex-col gap-3 px-5 pb-4">
    <header className="flex items-center justify-between border-b border-line py-3">
      <div><h1 className="font-semibold">{room.title}</h1><p className="text-xs text-ink-muted">{room.members.map((m) => m.name).join(' · ')}</p></div>
      <Button size="sm" disabled={!room.messages.length} onClick={() => {
        const url = URL.createObjectURL(new Blob([roomMarkdown(room)], { type: 'text/markdown' }))
        const link = document.createElement('a')
        link.href = url
        link.download = room.title + '.md'
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }}>{room.finalId ? '导出最终共识' : '导出讨论记录'}</Button>
    </header>
    <div ref={transcript} className="min-h-0 flex-1 overflow-y-auto">
      {room.messages.map((m) => <article key={m.id} className="mb-4"><h2 className="text-sm font-semibold">{m.author}</h2>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.text}</p></article>)}
    </div>
    {speaker && <div role="status" className="flex items-center gap-2 text-sm">@{speaker} 正在回复
      <Button size="sm" onClick={() => stopRoom(id)}>停止全部</Button></div>}
    {error && <p role="alert" className="text-sm text-status-error">{error}</p>}
    <div className="flex flex-wrap gap-2">{templates.map((v) =>
      <Button key={v} size="sm" onClick={() => setText('@' + room.members[0]!.name + ' ' + v)}>{v.split('：')[0]}</Button>)}</div>
    {mention && <div className="flex gap-2">{room.members.filter((m) => m.name.toLowerCase().startsWith(mention[1]!.toLowerCase())).map((m) =>
      <Button size="sm" key={m.botId} onClick={() => setText(text.slice(0, text.lastIndexOf('@')) + '@' + m.name + ' ')}>@{m.name}</Button>)}</div>}
    <form className="flex items-end gap-2" onSubmit={(e) => {
      e.preventDefault()
      if (text.trim()) { void submitBrief(id, text); setText('') }
    }}><textarea className="flex-1 rounded-lg border border-line p-2 text-sm" value={text} rows={3}
      placeholder={room.mode === 'manual' ? '@成员并输入任务' : '输入任务或 @ 指定首位成员'} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" variant="primary" disabled={!text.trim()}>{speaker ? '插话接管' : '发送'}</Button></form>
  </main>
}
