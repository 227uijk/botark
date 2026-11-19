import type { BotColorId, BotShape } from '@/components/ui/GrokBotMark'
import grokIcon from '@/assets/platforms/grok.png'
import museIcon from '@/assets/platforms/muse.svg'
import dotIcon from '@/assets/platforms/dot.svg'
import harkIcon from '@/assets/platforms/hark.svg'
import hermesIcon from '@/assets/platforms/hermes.png'

export type Lang = 'zh' | 'en'
export type PlatformKey = 'grok' | 'muse' | 'dot' | 'hark' | 'hermes'

export const RELEASE_URLS = {
  latest: 'https://github.com/qybaihe/botark/releases/latest',
  macArm: 'https://github.com/qybaihe/botark/releases/download/v0.8.0/BotArk-0.8.0-arm64.dmg',
  macIntel: 'https://github.com/qybaihe/botark/releases/download/v0.8.0/BotArk-0.8.0-x64.dmg',
  winX64: 'https://github.com/qybaihe/botark/releases/download/v0.8.0/BotArk-Setup-0.8.0-x64.exe',
  iosRepo: 'https://github.com/qybaihe/botark/tree/main/ios/BotArk',
  repo: 'https://github.com/qybaihe/botark',
  discussions: 'https://github.com/qybaihe/botark/discussions'
} as const

export const PLATFORM_ICONS: Record<PlatformKey, string> = {
  grok: grokIcon,
  muse: museIcon,
  dot: dotIcon,
  hark: harkIcon,
  hermes: hermesIcon
}

export interface DemoBot {
  id: string
  platform: PlatformKey
  platformLabel: string
  group: { zh: string; en: string }
  name: { zh: string; en: string }
  accountHandle: string
  shape: BotShape
  color: BotColorId
  badge?: { zh: string; en: string }
  messages: Array<{
    role: 'user' | 'bot'
    tool?: { zh: string; en: string }
    text: { zh: string; en: string }
  }>
  quickPrompts: Array<{
    label: { zh: string; en: string }
    replyTool: { zh: string; en: string }
    reply: { zh: string; en: string }
  }>
  workbench: {
    protocolBadge: string
    cards: Array<{
      title: { zh: string; en: string }
      tag: { zh: string; en: string }
      items: Array<{ zh: string; en: string }>
    }>
  }
}

