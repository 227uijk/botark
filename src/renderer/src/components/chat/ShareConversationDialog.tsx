import { useEffect, useMemo, useState } from 'react'
import { getPlatform } from '@adapters/platforms'
import { Check, Copy, Globe } from 'lucide-react'
import { getPlatformInspector } from '@/components/info/platformInspector'
import { ArkExportDocSvg } from '@/components/ui/ArkGlyphs'
import { BotAvatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { MarkdownText } from '@/components/chat/MarkdownText'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useBotStore } from '@/store/botStore'
import type { Bot, ChatMessage } from '@/types'

export interface OpenShareEventDetail {
  botId: string
  messageId?: string
}

export function triggerShareConversation(detail: OpenShareEventDetail): void {
  window.dispatchEvent(new CustomEvent<OpenShareEventDetail>('bothub:open-share', { detail }))
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMessageHtml(text: string): string {
  const escaped = escapeHtml(text)
  // Render fenced code blocks & inline formatting cleanly in standalone HTML
  return escaped
    .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const tag = lang ? `<div class="code-lang">${lang}</div>` : ''
      return `<div class="code-wrap">${tag}<pre><code>${code}</code></pre></div>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\n/g, '<br />')
}

export function buildStandaloneShareHtml(bot: Bot, platformName: string, items: ChatMessage[]): string {
  const dateLabel = new Date().toLocaleString()
  const turnsHtml = items
    .map((m) => {
      const isUser = m.role === 'user'
      const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const quote = m.replyQuote
        ? `<div class="quote">↳ ${escapeHtml(m.replyQuote)}</div>`
        : ''
      return `<article class="turn ${isUser ? 'turn-user' : 'turn-bot'}">
  <div class="meta">${isUser ? 'You' : escapeHtml(bot.name)} · ${time}</div>
  ${quote}
  <div class="bubble">${formatMessageHtml(m.text || '')}</div>
</article>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(bot.name)} · 对话共享页面</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f5f2;
    --card: #ffffff;
    --ink: #171717;
    --muted: #6e6d6a;
    --line: rgba(23,23,23,0.09);
    --bubble-bot: #efeeea;
    --bubble-user: #18181b;
    --bubble-user-ink: #fafafa;
    --code-bg: #e7e5e0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #121212;
      --card: #1b1b1c;
      --ink: #f3f3f3;
      --muted: #9a9a9e;
      --line: rgba(255,255,255,0.1);
      --bubble-bot: #242426;
      --bubble-user: #f4f4f5;
      --bubble-user-ink: #141415;
      --code-bg: #161618;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px 20px 64px;
    background: var(--bg);
    color: var(--ink);
    font: 14.5px/1.65 -apple-system, BlinkMacSystemFont, "Inter", "PingFang SC", system-ui, sans-serif;
  }
  .sheet {
    max-width: 780px;
    margin: 0 auto;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 24px;
    overflow: hidden;
    box-shadow: 0 18px 48px -16px rgba(0,0,0,0.12);
  }
  header {
    padding: 22px 28px;
    border-bottom: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .title { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
  .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .badge {
    font-size: 11.5px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--muted);
  }
  main { padding: 24px 28px; display: flex; flex-direction: column; gap: 18px; }
  .turn { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }
  .turn-user { align-items: flex-end; }
  .meta { font-size: 11.5px; color: var(--muted); padding: 0 4px; }
  .quote {
    font-size: 12px;
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 4px 10px;
    max-width: 76%;
  }
  .bubble {
    max-width: 82%;
    padding: 11px 16px;
    border-radius: 18px;
    background: var(--bubble-bot);
    word-break: break-word;
  }
  .turn-user .bubble {
    background: var(--bubble-user);
    color: var(--bubble-user-ink);
  }
  .code-wrap {
    margin: 10px 0;
    border-radius: 12px;
    overflow: hidden;
    background: var(--code-bg);
    border: 1px solid var(--line);
  }
  .code-lang {
    font: 11px ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 5px 12px;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
  }
  pre {
    margin: 0;
    padding: 12px;
    overflow-x: auto;
    font: 12.5px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .inline-code {
    font: 0.9em ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 1px 5px;
    border-radius: 5px;
    background: var(--code-bg);
  }
  footer {
    padding: 14px 28px;
    border-top: 1px solid var(--line);
    font-size: 12px;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div>
        <div class="title">${escapeHtml(bot.name)}</div>
        <div class="sub">${escapeHtml(platformName)} · 共 ${items.length} 条对话记录</div>
      </div>
      <span class="badge">Shared via BotArk</span>
    </header>
    <main>
${turnsHtml}
    </main>
    <footer>
      <span>导出时间 · ${escapeHtml(dateLabel)}</span>
      <span>BotArk Desktop</span>
    </footer>
  </div>
</body>
</html>`
}

export function buildShareMarkdown(bot: Bot, platformName: string, items: ChatMessage[]): string {
  const header = `# ${bot.name}（${platformName}）\n\n`
  const body = items
    .map((m) => {
      const speaker = m.role === 'user' ? '**我**' : `**${bot.name}**`
      const quote = m.replyQuote ? `> 引用：${m.replyQuote}\n\n` : ''
      return `### ${speaker}\n\n${quote}${m.text || ''}`
    })
    .join('\n\n---\n\n')
  return header + body + '\n'
}

export function ShareConversationDialog({
  bot,
  messages
}: {
  bot: Bot
  messages: ChatMessage[]
}) {
  const openWebSessionAt = useBotStore((s) => s.openWebSessionAt)
  const [open, setOpen] = useState(false)
  const [focusMessageId, setFocusMessageId] = useState<string | undefined>()
  const [scope, setScope] = useState<'all' | 'focus'>('all')
  const [copiedMd, setCopiedMd] = useState(false)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenShareEventDetail>).detail
      if (!detail || detail.botId !== bot.id) return
      setFocusMessageId(detail.messageId)
      setScope(detail.messageId ? 'focus' : 'all')
      setOpen(true)
    }
    window.addEventListener('bothub:open-share', onOpen)
    return () => window.removeEventListener('bothub:open-share', onOpen)
  }, [bot.id])

  const platform = getPlatform(bot.platformId)
  const supportsWebShare = getPlatformInspector(bot.platformId).supportsWebSession

  const selectedMessages = useMemo(() => {
    const nonEmpty = messages.filter((m) => Boolean(m.text?.trim()))
    if (scope === 'focus' && focusMessageId) {
      const idx = nonEmpty.findIndex((m) => m.id === focusMessageId)
      if (idx >= 0) {
        const target = nonEmpty[idx]!
        // Include preceding user prompt when sharing an assistant reply so context stays complete.
        const prev = idx > 0 && target.role === 'bot' && nonEmpty[idx - 1]?.role === 'user' ? [nonEmpty[idx - 1]!] : []
        return [...prev, target]
      }
    }
    return nonEmpty
  }, [focusMessageId, messages, scope])

  const handleDownloadHtml = () => {
    const html = buildStandaloneShareHtml(bot, platform.name, selectedMessages)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const slug = bot.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-|-$/g, '') || 'conversation'
    a.href = url
    a.download = `${slug}-share.html`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  const handleCopyMarkdown = () => {
    const md = buildShareMarkdown(bot, platform.name, selectedMessages)
    void navigator.clipboard.writeText(md).then(() => {
      setCopiedMd(true)
      setTimeout(() => setCopiedMd(false), 1600)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="共享对话页面"
      className="w-[min(92vw,580px)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <BotAvatar
              emoji={bot.emoji}
              seed={bot.id}
              avatar={bot.avatar}
              avatarShape={bot.avatarShape}
              avatarColor={bot.avatarColor}
              platformId={bot.platformId}
              size="sm"
            />
            <div>
              <p className="text-[13.5px] font-semibold text-ink">{bot.name}</p>
              <p className="text-[11.5px] text-ink-muted">
                {platform.name} · 已选 {selectedMessages.length} 条消息
              </p>
            </div>
          </div>

          {focusMessageId && (
            <SegmentedControl
              size="xs"
              value={scope}
              onValueChange={setScope}
              options={[
                { value: 'focus', label: '当前问答' },
                { value: 'all', label: `整段对话 (${messages.length})` }
              ]}
            />
          )}
        </div>

        {/* Live Share Page Preview */}
        <div className="max-h-[340px] overflow-y-auto rounded-2xl border border-line/80 bg-sunken/35 p-4">
          {selectedMessages.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-muted">当前会话暂无可分享内容</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedMessages.slice(0, 12).map((m) => {
                const mine = m.role === 'user'
                return (
                  <div key={m.id} className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                    {m.replyQuote && (
                      <div className="mb-1 max-w-[80%] truncate rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-muted">
                        ↳ {m.replyQuote}
                      </div>
                    )}
                    <div
                      className={
                        mine
                          ? 'max-w-[82%] rounded-2xl bg-bubble-user px-3.5 py-2 text-[13px] leading-5 text-main'
                          : 'max-w-[86%] rounded-2xl bg-surface px-3.5 py-2.5 text-[13px] leading-5 text-ink ring-1 ring-line/60'
                      }
                    >
                      {mine ? m.text : <MarkdownText text={m.text} />}
                    </div>
                  </div>
                )
              })}
              {selectedMessages.length > 12 && (
                <p className="text-center text-[11.5px] text-ink-muted">
                  其余 {selectedMessages.length - 12} 条消息将完整包含在导出的共享页面中
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {supportsWebShare ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false)
                openWebSessionAt(null)
              }}
            >
              <Globe className="size-3.5" />
              在原生网页生成云端链接
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={selectedMessages.length === 0}
              onClick={handleCopyMarkdown}
            >
              {copiedMd ? <Check className="size-3.5 text-status-online" /> : <Copy className="size-3.5" />}
              {copiedMd ? '已复制 Markdown' : '复制 Markdown'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={selectedMessages.length === 0}
              onClick={handleDownloadHtml}
            >
              <ArkExportDocSvg className="size-3.5" />
              导出共享网页 (.html)
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
