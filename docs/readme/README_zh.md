<div align="center">

<img src="../assets/logo.png" alt="BotArk" width="108" />

# BotArk

**把你常用的所有 Personal Agent，收进同一个原生桌面客户端。**

告别满桌面的独立应用与十几个无痕浏览器窗口，<br />
在一个干净顺手的 macOS / Windows 窗口里并排使用 **Grok Bot**、**ChatGPT Dot**、**Meta Muse** 与 **Hark**。

<p>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/github/v/release/qybaihe/botark?style=flat-square&label=%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC&color=2563eb" alt="最新版本" /></a>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/badge/macOS-%E8%8B%B9%E6%9E%9C%E7%AD%BE%E5%90%8D%E4%B8%8E%E5%85%AC%E8%AF%81-16a34a?style=flat-square&logo=apple&logoColor=white" alt="苹果签名与公证" /></a>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/badge/Windows-10%2F11_x64-0078d4?style=flat-square&logo=windows&logoColor=white" alt="Windows 10/11" /></a>
  <a href="https://github.com/qybaihe/botark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/qybaihe/botark/ci.yml?branch=main&style=flat-square&label=CI" alt="CI 状态" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-MIT-0ea5e9?style=flat-square" alt="MIT 许可证" /></a>
</p>

<h4>
  <a href="https://qybaihe.github.io/botark/">🌐 官方网站</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">🍎 下载 macOS 版 (Apple 芯片)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">💻 下载 macOS 版 (Intel)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">🪟 下载 Windows 版</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/discussions">💬 社区讨论</a>
</h4>

<sub>
  <a href="../../README.md">English</a> ·
  <b>简体中文</b> ·
  <a href="README_zh-TW.md">繁體中文</a> ·
  <a href="README_ja.md">日本語</a> ·
  <a href="README_ko.md">한국어</a> ·
  <a href="README_es.md">Español</a> ·
  <a href="README_fr.md">Français</a> ·
  <a href="README_de.md">Deutsch</a> ·
  <a href="README_pt-BR.md">Português</a> ·
  <a href="README_ru.md">Русский</a> ·
  <a href="README_it.md">Italiano</a> ·
  <a href="README_vi.md">Tiếng Việt</a> ·
  <a href="README_tr.md">Türkçe</a> ·
  <a href="README_ar.md">العربية</a> ·
  <a href="README_id.md">Indonesia</a> ·
  <a href="README_hi.md">हिन्दी</a>
</sub>

</div>

<br />

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../assets/botark-dark.webp" />
    <img src="../assets/botark-light.webp" alt="BotArk 三栏原生桌面工作台" width="100%" />
  </picture>
</div>

---

## ✨ 核心体验：从接入到日常协作

现在的 Personal Agent 早已不只是简单问答——它们有长期记忆、能跑后台子任务、会定时巡检、还带着各自的云端电脑和文件库。但只要你同时在用两三家平台，或者手里有工作号、个人号好几个账号，每天光是找网页、切无痕窗口、配代理就会被打断无数次。

**BotArk 把这套碎片化的日常重新理顺成了三件事：**

<table>
  <tr>
    <td width="46%" valign="middle">
      <h3>1. 不管几个平台、多少个账号，轻松收进来</h3>
      <p>无论是单号交互登录还是多号车队导入，都能用最顺手的方式一步到位：</p>
      <ul>
        <li><b>弹窗直登与默认浏览器一键授权</b>：自动遵循系统代理（无缝兼容 Clash / Surge），OAuth 验证不乱跳</li>
        <li><b>全格式凭据粘贴直连</b>：支持 Access Token、Cookie、JSON 或 API Key 粘贴即用</li>
        <li><b>批量自动导入</b>：支持 Meta Muse 邮箱自动读取验证码批量登录，以及 ChatGPT Dot 多行批量导入</li>
      </ul>
    </td>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../assets/feature-platforms-dark.webp" />
        <img src="../assets/feature-platforms-light.webp" alt="BotArk 账号导入与四大平台概览" width="100%" />
      </picture>
    </td>
  </tr>
  <tr>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../assets/feature-accounts-dark.webp" />
        <img src="../assets/feature-accounts-light.webp" alt="BotArk 多账号控制台与 Grok 单号多 Bot 展开" width="100%" />
      </picture>
    </td>
    <td width="46%" valign="middle">
      <h3>2. 底层账号彻底隔离，列表按 Bot 直观平铺</h3>
      <p>在底层，每个账号都运行在独立的 Chromium 沙盒分区与系统钥匙串加密槽位中，同一平台挂十几个账号也绝不串号，还支持在代理池中<b>一号一 IP 独立绑定</b>（代理异常自动阻断，绝不裸连暴露真实 IP）。</p>
      <p>在界面上，左侧始终以<b>单个 Bot</b> 为单位清爽排列：登录 1 个 <b>Grok Bot</b> 账号，名下所有专业 Bot 与群聊房间会自动逐个展开到侧边栏，也能直接在已有账号下新建专属 Bot。</p>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>🗂️ 跨平台混编分组（<code>⌘K</code>）</h4>
      按「日常助理 / 研究写作 / 开发运维」而不是按厂商来归类你的助手；常用 Bot 一键置顶，按 <code>⌘K</code> 秒搜秒切。
    </td>
    <td width="33%" valign="top">
      <h4>🛠️ 按需展开右侧操作台（<code>⌘I</code>）</h4>
      平时收起面板保持聊天视野干净；需要查子任务进度、改长期记忆与技能、管定时任务或下载沙盒文件时，一键呼出。
    </td>
    <td width="34%" valign="top">
      <h4>🛡️ 防重发状态机 &amp; 纯本地隐私</h4>
      精确区分「发送中 / 已接收 / 失败」，平台已受理的消息绝不误判重发。无任何云端中转与遥测埋点，数据 100% 留在本机。
    </td>
  </tr>