export const DEMO_BOTS: DemoBot[] = [
  {
    id: 'grok-review',
    platform: 'grok',
    platformLabel: 'Grok Bot',
    group: { zh: '工程与研发', en: 'Engineering' },
    name: { zh: 'Grok · 代码审查', en: 'Grok · Code Review' },
    accountHandle: 'alex@studio.dev',
    shape: 'blob',
    color: 'green',
    badge: { zh: '单号自动展开', en: 'Auto-synced' },
    messages: [
      {
        role: 'user',
        text: {
          zh: '帮我巡检一下 PR #42 的代理池重连逻辑，有没有直连泄漏风险？',
          en: 'Audit PR #42 proxy pool reconnect logic — any risk of direct IP fallback?'
        }
      },
      {
        role: 'bot',
        tool: { zh: '子代理沙盒 · 已扫描 4 个文件并运行 vitest', en: 'Subagent Sandbox · Scanned 4 files & ran vitest' },
        text: {
          zh: '已验证通过：`proxyTransport.ts` 在 SOCKS5 握手失败时直接抛出阻断异常（Fail-Closed），绝不会回退裸连暴露本机 IP。单测 113/113 全绿。',
          en: 'Verified clean: `proxyTransport.ts` enforces strict fail-closed behavior on SOCKS5 handshake errors and never falls back to direct egress. All 113 unit tests pass.'
        }
      }
    ],
    quickPrompts: [
      {
        label: { zh: '⚡ 跑一遍云端沙盒单测', en: '⚡ Run cloud sandbox tests' },
        replyTool: { zh: 'SandBox VM · 执行 npm test (418ms)', en: 'SandBox VM · Executed npm test (418ms)' },
        reply: {
          zh: '24 个测试套件（共 113 项断言）已在沙盒内执行完毕，零报错！构建产物报告已存入右侧「文件库」。',
          en: 'All 24 test suites (113 assertions) passed in 418ms inside the cloud sandbox. Artifact summary saved to the right-side Library.'
        }
      },
      {
        label: { zh: '🧠 记住：PR 评论统一用中文', en: '🧠 Remember: write PR reviews in concise bullets' },
        replyTool: { zh: 'Grok Memory · 已写入长期记忆槽', en: 'Grok Memory · Saved to persistent memory' },
        reply: {
          zh: '已写入当前 Bot 的云端长期记忆，后续所有 PR 审查都会默认输出精炼中文要点。你随时可以在右侧操作台修改这条记忆。',
          en: 'Saved to persistent memory! Future PR reviews will use concise bullet points. You can edit or prune memories anytime in the right workbench (⌘I).'
        }
      }
    ],
    workbench: {
      protocolBadge: 'Connect-RPC · SandBox',
      cards: [
        {
          title: { zh: '同账号名下 Bot (alex@studio.dev)', en: 'Account Bots (alex@studio.dev)' },
          tag: { zh: '已同步 4 个', en: '4 Synced' },
          items: [
            { zh: '🟢 Grok · 代码审查（当前对话）', en: '🟢 Grok · Code Review (Active)' },
            { zh: '🟢 Grok · 市场雷达 · 空闲', en: '🟢 Grok · Market Radar · Idle' },
            { zh: '🟢 Grok · 架构参谋 · 空闲', en: '🟢 Grok · System Architect · Idle' }
          ]
        },
        {
          title: { zh: '后台子代理与自动化', en: 'Subagents & Automations' },
          tag: { zh: '2 项运行中', en: '2 Active' },
          items: [
            { zh: '⏱️ 每日 09:30 主干 CI 巡检 · 已启用', en: '⏱️ Daily 09:30 Main Branch Audit · Enabled' },
            { zh: '📦 沙盒产物：coverage-summary.md', en: '📦 Artifact: coverage-summary.md' }
          ]
        },
        {
          title: { zh: '长期记忆与技能库', en: 'Memories & Skills' },
          tag: { zh: '3 条记忆', en: '3 Memories' },
          items: [
            { zh: '• 严格模式 TypeScript + Vitest 回归测试', en: '• Strict TypeScript + Vitest regression tests' },
            { zh: '• 代理异常必须 Fail-Closed 阻断防泄漏', en: '• Proxy failures must fail-closed without direct leak' }
          ]
        }
      ]
    }
  },
  {
    id: 'grok-radar',
    platform: 'grok',
    platformLabel: 'Grok Bot',
    group: { zh: '工程与研发', en: 'Engineering' },
    name: { zh: 'Grok · 市场雷达', en: 'Grok · Market Radar' },
    accountHandle: 'alex@studio.dev',
    shape: 'gem',
    color: 'orange',
    messages: [
      {
        role: 'user',
        text: {
          zh: '把今天 X 和 GitHub Trending 上热度最高的桌面 Agent 动态浓缩成三条。',
          en: 'Summarize today’s top 3 desktop AI agent trends across X and GitHub Trending.'
        }
      },
      {
        role: 'bot',
        tool: { zh: 'X 实时检索 · 已聚合 18 条高赞讨论', en: 'Live X Search · Synthesized 18 threads' },
        text: {
          zh: '1. 原生多平台聚合工作台热度飙升，开发者普遍厌倦同时挂十几个无痕窗口；\n2. 一号一代理隔离与本地钥匙串加密成为多号玩家刚需；\n3. 右侧可折叠专业操作台取代传统全屏网页套壳。',
          en: '1. Native multi-agent workspaces are surging as builders ditch scattered browser profiles;\n2. Per-account proxy isolation + OS Keychain storage are top requests;\n3. Collapsible right-hand workbenches beat heavy web wrappers.'
        }
      }
    ],
    quickPrompts: [
      {
        label: { zh: '📊 生成竞品对比表', en: '📊 Generate comparison matrix' },
        replyTool: { zh: 'Artifact Writer · 已生成 trend-brief.md', en: 'Artifact Writer · Created trend-brief.md' },
        reply: {
          zh: '已为你整理好四维度对比表并归档至右侧资料库，点击即可分屏预览或导出 Markdown。',
          en: 'Comparison matrix compiled and saved to the right-side Library for instant split-pane preview.'
        }
      }
    ],
    workbench: {
      protocolBadge: 'Connect-RPC · Live X',
      cards: [
        {
          title: { zh: '定时情报例程', en: 'Scheduled Digests' },
          tag: { zh: '每日 08:30', en: 'Daily 08:30' },
          items: [
            { zh: '⚡ 早报：GitHub Trending + X 热帖摘要', en: '⚡ Morning Brief: GitHub Trending + X Pulse' },
            { zh: '📄 最新产物：trend-brief-1119.md', en: '📄 Latest file: trend-brief-1119.md' }
          ]
        }
      ]
    }
  },
  {
    id: 'muse-assist',
    platform: 'muse',
    platformLabel: 'Meta Muse',
    group: { zh: '日常与研究', en: 'Daily & Research' },
    name: { zh: 'Muse · 日程与外联', en: 'Muse · Daily Concierge' },
    accountHandle: 'muse-work@outlook.com',
    shape: 'sparkle',
    color: 'violet',
    messages: [
      {
        role: 'user',
        text: {
          zh: '帮我把下午三点的设计走查纪要整理好，并同步到工作区周报文档。',
          en: 'Organize the 3 PM design review notes and append action items to our weekly doc.'
        }
      },
      {
        role: 'bot',
        tool: { zh: 'Noise 加密网关 · Sentinel 审批已就绪', en: 'Noise Encrypted Gateway · Sentinel Ready' },
        text: {
          zh: '纪要与 4 项待办已整理完毕！写入外部连接器前已在右侧「审批」卡片发起安全确认，点一下「允许一次」即可完成同步。',
          en: 'Notes and 4 action items are ready! A Sentinel approval card is waiting in your right workbench — click Allow Once to sync.'
        }
      }
    ],
    quickPrompts: [
      {
        label: { zh: '✅ 批准并生成本周摘要', en: '✅ Approve & summarize week' },
        replyTool: { zh: 'Muse Cloud VM · 已更新 weekly-sync.md', en: 'Muse Cloud VM · Updated weekly-sync.md' },
        reply: {
          zh: '已完成写入！当前 Muse 账号连接走专属 SOCKS5 节点 #2，剩余高速额度充足。',
          en: 'Synced cleanly! Routed via dedicated SOCKS5 node #2 with full quota remaining.'
        }
      }
    ],
    workbench: {
      protocolBadge: 'Noise WSS · Cloud VM',
      cards: [
        {
          title: { zh: '额度与出站代理隔离', en: 'Quota & Egress Proxy' },
          tag: { zh: 'SOCKS5 #2 锁定', en: 'SOCKS5 #2 Locked' },
          items: [
            { zh: '💎 账号状态：高速额度正常 · 独立沙盒分区', en: '💎 Quota: Healthy · Isolated Partition' },
            { zh: '🛡️ Sentinel 审批：无未决高危操作', en: '🛡️ Sentinel: 0 pending external writes' }
          ]
        },
        {
          title: { zh: '云电脑文件库与定时任务', en: 'Cloud VM Files & Schedules' },
          tag: { zh: '3 个文件', en: '3 Files' },
          items: [
            { zh: '📑 weekly-sync.md · 刚刚更新', en: '📑 weekly-sync.md · Updated just now' },
            { zh: '⏰ 每周五 17:00 自动汇总周报', en: '⏰ Every Fri 17:00 Weekly Summary' }
          ]
        }
      ]
    }
  },
  {
    id: 'dot-orbit',
    platform: 'dot',
    platformLabel: 'ChatGPT Dot',
    group: { zh: '日常与研究', en: 'Daily & Research' },
    name: { zh: 'Dot · 深度写作搭子', en: 'Dot · Writing Partner' },
    accountHandle: 'dot-pro@gmail.com',
    shape: 'clover',
    color: 'blue',
    messages: [
      {
        role: 'user',
        text: {
          zh: '把上个账号里的写作偏好和项目背景迁移过来后，帮我起草 v0.6 发布导语。',
          en: 'Using the writing preferences migrated from my previous Dot account, draft the v0.6 release intro.'
        }
      },
      {
        role: 'bot',
        tool: { zh: 'Calpico Room · 已加载跨号迁移的 6 条核心记忆', en: 'Calpico Room · Loaded 6 migrated memories' },
        text: {
          zh: '已按你偏好的克制、短句、零废话风格起草好中英双语导语，并保存为右侧 Pages 文档供随时对照微调。',
          en: 'Drafted in your crisp, zero-fluff style using all 6 migrated memory blocks, and saved to Pages in the right panel.'
        }
      }
    ],
    quickPrompts: [
      {
        label: { zh: '🔄 演示一键跨号记忆备份', en: '🔄 Snapshot memories to Vault' },
        replyTool: { zh: 'Keychain Vault · 已加密备份目标与记忆', en: 'Keychain Vault · Encrypted snapshot saved' },
        reply: {
          zh: '当前 Dot 的核心目标与全部记忆条目已加密快照至本机钥匙串，切换新 Dot 账号时可一键无损灌入！',
          en: 'Core goals and memory items snapshotted to OS Keychain — ready for 1-click restore onto any new Dot account!'
        }
      }
    ],
    workbench: {
      protocolBadge: 'Calpico Room · Orbit',
      cards: [
        {
          title: { zh: 'Orbit 角色与模式控制', en: 'Orbit Persona & Mode' },
          tag: { zh: 'Dot 原生模式', en: 'Dot Mode' },
          items: [
            { zh: '🪐 当前 Orbit：Editorial Writer · 自动续期 RT', en: '🪐 Orbit: Editorial Writer · Auto-RT' },
            { zh: '🔐 跨账号记忆迁移：支持一键导出 / 灌入', en: '🔐 1-Click Cross-Account Memory Migration' }
          ]
        },
        {
          title: { zh: 'Pages 与资料库', en: 'Pages & Library' },
          tag: { zh: '2 篇文档', en: '2 Pages' },
          items: [
            { zh: '📝 release-v0.6-intro.md', en: '📝 release-v0.6-intro.md' },
            { zh: '📝 tone-of-voice-guide.md', en: '📝 tone-of-voice-guide.md' }
          ]
        }
      ]
    }
  },
  {
    id: 'hark-brief',
    platform: 'hark',
    platformLabel: 'Hark',
    group: { zh: '日常与研究', en: 'Daily & Research' },
    name: { zh: 'Hark · 巡检与纪要', en: 'Hark · Ops & Notes' },
    accountHandle: 'hark-ops@gmail.com',
    shape: 'crystal',
    color: 'cyan',
    messages: [
      {
        role: 'user',
        text: {
          zh: '把刚才云端浏览器抓到的竞品更新日志整理成补丁摘要发我。',
          en: 'Turn the changelog captured in the cloud browser into a clean summary note.'
        }
      },
      {
        role: 'bot',
        tool: { zh: 'Hark Browser VM · 已生成 changelog-diff.md', en: 'Hark Browser VM · Generated changelog-diff.md' },
        text: {
          zh: '已提取全部核心变更点并生成附件，点击右侧文件库即可直接用内置原生文档阅读器秒开预览。',
          en: 'Extracted all key changes into changelog-diff.md — click in the right Library for instant native split-pane preview.'
        }
      }
    ],
    quickPrompts: [
      {
        label: { zh: '🌐 查看云端浏览器任务状态', en: '🌐 Check cloud browser status' },
        replyTool: { zh: 'REST + SSE · 会话有效 (get-session ✓)', en: 'REST + SSE · Session verified (get-session ✓)' },
        reply: {
          zh: '云端浏览器工作流运行平稳，2 项定时网页巡检任务将于明日 09:00 自动触发。',
          en: 'Cloud browser session healthy — 2 scheduled web-watch workflows armed for 09:00 tomorrow.'
        }
      }
    ],
    workbench: {
      protocolBadge: 'REST + SSE · Browser VM',
      cards: [
        {
          title: { zh: '快捷工作流与定时巡检', en: 'Workflows & Schedules' },
          tag: { zh: '在线就绪', en: 'Online' },
          items: [
            { zh: '🌐 竞品定价页变更监控 · 每日巡检', en: '🌐 Pricing Page Monitor · Daily' },
            { zh: '📎 附件直连预览：changelog-diff.md', en: '📎 Native Preview: changelog-diff.md' }
          ]
        }
      ]
    }
  },
  {
    id: 'hermes-local',
    platform: 'hermes',
    platformLabel: 'Hermes',
    group: { zh: '工程与研发', en: 'Engineering' },
    name: { zh: 'Hermes · 本机开源 Agent', en: 'Hermes · Open-Source Agent' },
    accountHandle: '127.0.0.1:8642',
    shape: 'clover',
    color: 'green',
    badge: { zh: '开源自托管', en: 'Open-Source' },
    messages: [
      {
        role: 'user',
        text: {
          zh: '检查一下我本地仓库里有没有未推送的提交，并把 cron 任务状态列给我。',
          en: 'Check unpushed commits in my local repo and list active Hermes cron jobs.'
        }
      },
      {
        role: 'bot',
        tool: { zh: 'Hermes terminal · 已执行 git status & /api/jobs', en: 'Hermes terminal · Ran git status & /api/jobs' },
        text: {
          zh: '当前 `main` 分支干净无未推送提交；本机 Hermes 网关运行正常，共 2 个定时巡检任务待命。若触发高危命令，右侧操作台会自动弹出审批卡片。',
          en: '`main` is clean and up to date. Your local Hermes gateway is healthy with 2 scheduled jobs ready — dangerous commands automatically surface approval cards in the right workbench.'
        }
      }
    ],
    quickPrompts: [
      {
        label: { zh: '🛠️ 查看已安装的 Hermes Skills', en: '🛠️ Inspect installed Hermes Skills' },
        replyTool: { zh: 'Hermes Gateway · GET /v1/skills & /v1/toolsets', en: 'Hermes Gateway · GET /v1/skills & /v1/toolsets' },
        reply: {
          zh: '已加载 14 个本地技能与 6 组工具集（terminal / web / files / memory / cron），支持切换多会话历史与自定义模型别名。',
          en: 'Loaded 14 local skills and 6 toolsets (terminal, web, files, memory, cron) with persistent session switching and model aliases.'
        }
      }
    ],
    workbench: {
      protocolBadge: 'HTTP/SSE · API Server',
      cards: [
        {
          title: { zh: 'Hermes 网关与危险命令审批', en: 'Hermes Gateway & Approvals' },
          tag: { zh: 'v0.9 · 在线', en: 'v0.9 · Online' },
          items: [
            { zh: '🔒 API_SERVER_KEY 已存入 Keychain safeStorage', en: '🔒 API_SERVER_KEY encrypted in OS Keychain' },
            { zh: '✅ 原生 Session SSE 流式工具调用 + 命令审批', en: '✅ Native Session SSE streaming + command approvals' }
          ]
        },
        {
          title: { zh: '定时任务与技能工具集', en: 'Cron Jobs, Skills & Toolsets' },
          tag: { zh: '14 Skills', en: '14 Skills' },
          items: [
            { zh: '⏱️ 每日构建监控 · 已启用（一键立即运行）', en: '⏱️ Daily Build Watch · Enabled (Run Now)' },
            { zh: '🧩 Toolsets: terminal, files, web, memory', en: '🧩 Toolsets: terminal, files, web, memory' }
          ]
        }
      ]
    }
  }
]

