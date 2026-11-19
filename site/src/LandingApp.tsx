import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Apple,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Lock,
  Monitor,
  PanelRight,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Zap
} from 'lucide-react'
import { GrokBotMark } from '@/components/ui/GrokBotMark'
import {
  DEMO_BOTS,
  MASCOT_LAB_PRESETS,
  PLATFORM_ICONS,
  RELEASE_URLS,
  type Lang,
  type PlatformKey
} from './data'

type StageMode = 'hopping' | 'converging' | 'ready' | 'chaos'
type MascotMood = 'idle' | 'happy' | 'working' | 'thinking' | 'sleeping'
type ImportMethodKey = 'window' | 'browser' | 'token' | 'batch'

const HOP_AGENTS: Array<{
  key: PlatformKey
  name: string
  chip: { zh: string; en: string }
  hopClass: string
  convergeTransform: string
  glow: string
  shape: 'blob' | 'sparkle' | 'clover' | 'crystal'
  color: 'green' | 'violet' | 'blue' | 'cyan'
}> = [
  {
    key: 'grok',
    name: 'Grok Bot',
    chip: { zh: '单号 4 个 Bot 就绪', en: '4 Bots Auto-Synced' },
    hopClass: 'hop-tl',
    convergeTransform: 'translate3d(-18px, -12px, 0) scale(0.36)',
    glow: 'from-emerald-500/25 to-cyan-500/10 border-emerald-400/35',
    shape: 'blob',
    color: 'green'
  },
  {
    key: 'muse',
    name: 'Meta Muse',
    chip: { zh: 'Noise 加密通道已连', en: 'Noise WSS Ready' },
    hopClass: 'hop-tr',
    convergeTransform: 'translate3d(18px, -12px, 0) scale(0.36)',
    glow: 'from-violet-500/25 to-fuchsia-500/10 border-violet-400/35',
    shape: 'sparkle',
    color: 'violet'
  },
  {
    key: 'dot',
    name: 'ChatGPT Dot',
    chip: { zh: 'Orbit 记忆已挂载', en: 'Orbit Memory Mounted' },
    hopClass: 'hop-bl',
    convergeTransform: 'translate3d(-18px, 12px, 0) scale(0.36)',
    glow: 'from-blue-500/25 to-indigo-500/10 border-blue-400/35',
    shape: 'clover',
    color: 'blue'
  },
  {
    key: 'hark',
    name: 'Hark',
    chip: { zh: '云端巡检在线', en: 'Browser VM Online' },
    hopClass: 'hop-br',
    convergeTransform: 'translate3d(18px, 12px, 0) scale(0.36)',
    glow: 'from-amber-500/25 to-teal-500/10 border-amber-400/35',
    shape: 'crystal',
    color: 'cyan'
  }
]