</table>

---

## 🤖 四大平台原生能力一览

BotArk 不是简单的网页套壳，右侧操作台（`⌘I`）会根据每个平台的真实底层协议呈现对应的原生操控面板：

| 平台 | 支持的登录与导入方式 | 账号与侧边栏关系 | 右侧专属操作台（`⌘I`） |
| :--- | :--- | :--- | :--- |
| <img src="../../src/renderer/src/assets/platforms/grok.png" width="18" height="18" align="absmiddle" /> **Grok Bot** | 弹窗登录、**默认浏览器一键授权**，或粘贴 Token / Cookie / JSON / API Key | **1 个账号 → 自动展开多个 Bot**（支持直接在已有账号下新建 Bot） | 历史会话、后台子任务、自动化触发器、记忆与技能编辑、文件库、云端沙盒终端、MCP 连接器与配方导入导出 |
| <img src="../../src/renderer/src/assets/platforms/muse.svg" width="18" height="18" align="absmiddle" /> **Meta Muse** | 独立分区窗口登录，或**邮箱列表自动收码批量导入** | 1 个独立账号 → 1 个 Muse 助手（支持多号并行） | 额度实时监控、Sentinel 操作审批、多会话切换、定时任务、长期目标、记忆与技能、文件预览与云电脑视图 |
| <img src="../../src/renderer/src/assets/platforms/dot.svg" width="18" height="18" align="absmiddle" /> **ChatGPT Dot** | 网页弹窗登录，或**单条 / 多行批量粘贴 AT、RT、JSON 导入** | 1 个账号 → 1 个 Dot 助手（自带 Refresh Token 自动续期） | Orbit 角色切换、Dot / Native 双模式、核心目标编辑、**换号一键迁移目标与记忆**、Pages 页面与文件库 |
| <img src="../../src/renderer/src/assets/platforms/hark.svg" width="18" height="18" align="absmiddle" /> **Hark** | Google / 邮箱窗口登录，或**粘贴 Session Cookie 导入** | 1 个账号 → 1 个 Hark 助手 | 快捷工作流卡片、历史会话切换、定时巡检任务、生成文件下载、云端浏览器实时画面与工作区连接器 |

---

## ⚡ 30 秒快速开始

### 1. 下载安装

