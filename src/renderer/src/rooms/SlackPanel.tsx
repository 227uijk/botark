import { useEffect, useState } from 'react'
import type { SlackRequest, SlackState } from '@shared/slack'
import { getBridge } from '@/lib/bridge'
import { Button } from '@/components/ui/Button'

export function SlackPanel({ id }: { id: string }) {
  const bridge = getBridge()?.slack
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<SlackState>()
  const [app, setApp] = useState('')
  const [bot, setBot] = useState('')
  const [channel, setChannel] = useState('')
  const [thread, setThread] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    if (open && bridge) void bridge.request({ op: 'status' }).then((next) => { if (live) setState(next) })
      .catch((e) => { if (live) setError(String(e)) })
    return () => { live = false }
  }, [bridge, open])
  if (!bridge) return null
  const binding = state?.bindings.find((b) => b.roomId === id)
  async function run(req: SlackRequest) {
    setBusy(true)
    setError('')
    try {
      setState(await bridge!.request(req))
      if (req.op === 'connect') { setApp(''); setBot('') }
    } catch (e) { setError(String(e instanceof Error ? e.message : e)) }
    finally { setBusy(false) }
  }
  return <div className="shrink-0 text-xs">
    <button aria-expanded={open} onClick={() => setOpen(!open)}>Slack 桥接{binding ? ' · ' + binding.channel : ''}</button>
    {open && <fieldset className="flex flex-wrap items-center gap-2 rounded border border-line p-2" disabled={busy}>
      {!state?.connected && <>
        <p className="w-full">开启 Slack Socket Mode，订阅 message.channels、message.groups 和 app_mention，将应用邀请到目标频道。应用需要 chat:write 和相应频道的历史读取权限。</p>
        {!state?.saved && <><input aria-label="App Token" type="password" autoComplete="off" placeholder="App Token (xapp-)" value={app} onChange={(e) => setApp(e.target.value)} />
          <input aria-label="Bot Token" type="password" autoComplete="off" placeholder="Bot Token (xoxb-)" value={bot} onChange={(e) => setBot(e.target.value)} /></>}
        <Button size="sm" disabled={!state?.saved && (!app || !bot)} onClick={() => void run({ op: 'connect', appToken: app || undefined, botToken: bot || undefined })}>连接 Slack</Button>
      </>}
      {state?.connected && <Button size="sm" onClick={() => void run({ op: 'disconnect' })}>断开 Slack</Button>}
      {state?.saved && !state.connected && <Button size="sm" onClick={() => void run({ op: 'forget' })}>清除凭据与绑定</Button>}
      {binding ? <><span>{binding.channel} {binding.thread ?? '整个频道'}</span>
        <Button size="sm" onClick={() => void run({ op: 'unbind', roomId: id })}>解除绑定</Button></> :
        state?.connected && <>
          <input aria-label="Slack 频道 ID" placeholder="频道 ID" value={channel} onChange={(e) => setChannel(e.target.value)} />
          <input aria-label="Slack 线程时间戳" placeholder="线程 ts（可选）" value={thread} onChange={(e) => setThread(e.target.value)} />
          <Button size="sm" disabled={!channel.trim()} onClick={() => void run({ op: 'bind', roomId: id, channel: channel.trim(), thread: thread.trim() || undefined })}>绑定并同步新消息</Button>
          <p className="w-full">绑定整个频道时，每个新的 Slack 话题独立讨论。在 Slack 输入 @成员名称即可接力。</p>
        </>}
      {error && <p role="alert" className="w-full text-status-error">{error}</p>}
    </fieldset>}
  </div>
}