export const MASCOT_LAB_PRESETS: Array<{
  id: string
  name: string
  shape: BotShape
  color: BotColorId
  role: { zh: string; en: string }
}> = [
  { id: 'm1', name: 'Blob', shape: 'blob', color: 'green', role: { zh: '代码审查官', en: 'Code Reviewer' } },
  { id: 'm2', name: 'Sparkle', shape: 'sparkle', color: 'violet', role: { zh: '灵感研究员', en: 'Muse Researcher' } },
  { id: 'm3', name: 'Clover', shape: 'clover', color: 'blue', role: { zh: '四叶聚核体', en: 'Orbit Planner' } },
  { id: 'm4', name: 'Gem', shape: 'gem', color: 'orange', role: { zh: '实时情报员', en: 'Trend Scout' } },
  { id: 'm5', name: 'Crystal', shape: 'crystal', color: 'cyan', role: { zh: '沙盒架构师', en: 'Sandbox Architect' } },
  { id: 'm6', name: 'Star', shape: 'star', color: 'yellow', role: { zh: '日程大管家', en: 'Daily Concierge' } },
  { id: 'm7', name: 'Cloud', shape: 'cloud', color: 'magenta', role: { zh: '写作主笔', en: 'Editorial Partner' } },
  { id: 'm8', name: 'Heart', shape: 'heart', color: 'red', role: { zh: '全天候守卫', en: 'Vault Guardian' } }
]