前往 [**GitHub Releases 最新版本**](https://github.com/qybaihe/botark/releases/latest) 下载对应系统的安装包：

| 系统平台 | 安装包 | 说明 |
| :--- | :--- | :--- |
| **macOS（Apple 芯片 M1–M4）** | `BotArk-<版本号>-arm64.dmg` | ✅ **Apple Developer ID 签名与官方公证**，拖入「应用程序」双击直开，无拦截提示 |
| **macOS（Intel 芯片）** | `BotArk-<版本号>-x64.dmg` | ✅ **Apple Developer ID 签名与官方公证**，安装即用 |
| **Windows 10 / 11（64 位）** | `BotArk-Setup-<版本号>-x64.exe` | NSIS 安装向导（版本升级或卸载均自动保留本地账号数据） |

### 2. 添加首个账号

1. 按 **`⌘N` / `Ctrl+N`**（或点击侧边栏左上角 **`＋`**）添加账号；如需批量导入或配置代理池，打开左下角 **「设置与账号」**。
2. 点击左侧任意 Bot 开始流式对话，随时按 **`⌘I` / `Ctrl+I`** 展开或收起右侧操作台。

> [!TIP]
> 初次上手？点击侧边栏左下角的 **✦ 星标图标**，随时可以打开内置的 **全屏交互式导览**。

---

## ⌨️ 常用快捷键

| 快捷键（macOS / Windows） | 功能 |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | 打开**全局指令面板**，秒搜 Bot、分组、历史消息与快捷命令 |
| `⌘N` / `Ctrl+N` | 新建 Bot 或接入新账号 |
| `⌘I` / `Ctrl+I` | 展开 / 收起当前 Bot 的右侧操作台 |
| `⌘[` · `⌘]` / `Ctrl+[` · `Ctrl+]` | 切换到侧边栏上一个 / 下一个 Bot |

---

## 🧰 本地开发

环境要求：**Node.js 22.19+**（推荐 Node 24，详见 [`.nvmrc`](../../.nvmrc)）。

```bash
git clone https://github.com/qybaihe/botark.git
cd botark
npm ci
npm run dev
```

| 命令 | 用途 |
| :--- | :--- |
| `npm run dev` | 启动主进程、Preload 与 React 渲染进程（支持热更新） |
| `npm run typecheck` | 运行 Node 与前端 TypeScript 类型检查 |
| `npm test` | 运行 Vitest 单元测试套件 |
| `npm run build` | 构建生产产物至 `out/` |
| `npm run dist:mac` / `npm run dist:win` | 打包 macOS `.dmg` + `.zip` 或 Windows `.exe` 安装包 |

想参与贡献或接入新的 Agent 平台？欢迎查看 [**贡献指南 (CONTRIBUTING.md)**](../../CONTRIBUTING.md) 与 [**`docs/` 协议文档**](../README.md)。

---

## 🗺️ 后续计划（Roadmap）

- [ ] **接入 Claude Duet**：原生适配 Anthropic **Claude Duet**（主动消息提醒、关键操作审批、云端虚拟机文件与记忆/技能管理）。
- [ ] **上线 Android & iOS 移动端**：支持在手机上随时与各平台 Agent 对话并接收主动通知，并**支持直接导入账号**（Token / Cookie 导入或从桌面端加密同步）。
- [ ] **多账号与效率持续增强**：完善批量导入、全局快捷键以及跨平台任务/审批统一收件箱。

---

## ❓ 常见问题

<details>
<summary><b>BotArk 是这些平台的官方客户端吗？</b></summary>

不是。BotArk 是基于 MIT 协议开源的独立桌面客户端，与 xAI、OpenAI、Meta、Hark 官方无关。你使用自己的账号登录，所有网络请求由你的电脑直接发往对应平台。

</details>

<details>
<summary><b>macOS 打开时会提示「无法验证开发者」吗？</b></summary>

不会。官方发布的 macOS `.dmg` 安装包均已完成 **Apple Developer ID 签名与苹果官方公证（Notarized）**，拖入「应用程序」即可正常打开。

</details>

<details>
<summary><b>账号凭据保存在哪里？从旧版 BotHub 升级会丢账号吗？</b></summary>

所有会话与凭据仅加密保存在你自己的电脑本地（macOS 为 `~/Library/Application Support/botark`，Windows 为 `%APPDATA%\botark`）。如果你此前装过旧版 `BotHub`，BotArk 启动时会自动识别并无缝继承原有本地目录，无需重新登录。

</details>

---

## 🤝 社区与致谢

- 感谢 [**LINUX DO**](https://linux.do/) 社区与各位佬友的交流、反馈与支持 —— 真诚、友善、团结、专业，共建你我引以为荣之社区。
- 欢迎在 [**GitHub Discussions**](https://github.com/qybaihe/botark/discussions) 分享你的多 Agent 工作流或提议下一个想接入的平台。

---

## 📈 Star 增长趋势

<div align="center">
  <a href="https://star-history.com/#qybaihe/botark&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=qybaihe/botark&type=Date&theme=dark" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=qybaihe/botark&type=Date" width="100%" />
    </picture>
  </a>
</div>

---

<div align="center">
  基于 <a href="../../LICENSE"><b>MIT 许可证</b></a> 开源。<br />
  <sub>如果 <b>BotArk</b> 让你的多 Agent 日常清爽了不少，欢迎点亮右上角的 <b>⭐ Star</b> 支持我们！</sub>
</div>