export function LandingApp() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
      return 'en'
    }
    return 'zh'
  })

  // Hero kinetic stage choreography: hopping (0..1.15s) -> converging (1.15..1.65s) -> ready
  const [stageMode, setStageMode] = useState<StageMode>('hopping')
  const [replayNonce, setReplayNonce] = useState(0)
  const timersRef = useRef<number[]>([])

  const clearStageTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }, [])

  const playConvergenceIntro = useCallback(() => {
    clearStageTimers()
    setReplayNonce((n) => n + 1)
    setStageMode('hopping')
    const t1 = window.setTimeout(() => setStageMode('converging'), 1180)
    const t2 = window.setTimeout(() => setStageMode('ready'), 1680)
    timersRef.current.push(t1, t2)
  }, [clearStageTimers])

  useEffect(() => {
    // Respect prefers-reduced-motion or `?instant=1`
    const params = new URLSearchParams(window.location.search)
    if (
      params.get('instant') === '1' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setStageMode('ready')
      return
    }
    playConvergenceIntro()
    return clearStageTimers
  }, [playConvergenceIntro, clearStageTimers])

  // Interactive Hero BotArk Workspace state
  const [selectedBotId, setSelectedBotId] = useState<string>(DEMO_BOTS[0]!.id)
  const [workbenchOpen, setWorkbenchOpen] = useState(true)
  const [heroPoke, setHeroPoke] = useState(0)
  const [ctaHovered, setCtaHovered] = useState(false)

  // Live streaming demo inside Hero Workspace
  const [streamedTurn, setStreamedTurn] = useState<{
    botId: string
    prompt: string
    tool: string
    reply: string
    streaming: boolean
  } | null>(null)
  const streamIntervalRef = useRef<number | null>(null)

  const activeBot = useMemo(
    () => DEMO_BOTS.find((b) => b.id === selectedBotId) ?? DEMO_BOTS[0]!,
    [selectedBotId]
  )

  const handleRunQuickPrompt = (idx: number) => {
    const qp = activeBot.quickPrompts[idx]
    if (!qp) return
    if (streamIntervalRef.current) window.clearInterval(streamIntervalRef.current)
    const fullText = qp.reply[lang]
    const promptText = qp.label[lang].replace(/^[^\s]+\s*/, '')
    const toolText = qp.replyTool[lang]
    let cursor = 0
    setStreamedTurn({
      botId: activeBot.id,
      prompt: promptText,
      tool: toolText,
      reply: '',
      streaming: true
    })
    streamIntervalRef.current = window.setInterval(() => {
      cursor += 3
      if (cursor >= fullText.length) {
        if (streamIntervalRef.current) window.clearInterval(streamIntervalRef.current)
        setStreamedTurn({
          botId: activeBot.id,
          prompt: promptText,
          tool: toolText,
          reply: fullText,
          streaming: false
        })
      } else {
        setStreamedTurn({
          botId: activeBot.id,
          prompt: promptText,
          tool: toolText,
          reply: fullText.slice(0, cursor),
          streaming: true
        })
      }
    }, 24)
  }

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) window.clearInterval(streamIntervalRef.current)
    }
  }, [])

  // Physical Cmd+I / Ctrl+I shortcut toggles the right-side workbench live!
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setWorkbenchOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Scroll reveal observer
  useEffect(() => {
    const els = document.querySelectorAll('.reveal-section')
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        }
      },
      { threshold: 0.1 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Bento Interactive Micro-Demo 1: Grok 1-Account -> Multi-Bot Roster Pop
  const [grokRosterCount, setGrokRosterCount] = useState(4)
  const [grokSyncKey, setGrokSyncKey] = useState(0)
  const triggerGrokRosterDemo = () => {
    setGrokRosterCount(0)
    setGrokSyncKey((k) => k + 1)
    ;[1, 2, 3, 4].forEach((n, i) => {
      window.setTimeout(() => setGrokRosterCount(n), 140 + i * 160)
    })
  }

  // Bento Interactive Micro-Demo 2: Import Methods
  const [importTab, setImportTab] = useState<ImportMethodKey>('browser')

  // Bento Interactive Micro-Demo 3: Fail-Closed Proxy Guard
  const [proxyBroken, setProxyBroken] = useState(false)

  // Mascot Motion Lab Playground
  const [mascotMood, setMascotMood] = useState<MascotMood>('happy')
  const [mascotPokes, setMascotPokes] = useState<Record<string, number>>({})

  // Copy git clone snippet
  const [copiedClone, setCopiedClone] = useState(false)
  const copyCloneCmd = () => {
    void navigator.clipboard?.writeText('git clone https://github.com/qybaihe/botark.git')
    setCopiedClone(true)
    window.setTimeout(() => setCopiedClone(false), 2000)
  }

  const isWin = useMemo(
    () => typeof navigator !== 'undefined' && /win/i.test(navigator.userAgent),
    []
  )

  const L = (zh: string, en: string) => (lang === 'zh' ? zh : en)

  return (
    <div className="ark-backdrop relative min-h-screen text-slate-100 selection:bg-blue-500/30 selection:text-white">
      <div className="ark-grid pointer-events-none fixed inset-0 z-0" />

      {/* =====================================================================
       * Floating Glassmorphic Top Navigation
       * =================================================================== */}
      <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-[#070a12]/78 px-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <a href="#" className="flex items-center gap-2.5 text-white no-underline">
            <img src="./logo.png" alt="BotArk" className="size-8 rounded-lg object-contain" />
            <span className="text-[16px] font-bold tracking-tight">BotArk</span>
            <span className="hidden rounded-full border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-300 sm:inline-block">
              v0.7.0
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-[13.5px] font-medium text-slate-300 md:flex">
            <a href="#stage" className="transition hover:text-white">
              {L('交互工作台', 'Live Stage')}
            </a>
            <a href="#bento" className="transition hover:text-white">
              {L('核心设计', 'Architecture')}
            </a>
            <a href="#motion-lab" className="transition hover:text-white">
              {L('灵动工坊', 'Motion Lab')}
            </a>
            <a href="#platforms" className="transition hover:text-white">
              {L('支持平台', 'Platforms')}
            </a>
            <a href="#download" className="transition hover:text-white">
              {L('下载安装', 'Download')}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[12px] font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              <Globe className="size-3.5 text-blue-400" />
              <span>{lang === 'zh' ? 'EN' : '中文'}</span>
            </button>

            <a
              href={RELEASE_URLS.repo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3 text-[12.5px] font-semibold text-white transition hover:border-white/25 hover:bg-white/12"
            >
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* =====================================================================
       * Hero Headline + Living 3D Mascot Pill + Download Bar
       * =================================================================== */}
      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 text-center sm:px-6 sm:pt-16">
          {/* Interactive Living 3D Mascot Pill (follows pointer across the entire hero!) */}
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.045] py-1.5 pr-4 pl-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => setHeroPoke((n) => n + 1)}
              title={L('点我翻滚一下！', 'Click to poke me!')}
              className="grid size-9 cursor-pointer place-items-center rounded-full bg-white/8 transition hover:scale-105 active:scale-95"
            >
              <GrokBotMark
                seed="botark-hero-spirit"
                shape="blob"
                color="black"
                grokState={
                  streamedTurn?.streaming
                    ? 'working'
                    : ctaHovered
                      ? 'happy'
                      : 'idle'
                }
                followPointer
                pokeSignal={heroPoke}
                sizePx={30}
              />
            </button>
            <span className="text-[13px] font-medium text-slate-200">
              {L(
                '把 Muse、ChatGPT Dot、Hark、Hermes 像 Grok Bot 一样收进同一个原生桌面端',
                'Use Meta Muse, ChatGPT Dot, Hark & Hermes just like Grok Bot — in one native app'
              )}
            </span>
            <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 sm:inline">
              {L('Apple 公证直装', 'Apple Notarized')}
            </span>
          </div>

          <h1 className="mx-auto max-w-4xl text-[38px] leading-[1.08] font-extrabold tracking-[-0.038em] sm:text-[58px] md:text-[66px]">
            <span className="ark-gradient-text">
              {L('所有个人智能体，', 'Every Personal Agent.')}
            </span>
            <br />
            <span className="text-white">
              {L('跃入同一艘桌面方舟。', 'Aboard One Native Ark.')}
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-slate-300/90 sm:text-[18px]">
            {L(
              '告别十几个串号的无痕浏览器窗口。在一个轻快克制的 macOS / Windows 原生工作台里，同时驾驭 Grok Bot、Meta Muse、ChatGPT Dot、Hark 与开源 Hermes —— 多号隔离、单号多 Bot 自动展开、右侧操作台随叫随到。',
              'Ditch the dozen incognito browser profiles. Run Grok Bot, Meta Muse, ChatGPT Dot, Hark, and open-source Hermes side by side on macOS & Windows with sandboxed multi-account isolation and a tailored right-side workbench.'
            )}
          </p>

          {/* Primary Download CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={isWin ? RELEASE_URLS.winX64 : RELEASE_URLS.macArm}
              onMouseEnter={() => setCtaHovered(true)}
              onMouseLeave={() => setCtaHovered(false)}
              className="group inline-flex h-12 items-center gap-2.5 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 px-6 text-[15px] font-semibold text-white shadow-[0_12px_32px_-8px_rgba(37,99,235,0.65),inset_0_1px_0_rgba(255,255,255,0.3)] transition hover:-translate-y-0.5 hover:from-blue-400 hover:to-blue-500"
            >
              {isWin ? <Monitor className="size-4.5" /> : <Apple className="size-4.5" />}
              <span>
                {isWin
                  ? L('下载 Windows 安装包 (x64)', 'Download for Windows (x64)')
                  : L('下载 macOS 版 (Apple 芯片)', 'Download for Mac (Apple Silicon)')}
              </span>
              <Download className="size-4 opacity-80 transition group-hover:translate-y-0.5" />
            </a>

            <a
              href={isWin ? RELEASE_URLS.macArm : RELEASE_URLS.macIntel}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/14 bg-white/[0.05] px-5 text-[14px] font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/10"
            >
              <span>
                {isWin
                  ? L('macOS Apple 芯片 (.dmg)', 'macOS Apple Silicon (.dmg)')
                  : L('macOS Intel 版 (.dmg)', 'macOS Intel (.dmg)')}
              </span>
            </a>

            {!isWin && (
              <a
                href={RELEASE_URLS.winX64}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/14 bg-white/[0.05] px-5 text-[14px] font-semibold text-slate-200 transition hover:border-white/25 hover:bg-white/10"
              >
                <Monitor className="size-4 text-sky-400" />
                <span>{L('Windows 版 (.exe)', 'Windows (.exe)')}</span>
              </a>
            )}
          </div>

          <p className="mt-3 text-[12px] text-slate-400">
            {L(
              'MIT 开源免费 · macOS 双架构均通过 Apple Developer ID 官方签名与公证 · 纯本地钥匙串加密零遥测',
              '100% MIT Open Source · Signed & Notarized by Apple · Local OS Keychain Vault · Zero Telemetry'
            )}
          </p>
        </section>

        {/* ===================================================================
         * Interactive Stage Controls + Hop-In -> Live 3-Column BotArk Window
         * ================================================================= */}
        <section id="stage" className="mx-auto max-w-6xl px-4 pt-2 pb-20 sm:px-6">
          {/* Stage Mode Switcher Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                type="button"
                onClick={() => {
                  clearStageTimers()
                  setStageMode('chaos')
                }}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition ${
                  stageMode === 'chaos'
                    ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {L('🌪️ 用之前：12 个散乱窗口', '🌪️ Before: 12 Messy Tabs')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (stageMode === 'chaos') {
                    playConvergenceIntro()
                  } else {
                    clearStageTimers()
                    setStageMode('ready')
                  }
                }}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition ${
                  stageMode !== 'chaos'
                    ? 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {L('✨ 用 BotArk：一舱统合', '✨ With BotArk: Unified')}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playConvergenceIntro}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-1.5 text-[12.5px] font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/10"
              >
                <Play className="size-3.5 text-emerald-400" />
                <span>{L('重播四灵跃入动画', 'Replay Agent Hop-In')}</span>
              </button>
              <span className="hidden items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11.5px] text-slate-400 sm:inline-flex">
                {L('按', 'Press')}{' '}
                <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">⌘I</kbd>{' '}
                {L('开关右侧操作台', 'to toggle workbench')}
              </span>
            </div>
          </div>

          {/* ================= STAGE CONTAINER ================= */}
          <div className="relative min-h-[540px] w-full">
            {/* MODE 1: HOPPING & CONVERGING CHOREOGRAPHY */}
            {(stageMode === 'hopping' || stageMode === 'converging') && (
              <div
                key={`intro-${replayNonce}`}
                className="ark-card relative flex min-h-[540px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl p-8"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.18),transparent_62%)]" />

                {/* Central BotArk Core Target */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`relative grid size-24 place-items-center rounded-[26px] border border-white/20 bg-[#0d1322]/90 shadow-[0_0_60px_rgba(59,130,246,0.45)] transition-transform duration-500 ${
                      stageMode === 'converging' ? 'scale-110' : 'scale-95'
                    }`}
                  >
                    <img src="./logo.png" alt="BotArk Core" className="size-20 object-contain" />
                    {stageMode === 'converging' && (
                      <span className="ark-shockwave pointer-events-none absolute left-1/2 top-1/2 size-32 rounded-full border-2 border-cyan-300/70 shadow-[0_0_45px_rgba(139,92,246,0.8)]" />
                    )}
                  </div>
                  <p className="mt-4 font-mono text-[12.5px] tracking-wider text-blue-200/90 uppercase">
                    {stageMode === 'hopping'
                      ? L('四大智能体正跃入方舟…', 'Personal Agents Hopping In…')
                      : L('独立沙盒就位 · 展开三栏工作台…', 'Isolating Partitions · Unfolding Ark…')}
                  </p>
                </div>

                {/* Four Parabolic Hopping 3D Agent Pods */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {HOP_AGENTS.map((ag) => (
                    <div
                      key={ag.key}
                      style={
                        stageMode === 'converging'
                          ? {
                              transform: ag.convergeTransform,
                              opacity: 0,
                              transition:
                                'transform 460ms cubic-bezier(0.5, 0, 0.2, 1), opacity 420ms ease'
                            }
                          : undefined
                      }
                      className={`absolute flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${ag.glow} px-4 py-3 shadow-2xl backdrop-blur-xl ${
                        stageMode === 'hopping' ? ag.hopClass : ''
                      }`}
                    >
                      <GrokBotMark
                        seed={`hop-${ag.key}-${replayNonce}`}
                        shape={ag.shape}
                        color={ag.color}
                        grokState="happy"
                        sizePx={46}
                      />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={PLATFORM_ICONS[ag.key]}
                            alt={ag.name}
                            className="size-4 rounded-sm object-contain"
                          />
                          <span className="text-[14px] font-bold text-white">{ag.name}</span>
                        </div>
                        <span className="text-[11.5px] text-slate-200/90">{ag.chip[lang]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MODE 2: CHAOS BROWSER WINDOWS ("BEFORE BOTARK") */}
            {stageMode === 'chaos' && (
              <div className="ark-card relative flex min-h-[540px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.13),transparent_65%)]" />

                {/* Scattered chaotic browser windows */}
                {[
                  {
                    pos: 'top-6 left-6 -rotate-3',
                    url: 'muse.ai — Incognito #4',
                    err: L('⚠️ Cookie 已串号，需重新收邮箱验证码', '⚠️ Session collision — OTP required again'),
                    shape: 'sparkle' as const,
                    color: 'violet' as const
                  },
                  {
                    pos: 'top-8 right-8 rotate-3',
                    url: 'grok.com — Profile 2',
                    err: L('⚠️ 切错工作号，另外 5 个 Bot 找不到标签页', '⚠️ Wrong account — 5 bots buried in tabs'),
                    shape: 'blob' as const,
                    color: 'orange' as const
                  },
                  {
                    pos: 'bottom-8 left-10 rotate-2',
                    url: 'chatgpt.com/dots — Tab #39',
                    err: L('⚠️ 全局代理切换导致连接中断，记忆丢失', '⚠️ Global proxy switch dropped connection'),
                    shape: 'clover' as const,
                    color: 'red' as const
                  },
                  {
                    pos: 'bottom-7 right-10 -rotate-2',
                    url: 'app.hark.com — Window #7',
                    err: L('⚠️ 登录态过期未感知，消息发送失败', '⚠️ Stale cookie — message failed to send'),
                    shape: 'crystal' as const,
                    color: 'yellow' as const
                  }
                ].map((win, idx) => (
                  <div
                    key={idx}
                    className={`absolute hidden w-76 rounded-2xl border border-rose-400/25 bg-[#111624]/92 p-3.5 shadow-2xl md:block ${win.pos}`}
                  >
                    <div className="mb-2 flex items-center gap-1.5 border-b border-white/8 pb-2">
                      <span className="size-2.5 rounded-full bg-rose-500/80" />
                      <span className="size-2.5 rounded-full bg-amber-400/80" />
                      <span className="size-2.5 rounded-full bg-emerald-400/40" />
                      <span className="ml-1.5 truncate font-mono text-[11px] text-slate-400">
                        {win.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <GrokBotMark
                        seed={`chaos-${idx}`}
                        shape={win.shape}
                        color={win.color}
                        grokState="blocked"
                        followPointer
                        sizePx={38}
                      />
                      <p className="text-left text-[12px] leading-snug text-rose-200/90">{win.err}</p>
                    </div>
                  </div>
                ))}

                {/* Center Rescue Callout */}
                <div className="relative z-10 max-w-md rounded-3xl border border-white/15 bg-[#090d18]/95 p-7 text-center shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-xl">
                  <p className="text-[13px] font-semibold tracking-wide text-rose-300 uppercase">
                    {L('多平台重度玩家的日常噩梦', 'Tab & Profile Overload')}
                  </p>
                  <h3 className="mt-2 text-[22px] font-bold text-white">
                    {L(
                      '4 家平台 × 3 个账号 = 12 个乱飞的无痕窗口',
                      '4 Platforms × 3 Accounts = 12 Fragile Windows'
                    )}
                  </h3>
                  <p className="mt-2 text-[13.5px] text-slate-300">
                    {L(
                      '点击下方按钮，看它们如何跃入同一个隔离沙盒的原生桌面方舟：',
                      'Click below to watch every agent hop into one isolated native workspace:'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={playConvergenceIntro}
                    className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 px-6 py-3 text-[14px] font-semibold text-white shadow-lg transition hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <Sparkles className="size-4" />
                    <span>{L('⚡ 一键跃入 BotArk 方舟', '⚡ Hop Into BotArk Now')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 3: LIVE INTERACTIVE 3-COLUMN BOTARK DESKTOP WORKSPACE */}
            {stageMode === 'ready' && (
              <div className="ark-window-unfold overflow-hidden rounded-[26px] border border-white/14 bg-[#0b101b]/95 shadow-[0_35px_90px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.18)]">
                {/* Native macOS Titlebar */}
                <div className="flex h-11 items-center justify-between border-b border-white/8 bg-[#0e1422] px-4">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-[#ff5f57]" />
                    <span className="size-3 rounded-full bg-[#febc2e]" />
                    <span className="size-3 rounded-full bg-[#28c840]" />
                    <span className="ml-3 hidden font-mono text-[11.5px] text-slate-400 sm:inline">
                      BotArk — {L('可点击体验的实时交互预览', 'Interactive Live Workspace Demo')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      <ShieldCheck className="size-3" />
                      {L('钥匙串与沙盒隔离已启用', 'Keychain & Partition Isolated')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWorkbenchOpen((v) => !v)}
                      title={L('展开 / 收起右侧专属操作台 (⌘I)', 'Toggle Right Workbench (⌘I)')}
                      className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-[11.5px] font-medium transition ${
                        workbenchOpen
                          ? 'border-blue-400/40 bg-blue-500/20 text-blue-200'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <PanelRight className="size-3.5" />
                      <span>{L('操作台', 'Workbench')}</span>
                      <kbd className="font-mono text-[10px] opacity-75">⌘I</kbd>
                    </button>
                  </div>
                </div>

                {/* Three-Column Body */}
                <div
                  className={`grid min-h-[500px] grid-cols-1 divide-y divide-white/8 lg:divide-x lg:divide-y-0 ${
                    workbenchOpen
                      ? 'lg:grid-cols-[248px_1fr_292px]'
                      : 'lg:grid-cols-[248px_1fr]'
                  }`}
                >
                  {/* COLUMN 1: Bot-First Grouped Left Sidebar */}
                  <aside className="flex flex-col justify-between bg-[#090d17] p-3">
                    <div>
                      <div className="mb-2.5 flex items-center justify-between px-1.5">
                        <span className="text-[11.5px] font-semibold tracking-wide text-slate-400 uppercase">
                          {L('全部智能体 (5)', 'All Agents (5)')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-300">
                          ⌘K
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        {DEMO_BOTS.map((bot) => {
                          const selected = bot.id === activeBot.id
                          const isStreamingThis =
                            streamedTurn?.botId === bot.id && streamedTurn.streaming
                          return (
                            <button
                              key={bot.id}
                              type="button"
                              onClick={() => {
                                setSelectedBotId(bot.id)
                                setStreamedTurn(null)
                              }}
                              className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                                selected
                                  ? 'bg-blue-500/16 text-white ring-1 ring-blue-400/35'
                                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              <div className="relative shrink-0">
                                <GrokBotMark
                                  seed={`sidebar-${bot.id}`}
                                  shape={bot.shape}
                                  color={bot.color}
                                  grokState={
                                    isStreamingThis
                                      ? 'working'
                                      : selected
                                        ? 'happy'
                                        : 'idle'
                                  }
                                  followPointer={selected}
                                  sizePx={30}
                                />
                                <img
                                  src={PLATFORM_ICONS[bot.platform]}
                                  alt={bot.platformLabel}
                                  className="absolute -right-1 -bottom-0.5 size-3.5 rounded-[4px] bg-[#0b101b] p-[1px] ring-1 ring-white/20"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate text-[13px] font-semibold">
                                    {bot.name[lang]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                  <span className="size-1.5 rounded-full bg-emerald-400" />
                                  <span className="truncate">{bot.accountHandle}</span>
                                </div>
                              </div>

                              {bot.badge && (
                                <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                  {bot.badge[lang]}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-300">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-400" />
                        {L('设置与账号 · 4 平台在线', 'Accounts · 4 Online')}
                      </span>
                      <span className="font-mono text-[10.5px] text-slate-400">SOCKS5 ✓</span>
                    </div>
                  </aside>

                  {/* COLUMN 2: Center Streaming Conversation */}
                  <div className="flex flex-col justify-between bg-[#0c111e] p-4 sm:p-5">
                    <div>
                      {/* Active Bot Header */}
                      <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
                        <div className="flex items-center gap-2.5">
                          <GrokBotMark
                            seed={`header-${activeBot.id}`}
                            shape={activeBot.shape}
                            color={activeBot.color}
                            grokState={
                              streamedTurn?.botId === activeBot.id && streamedTurn.streaming
                                ? 'working'
                                : 'happy'
                            }
                            followPointer
                            sizePx={28}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-bold text-white">
                                {activeBot.name[lang]}
                              </span>
                              <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-300">
                                {activeBot.platformLabel}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-slate-400">
                              persist:account_{activeBot.platform} · {activeBot.accountHandle}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="space-y-3.5">
                        {activeBot.messages.map((m, idx) =>
                          m.role === 'user' ? (
                            <div key={idx} className="flex justify-end">
                              <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-left text-[13.5px] leading-relaxed text-white shadow-sm">
                                {m.text[lang]}
                              </div>
                            </div>
                          ) : (
                            <div key={idx} className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                <GrokBotMark
                                  seed={`msg-${activeBot.id}-${idx}`}
                                  shape={activeBot.shape}
                                  color={activeBot.color}
                                  sizePx={24}
                                />
                              </div>
                              <div className="max-w-[88%] space-y-1.5 text-left">
                                {m.tool && (
                                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-300">
                                    <Check className="size-3" />
                                    <span>{m.tool[lang]}</span>
                                  </div>
                                )}
                                <div className=" whitespace-pre-line rounded-2xl rounded-tl-sm border border-white/8 bg-white/[0.045] px-4 py-2.5 text-[13.5px] leading-relaxed text-slate-100">
                                  {m.text[lang]}
                                </div>
                              </div>
                            </div>
                          )
                        )}

                        {/* Interactive Streamed Turn */}
                        {streamedTurn && streamedTurn.botId === activeBot.id && (
                          <>
                            <div className="flex justify-end">
                              <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-left text-[13.5px] text-white">
                                {streamedTurn.prompt}
                              </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">
                                <GrokBotMark
                                  seed={`stream-${activeBot.id}`}
                                  shape={activeBot.shape}
                                  color={activeBot.color}
                                  grokState={streamedTurn.streaming ? 'working' : 'happy'}
                                  sizePx={24}
                                />
                              </div>
                              <div className="max-w-[88%] space-y-1.5 text-left">
                                <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 font-mono text-[11px] text-blue-200">
                                  <RefreshCw
                                    className={`size-3 ${streamedTurn.streaming ? 'animate-spin' : ''}`}
                                  />
                                  <span>{streamedTurn.tool}</span>
                                </div>
                                <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-4 py-2.5 text-[13.5px] leading-relaxed text-white">
                                  {streamedTurn.reply}
                                  {streamedTurn.streaming && (
                                    <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-blue-400 align-middle" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Interactive Quick-Try Prompt Bar */}
                    <div className="mt-5 pt-3">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">
                          {L('点击试发一条指令：', 'Try a live prompt:')}
                        </span>
                        {activeBot.quickPrompts.map((qp, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleRunQuickPrompt(idx)}
                            className="cursor-pointer rounded-full border border-blue-400/30 bg-blue-500/12 px-3 py-1 text-[12px] font-medium text-blue-200 transition hover:border-blue-300/60 hover:bg-blue-500/22"
                          >
                            {qp.label[lang]}
                          </button>
                        ))}
                      </div>
                      <div className="flex h-10 items-center justify-between rounded-xl border border-white/10 bg-[#080c15] px-3.5 text-[12.5px] text-slate-400">
                        <span>
                          {L(
                            `给 ${activeBot.name.zh} 发消息，或拖拽文件附件…`,
                            `Message ${activeBot.name.en} or drop attachments…`
                          )}
                        </span>
                        <span className="rounded-md bg-white/8 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                          ↵
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: Tailored Right-Side Workbench (⌘I) */}
                  {workbenchOpen && (
                    <aside className="flex flex-col gap-3 bg-[#090d17] p-3.5 text-left">
                      <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                        <div>
                          <span className="text-[12.5px] font-bold text-white">
                            {L('右侧专属操作台', 'Native Workbench')}
                          </span>
                          <p className="font-mono text-[10.5px] text-cyan-300/90">
                            {activeBot.workbench.protocolBadge}
                          </p>
                        </div>
                        <img
                          src={PLATFORM_ICONS[activeBot.platform]}
                          alt={activeBot.platformLabel}
                          className="size-5 rounded-md object-contain"
                        />
                      </div>

                      {activeBot.workbench.cards.map((card, cIdx) => (
                        <div
                          key={cIdx}
                          className="rounded-xl border border-white/8 bg-white/[0.035] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-slate-200">
                              {card.title[lang]}
                            </span>
                            <span className="shrink-0 whitespace-nowrap rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                              {card.tag[lang]}
                            </span>
                          </div>
                          <ul className="space-y-1.5 text-[11.5px] text-slate-300/90">
                            {card.items.map((item, iIdx) => (
                              <li
                                key={iIdx}
                                className="rounded-lg bg-black/25 px-2.5 py-1.5 leading-snug"
                              >
                                {item[lang]}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </aside>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================
         * Interactive Bento Architecture Grid
         * ================================================================= */}
        <section id="bento" className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <span className="font-mono text-[12px] font-semibold tracking-wider text-blue-400 uppercase">
              {L('Designed for Heavy Multi-Agent Users', 'Built for Daily Drivers')}
            </span>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-white sm:text-[40px]">
              {L(
                '不是简单的网页套壳，而是原生重构的工作流。',
                'Not a web wrapper. A native command deck.'
              )}
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            {/* BENTO 1: Grok 1-Account -> Multi-Bot Interactive Pop Demo */}
            <div className="ark-card ark-card-hover flex flex-col justify-between rounded-3xl p-6 lg:col-span-7">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-300">
                    <Zap className="size-3.5" />
                    {L('Grok 单号多 Bot 自动展开', '1 Grok Account → Every Bot')}
                  </span>
                  <button
                    type="button"
                    onClick={triggerGrokRosterDemo}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-white/15"
                  >
                    <RefreshCw className="size-3.5 text-emerald-300" />
                    <span>{L('点此模拟一键登录展开', 'Simulate 1-Click Sync')}</span>
                  </button>
                </div>

                <h3 className="mt-4 text-[22px] font-bold text-white">
                  {L(
                    '登录 1 次 Grok 账号，名下全部 Bot 自动列队跳入侧栏',
                    'Sign into one Grok account — watch every bot hop into your sidebar'
                  )}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
                  {L(
                    'Grok Bot 一个账号下往往养着好几个不同职责的助手与多智能体群聊房间。BotArk 登录一次就会自动拉取完整名单平铺到左侧，还能直接在已有账号下秒建新 Bot。',
                    'One Grok account owns many specialized agents and multi-bot rooms. BotArk syncs your entire roster into individual sidebar entries automatically, and lets you spin up new bots in place.'
                  )}
                </p>
              </div>

              <div
                key={grokSyncKey}
                className="mt-6 grid gap-2.5 sm:grid-cols-2"
              >
                {[
                  {
                    name: L('代码审查官', 'PR Reviewer'),
                    desc: L('Connect-RPC · 自动巡检', 'Connect-RPC · Auto-audit'),
                    shape: 'blob' as const,
                    color: 'green' as const
                  },
                  {
                    name: L('实时市场雷达', 'Market Radar'),
                    desc: L('X 舆情监控 · 定时早报', 'Live X Pulse · Daily digest'),
                    shape: 'gem' as const,
                    color: 'orange' as const
                  },
                  {
                    name: L('论文精读搭子', 'Paper Reader'),
                    desc: L('沙盒 Python · 图表提取', 'Cloud Sandbox · Figures'),
                    shape: 'sparkle' as const,
                    color: 'violet' as const
                  },
                  {
                    name: L('架构评审群聊室', 'Architecture Room'),
                    desc: L('3 个智能体协作房间', '3-Agent Group Room'),
                    shape: 'crystal' as const,
                    color: 'cyan' as const
                  }
                ]
                  .slice(0, grokRosterCount)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      style={{ animationDelay: `${idx * 70}ms` }}
                      className="ark-bot-pop flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 p-3"
                    >
                      <GrokBotMark
                        seed={`roster-${grokSyncKey}-${idx}`}
                        shape={item.shape}
                        color={item.color}
                        grokState="happy"
                        followPointer
                        sizePx={36}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-white">{item.name}</p>
                        <p className="truncate text-[11.5px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* BENTO 2: 4 Frictionless Import Paths */}
            <div className="ark-card ark-card-hover flex flex-col justify-between rounded-3xl p-6 lg:col-span-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[12px] font-semibold text-violet-300">
                  <KeyRound className="size-3.5" />
                  {L('全格式无感接入', 'Universal Credential Import')}
                </span>
                <h3 className="mt-4 text-[22px] font-bold text-white">
                  {L('四种姿势，怎么顺手怎么导', 'Four ways in. Zero OAuth bounce.')}
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-xl bg-black/35 p-1">
                  {(
                    [
                      ['browser', L('🌐 默认浏览器一键授权', '🌐 1-Click Browser')],
                      ['token', L('📋 Token / Cookie 粘贴', '📋 Token / Cookie')],
                      ['batch', L('📬 邮箱自动收码批导', '📬 Batch Email OTP')],
                      ['window', L('🪟 独立沙盒弹窗直登', '🪟 Partition Window')]
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setImportTab(k)}
                      className={`cursor-pointer rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition ${
                        importTab === k
                          ? 'bg-white/12 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-[#070a12] p-4 font-mono text-[12px] text-slate-300">
                {importTab === 'browser' && (
                  <div className="space-y-2">
                    <p className="text-emerald-300">
                      {L('// 直接复用你日常已登录 Google / X 的默认浏览器', '// Reuse your signed-in system browser')}
                    </p>
                    <p className="text-slate-200">
                      1. {L('点击「默认浏览器授权」', 'Click "Authorize in Default Browser"')}
                    </p>
                    <p className="text-slate-200">
                      2. {L('网页点一下确认 → BotArk 自动接管全部 Bot', 'Confirm once → BotArk syncs automatically')}
                    </p>
                  </div>
                )}
                {importTab === 'token' && (
                  <div className="space-y-2">
                    <p className="text-blue-300">
                      {L('// 自动识别 JWT、Cookie 键值对或 JSON 导出文件', '// Auto-parses JWT, Cookie headers, or JSON')}
                    </p>
                    <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-[11px] text-slate-400">
                      WorkosCursorSessionToken=user_01J... / eyJhbGciOi...
                    </div>
                  </div>
                )}
                {importTab === 'batch' && (
                  <div className="space-y-2">
                    <p className="text-violet-300">
                      {L('// 每行一个：邮箱 | 收件箱链接，自动读码并发登录', '// One per line: email | inbox URL')}
                    </p>
                    <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2 text-[11px] text-slate-400">
                      muse-01@mail.io | https://inbox.example/01
                      <br />
                      muse-02@mail.io | https://inbox.example/02
                    </div>
                  </div>
                )}
                {importTab === 'window' && (
                  <div className="space-y-2">
                    <p className="text-cyan-300">
                      {L('// 遵循本机 Clash / Surge 系统代理，弹窗绝不乱跳外部应用', '// Honors OS proxy & blocks external deep-link hijacks')}
                    </p>
                    <p className="text-slate-200">
                      persist:bothub-account-acc_01 → Isolated Cookie Jar ✓
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* BENTO 3: 1-to-1 Proxy Pool & Fail-Closed Guard */}
            <div className="ark-card ark-card-hover rounded-3xl p-6 lg:col-span-12">
              <div className="grid items-center gap-6 lg:grid-cols-[1fr_1.3fr]">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[12px] font-semibold text-cyan-300">
                    <Lock className="size-3.5" />
                    {L('一号一代理 × Fail-Closed 防泄漏', '1-to-1 Proxy Pool × Fail-Closed Guard')}
                  </span>
                  <h3 className="mt-3 text-[22px] font-bold text-white">
                    {L(
                      '多账号各走各的专属出口 IP，代理掉线绝不裸连泄漏',
                      'Dedicated egress IP per account. Zero silent direct-IP leaks.'
                    )}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-300">
                    {L(
                      '批量粘贴 SOCKS5 / SOCKS5H / HTTP 代理池，一键为每个账号一对一分配独立 IP。一旦某个代理节点异常，BotArk 立即熔断该账号发包，绝不偷偷回退本机直连。',
                      'Bind a dedicated SOCKS5 or HTTP proxy to each account. If a proxy node drops, BotArk immediately blocks traffic for that account rather than falling back to your real IP.'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setProxyBroken((v) => !v)}
                    className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold transition ${
                      proxyBroken
                        ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                        : 'border-amber-400/35 bg-amber-500/12 text-amber-200 hover:bg-amber-500/20'
                    }`}
                  >
                    {proxyBroken ? (
                      <>
                        <Check className="size-3.5" />
                        <span>{L('恢复节点 #2 正常连接', 'Restore Proxy Node #2')}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="size-3.5" />
                        <span>{L('点击模拟节点 #2 突然断连', 'Simulate Proxy #2 Drop')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Live Routing Lanes */}
                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#070a12] p-4">
                  {/* Lane 1 */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
                    <span className="font-mono text-[12px] text-slate-200">Account #1 (Grok)</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span className="ark-flow-dot absolute inset-y-0 w-12 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                    </div>
                    <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 font-mono text-[11px] text-emerald-300">
                      socks5://us-west-01 ✓
                    </span>
                  </div>

                  {/* Lane 2 (Interactive Fail-Closed) */}
                  <div
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                      proxyBroken
                        ? 'border-rose-500/40 bg-rose-500/10'
                        : 'border-white/8 bg-white/[0.03]'
                    }`}
                  >
                    <span className="font-mono text-[12px] text-slate-200">Account #2 (Muse)</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      {!proxyBroken && (
                        <span
                          style={{ animationDelay: '0.6s' }}
                          className="ark-flow-dot absolute inset-y-0 w-12 rounded-full bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                        />
                      )}
                    </div>
                    {proxyBroken ? (
                      <span className="rounded-lg bg-rose-500/25 px-2.5 py-1 font-mono text-[11px] font-semibold text-rose-200">
                        {L('🔒 已熔断阻断（真实 IP 零泄漏）', '🔒 Fail-Closed (0 Real IP Leak)')}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-violet-500/15 px-2.5 py-1 font-mono text-[11px] text-violet-300">
                        socks5h://jp-tokyo-02 ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
         * Interactive 3D Motion Lab Playground ("Grok + Muse Living Spirits")
         * ================================================================= */}
        <section id="motion-lab" className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="ark-card rounded-[32px] p-6 sm:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="font-mono text-[12px] font-semibold tracking-wider text-violet-400 uppercase">
                  60FPS 3D Quaternion Motion Engine
                </span>
                <h2 className="mt-2 text-[28px] font-extrabold tracking-tight text-white sm:text-[36px]">
                  {L(
                    '会呼吸、会看你、戳一下还会翻滚的灵动伙伴。',
                    'Living 3D companions that track your gaze.'
                  )}
                </h2>
                <p className="mt-1.5 text-[14.5px] text-slate-300">
                  {L(
                    '移动鼠标试试看 —— 它们的视线会实时跟随你的指针；点击任意角色触发 3D 弹跳，或切换下方情绪状态：',
                    'Move your cursor around — every character tracks your pointer in 3D. Click any bot to bounce, or switch their mood below:'
                  )}
                </p>
              </div>

              {/* Mood Switcher */}
              <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5">
                {(
                  [
                    ['happy', L('😄 开心', '😄 Happy')],
                    ['idle', L('👀 注视', '👀 Idle')],
                    ['working', L('⚡ 忙碌', '⚡ Working')],
                    ['thinking', L('🤔 思考', '🤔 Thinking')],
                    ['sleeping', L('💤 打盹', '💤 Sleeping')]
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMascotMood(m)}
                    className={`cursor-pointer rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition ${
                      mascotMood === m
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              {MASCOT_LAB_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setMascotPokes((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }))
                  }
                  className="group flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <GrokBotMark
                    seed={`lab-${item.id}`}
                    shape={item.shape}
                    color={item.color}
                    grokState={mascotMood}
                    followPointer
                    pokeSignal={mascotPokes[item.id] ?? 0}
                    sizePx={56}
                  />
                  <div className="text-center">
                    <p className="text-[12.5px] font-bold text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{item.role[lang]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===================================================================
         * Supported Platforms Native Depth Cards
         * ================================================================= */}
        <section id="platforms" className="reveal-section mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <span className="font-mono text-[12px] font-semibold tracking-wider text-cyan-400 uppercase">
              5 Native Protocol Adapters
            </span>
            <h2 className="mt-2 text-[30px] font-extrabold tracking-tight text-white sm:text-[40px]">
              {L('五大平台，原汁原味的深度操控', 'Deep protocol integration for every platform')}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                key: 'grok' as const,
                title: 'Grok Bot',
                proto: 'Connect-RPC + Sand PKCE',
                points: [
                  L('1 个账号自动同步展开名下全部 Bot 与群聊室', '1 account auto-expands all bots & group rooms'),
                  L('直接在已有账号下秒建新 Bot，无需重复登录', 'Create new bots on existing accounts in 1 click'),
                  L('原生管理子代理任务、记忆、技能库与云沙盒文件', 'Subagents, memories, skills & cloud sandbox files')
                ]
              },
              {
                key: 'muse' as const,
                title: 'Meta Muse',
                proto: 'Noise_XX WSS + Cloud VM',
                points: [
                  L('支持邮箱列表自动读取验证码批量并发导入', 'Batch email OTP auto-import for multi-account fleets'),
                  L('实时查看高速额度、处理 Sentinel 安全审批卡片', 'Live quota monitor & Sentinel action approvals'),
                  L('管理定时任务、长期目标、技能与云电脑文件预览', 'Cron schedules, goals, skills & workspace files')
                ]
              },
              {
                key: 'dot' as const,
                title: 'ChatGPT Dot',
                proto: 'Calpico Room + Celsius WS',
                points: [
                  L('支持网页登录或单条 / 多行批量粘贴 AT·RT·JSON', 'Web login or multi-line AT / RT / JSON batch import'),
                  L('换号时支持一键加密备份并跨账号无损迁移记忆', '1-click cross-account core goal & memory migration'),
                  L('随时切换 Orbit 角色、Dot / Native 模式与 Pages', 'Orbit persona switcher, Dot/Native mode & Pages')
                ]
              },
              {
                key: 'hark' as const,
                title: 'Hark',
                proto: 'REST + NDJSON Stream',
                points: [
                  L('真实 get-session 会话校验，杜绝过期 Cookie 假在线', 'Verified session probing — zero stale-cookie ghosts'),
                  L('支持窗口登录或直接粘贴 Session Cookie 导入', 'Window login or instant Session Cookie import'),
                  L('原生预览图片与文档附件、查看云端浏览器画面', 'Native split-pane document preview & cloud browser')
                ]
              },
              {
                key: 'hermes' as const,
                title: 'Hermes',
                proto: 'Open-Source Gateway SSE',
                points: [
                  L('一键自动检测本机 ~/.hermes 或接入远程 VPS 实例', 'Auto-detect local ~/.hermes or connect remote servers'),
                  L('原生 Session SSE 流式工具调用与危险命令安全审批', 'Native Session SSE streaming, tools & command approvals'),
                  L('管理持久化历史会话、Cron 定时任务、Skills 与工具集', 'Persistent sessions, cron jobs, skills & toolsets')
                ]
              }
            ].map((p) => (
              <div key={p.key} className="ark-card ark-card-hover flex flex-col justify-between rounded-3xl p-5">
                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src={PLATFORM_ICONS[p.key]}
                      alt={p.title}
                      className="size-9 rounded-xl bg-white/8 p-1.5 object-contain ring-1 ring-white/15"
                    />
                    <div>
                      <h3 className="text-[17px] font-bold text-white">{p.title}</h3>
                      <p className="font-mono text-[11px] text-slate-400">{p.proto}</p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-slate-300">
                    {p.points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===================================================================
         * Final Download Dock & Developer CLI Strip
         * ================================================================= */}
        <section id="download" className="reveal-section mx-auto max-w-5xl px-4 pt-12 pb-24 sm:px-6">
          <div className="ark-card relative overflow-hidden rounded-[36px] p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.22),transparent_65%)]" />

            <div className="relative z-10 flex flex-col items-center">
              <img
                src="./logo.png"
                alt="BotArk"
                className="ark-float size-20 rounded-2xl object-contain drop-shadow-[0_18px_35px_rgba(59,130,246,0.4)]"
              />
              <h2 className="mt-5 text-[30px] font-extrabold tracking-tight text-white sm:text-[42px]">
                {L('准备好把所有 Agent 收进同一艘方舟了吗？', 'Ready to bring every agent aboard?')}
              </h2>
              <p className="mt-2 max-w-xl text-[15px] text-slate-300">
                {L(
                  '立即下载 BotArk v0.7.0 正式版，开启干净、隔离、顺手的多智能体桌面工作流。',
                  'Download BotArk v0.7.0 for macOS or Windows — free, MIT-licensed, and 100% local.'
                )}
              </p>

              <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
                <a
                  href={RELEASE_URLS.macArm}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-blue-400/40 bg-blue-500/18 p-4 text-white transition hover:-translate-y-0.5 hover:bg-blue-500/28"
                >
                  <div className="flex items-center gap-2 text-[14.5px] font-bold">
                    <Apple className="size-4" />
                    <span>macOS (Apple Silicon)</span>
                  </div>
                  <span className="font-mono text-[11px] text-blue-200">
                    BotArk-0.7.0-arm64.dmg
                  </span>
                </a>

                <a
                  href={RELEASE_URLS.macIntel}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-white/12 bg-white/[0.05] p-4 text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <div className="flex items-center gap-2 text-[14.5px] font-bold">
                    <Apple className="size-4" />
                    <span>macOS (Intel x64)</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    BotArk-0.7.0-x64.dmg
                  </span>
                </a>

                <a
                  href={RELEASE_URLS.winX64}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-white/12 bg-white/[0.05] p-4 text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <div className="flex items-center gap-2 text-[14.5px] font-bold">
                    <Monitor className="size-4 text-sky-400" />
                    <span>Windows 10 / 11</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    BotArk-Setup-0.7.0-x64.exe
                  </span>
                </a>
              </div>

              {/* Copyable Git Clone Bar */}
              <div className="mt-6 flex w-full max-w-lg items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#05070c]/90 px-4 py-2.5 font-mono text-[12px] text-slate-300">
                <span className="flex items-center gap-2 truncate">
                  <Terminal className="size-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">git clone https://github.com/qybaihe/botark.git</span>
                </span>
                <button
                  type="button"
                  onClick={copyCloneCmd}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-white/8 px-2.5 py-1 text-[11px] text-slate-200 transition hover:bg-white/15"
                >
                  {copiedClone ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span>{L('已复制', 'Copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>{L('复制', 'Copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/8 py-8 text-center text-[12.5px] text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src="./logo.png" alt="BotArk" className="size-5 rounded object-contain" />
            <span className="font-semibold text-slate-200">BotArk</span>
            <span>· MIT License · Independent Open-Source Client</span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={RELEASE_URLS.repo}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition hover:text-white"
            >
              <span>GitHub</span>
              <ExternalLink className="size-3" />
            </a>
            <a
              href={RELEASE_URLS.latest}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Releases
            </a>
            <a
              href={RELEASE_URLS.discussions}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-white"
            >
              Discussions
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
