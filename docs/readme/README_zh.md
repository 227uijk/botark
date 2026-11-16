<div align="center">

[English](../../README.md) · **简体中文** · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Português (Brasil)](README_pt-BR.md) · [Русский](README_ru.md) · [Italiano](README_it.md) · [Tiếng Việt](README_vi.md) · [Türkçe](README_tr.md) · [العربية](README_ar.md) · [Bahasa Indonesia](README_id.md) · [हिन्दी](README_hi.md)

<br />

<img src="../assets/logo.png" alt="BotHub" width="88" />

# BotHub

### **把你所有的 Personal Agent 收进同一个原生桌面工作台**

**在一个窗口里同时使用 Grok Bot、ChatGPT Dot、Meta Muse 和 Hark —— 支持多账号独立在线、单账号多 Bot 自动展开，以及像 Grok Bot 一样顺手的右侧操作台。**

[![Release](https://img.shields.io/github/v/release/qybaihe/bothub?style=for-the-badge&label=%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC&color=2563eb)](https://github.com/qybaihe/bothub/releases/latest)
[![Apple Notarized](https://img.shields.io/badge/macOS-%E8%8B%B9%E6%9E%9C%E7%AD%BE%E5%90%8D%E4%B8%8E%E5%85%AC%E8%AF%81-16a34a?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/qybaihe/bothub/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%2F11_x64-0078d4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/qybaihe/bothub/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/bothub/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/qybaihe/bothub/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/%E8%AE%B8%E5%8F%AF%E8%AF%81-MIT-38bdf8?style=for-the-badge)](../../LICENSE)

<br />

**[🍎 下载 macOS 版 (Apple 芯片)](https://github.com/qybaihe/bothub/releases/latest) · [💻 下载 macOS 版 (Intel)](https://github.com/qybaihe/bothub/releases/latest) · [🪟 下载 Windows 版](https://github.com/qybaihe/bothub/releases/latest) · [💬 社区讨论](https://github.com/qybaihe/bothub/discussions)**

[为什么用 BotHub](#-为什么用-bothub) · [30 秒快速上手](#-30-秒快速上手) · [支持的平台](#-支持的平台) · [高频实用体验](#-高频实用体验) · [本地开发](#-本地开发) · [常见问题](#-常见问题)

</div>

---

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/bothub-dark.webp">
  <img src="../assets/bothub-light.webp" alt="BotHub 工作台：左侧分组管理所有 Bot，中间流式对话，右侧展开专属操作台" width="100%">
</picture>
</div>

<br />

## 💡 为什么用 BotHub？

当你每天都在用好几家的 AI Agent、甚至同一家还有多个工作号和主力号时，桌面上很快就会塞满四五个客户端和十几个无痕浏览器窗口。**BotHub 用一个干净、轻快的原生客户端解决所有切换负担：**

<table>
<tr>
<td width="33%" valign="top">

### 🗂️ 左侧以 Bot 为单位统一排布
把 **Grok Bot**、**ChatGPT Dot**、**Meta Muse**、**Hark** 放进自定义分组里并排管理。登录 **1 个 Grok Bot 账号**，账号下的所有专业 Bot 会**自动逐个展开在左侧列表**，点击或按 `⌘K` 秒切对话。

</td>
<td width="33%" valign="top">

### 👥 多账号并行，灵活导入不串号
同一个平台同时挂多个账号也完全独立运行。支持**弹窗登录**、**默认浏览器一键授权**、**粘贴 Token / Cookie 导入**、**邮箱验证码批量导入**，还能给每个账号单独绑定代理池 IP。

</td>
<td width="33%" valign="top">

### 🛠️ 右侧专属操作台（`⌘I`）
像 Grok Bot 一样保持中间聊天视野清爽；需要查看子任务进度、整理记忆与技能、管理定时任务、下载文件或查看云端电脑沙盒时，随时点开右侧操作台即可。

</td>
</tr>
</table>

---

## ⚡ 30 秒快速上手

### 1. 下载直接安装

前往 [**最新版本下载页**](https://github.com/qybaihe/bothub/releases/latest) 选择对应安装包：

| 系统 | 安装包文件 | 安装说明 |
| :--- | :--- | :--- |
| **macOS（Apple 芯片 M1–M4）** | `BotHub-<版本号>-arm64.dmg` | **已通过 Apple Developer ID 官方签名与公证**，拖入「应用程序」双击直开，无拦截提示 |
| **macOS（Intel 芯片）** | `BotHub-<版本号>-x64.dmg` | **已通过 Apple Developer ID 官方签名与公证**，直接打开即可使用 |
| **Windows 10 / 11（x64）** | `BotHub-Setup-<版本号>-x64.exe` | 一键安装向导，支持后台自动检查更新 |

### 2. 添加或导入账号（两个清晰入口）

- **入口一 · 左上角 `＋` 新建按钮（`⌘N`）**：选择平台直接打开登录窗口、用默认浏览器一键确认授权，或直接粘贴凭据导入。
- **入口二 · 左下角「设置与账号」**：集中查看所有已接入账号状态、批量导入 Muse / Dot 账号、一键同步 Grok 名下全部 Bot，以及配置代理池。

> 💡 **内置全屏操作指南**：首次打开或点击左下角 **✦ 星标按钮**，即可查看全屏分步图解指南，一步步了解在哪里导入账号、管理哪些平台以及如何使用右侧操作台。

### 3. 开始对话与操控

在左侧点击任意 Bot 即可开始流式对话、发送图片/文件附件或确认操作审批；点击右上角面板图标（或按 **`⌘I`** / Windows **`Ctrl+I`**）即可展开当前 Bot 对应的右侧操作台。

---

## 🤖 支持的平台

右侧操作台会根据不同平台的真实能力自动切换专属面板，没有千篇一律的空壳菜单：

| 平台 | 登录与导入方式 | 左侧列表展示方式 | 右侧专属操作台能力（`⌘I`） |
| :--- | :--- | :--- | :--- |
| **Grok Bot**（`grok.com`） | 弹窗直连登录、**默认浏览器一键授权**，或粘贴 Token / Cookie / JSON / API Key | **1 个账号 → 多个 Bot**：登录一次自动拉取账号下全部 Bot 与群聊房间到左侧列表；已有账号下可直接新建 Bot，无需重复登录 | 历史会话、后台子任务进度、自动化触发器、记忆与技能编辑、生成文件库、云端沙盒终端、MCP 连接器与配方导入导出 |
| **Meta Muse**（`muse.ai`） | 独立窗口登录，或**邮箱列表批量自动收码导入** | 1 个账号对应 1 个独立 Muse 助手（支持十几个账号并行） | 账号额度监控、操作审批确认、多会话切换、定时计划任务、目标设定、记忆与技能、工作区文件预览与云电脑控制 |
| **ChatGPT Dot**（`chatgpt.com/dots`） | 网页弹窗登录，或**单条 / 多行批量粘贴 AT、RT、JSON 导入** | 1 个账号对应 1 个 Dot 助手（自带 Refresh Token 自动续期） | Orbit 角色切换、Dot / Native 双模式切换、核心目标编辑、**换号时一键迁移目标与记忆**、Pages 页面与文件库浏览 |
| **Hark**（`hark.com`） | Google / 邮箱窗口登录，或**直接粘贴 Session Cookie 导入** | 1 个账号对应 1 个 Hark 助手 | 快捷工作流卡片、历史会话切换、定时巡检任务、生成资料库下载、云端浏览器实时画面与工作区连接器 |

---

## ✨ 高频实用体验

- **Grok 单账号极速扩建 Bot**：已经登录过 Grok 账号？点左上角 `+` → 选择 **Grok Bot**，输入名字就能直接在当前账号下新建一个专属 Bot 并出现在左侧列表，或者一键重新同步账号下的全部 Bot。
- **一号一代理自动分配**：在「设置与账号 → 代理池」批量粘贴 `SOCKS5` / `SOCKS5H` / `HTTP` 代理，支持按账号一对一独立分配；代理异常时自动阻断发包，绝不偷偷回退直连暴露真实 IP。
- **自动兼容本地系统代理**：未单独设置账号代理时，登录窗口与后台连接均自动遵循系统网络栈（无缝兼容 Clash / Surge 等日常代理环境）。
- **消息绝不重复误发**：清晰区分「发送中」「已送达 · 回复中」「长时间无回复」与「发送失败」——只要平台已接收消息，绝不会误判为未发送而导致重试发两遍。
- **灵动的 3D 角色头像**：每个 Bot 都拥有会跟随鼠标转动、在思考与回复时做出动作反馈的 `GrokBotMark` 立体角色，支持自定义造型配色或上传图片头像。
- **macOS 与 Windows 一键更新**：签名版支持后台静默下载新版本，顶部轻提示一键重启升级。
- **纯本地存储，零遥测收集**：BotHub 为 MIT 开源独立客户端（与 xAI、OpenAI、Meta、Hark 官方无关），所有会话与凭据仅保存在你自己的电脑本机。

---

## ⌨️ 常用快捷键

| 快捷键（macOS / Windows） | 功能说明 |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | 全局指令面板 —— 秒搜 Bot、分组与快捷操作 |
| `⌘N` / `Ctrl+N` | 新建 Bot 或添加新账号 |
| `⌘I` / `Ctrl+I` | 展开 / 收起当前 Bot 的右侧操作台 |
| `⌘[` · `⌘]` / `Ctrl+[` · `Ctrl+]` | 快速切换到侧边栏上一个 / 下一个 Bot |

---

## 🧰 本地开发

环境要求：**Node.js 22.19+**（推荐 Node 24，详见 [`.nvmrc`](../../.nvmrc)）。

```bash
git clone https://github.com/qybaihe/bothub.git
cd bothub
npm ci
npm run dev          # 启动 Electron + Vite 热更新开发环境
```

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动主进程、Preload 与 React 界面（支持热更新） |
| `npm run typecheck` | 运行 Node 与前端双端 TypeScript 类型检查 |
| `npm test` | 运行 Vitest 单元测试套件 |
| `npm run build` | 类型检查并构建生产产物至 `out/` |
| `npm run dist:dir` | 快速打包 macOS `arm64` 本地测试版应用至 `release/` |
| `npm run dist:mac` / `npm run dist:win` | 打包正式 macOS `.dmg` + `.zip` 或 Windows `.exe` 安装包 |

想参与贡献或接入新的 Agent 平台？欢迎阅读 [**贡献指南 (CONTRIBUTING.md)**](../../CONTRIBUTING.md) 以及 [**`docs/` 协议参考目录**](../README.md)。

---

## ❓ 常见问题

<details>
<summary><b>BotHub 是这些平台的官方客户端吗？</b></summary>

不是。BotHub 是基于 MIT 协议开源的独立桌面客户端，与 xAI、OpenAI、Meta、Hark 均无隶属关系。你使用自己的账号登录，所有请求由你的电脑直接与对应平台通信。

</details>

<details>
<summary><b>macOS 安装打开时会提示「无法验证开发者」或被拦截吗？</b></summary>

不会。自 `v0.5.0` 起，官方发布的 macOS `.dmg` 安装包均已通过 **Apple Developer ID 签名与苹果官方公证（Notarized）**，拖入「应用程序」即可直接双击打开。

</details>

<details>
<summary><b>Grok Bot 的「一个账号对应多个 Bot」是怎么管理的？</b></summary>

在 Grok Bot 中，一个账号名下可以创建多个不同职责的 Bot 和群聊房间。你在 BotHub 登录或导入一次 Grok 账号后，名下全部 Bot 会自动作为独立条目出现在左侧对话列表中。从左侧删除某个 Bot 只会在本地隐藏它，不会退出整个账号；随时点击「同步全部 Bot」即可恢复完整列表。

</details>

<details>
<summary><b>我的账号凭据保存在哪里？</b></summary>

仅保存在你自己的电脑本地（macOS 位于 `~/Library/Application Support/bothub`，Windows 位于 `%APPDATA%\bothub`），并调用系统钥匙串 / DPAPI 保护。BotHub 不包含任何统计埋点或遥测上传。

</details>

---

## 📄 开源许可

基于 [MIT 许可证](../../LICENSE) 开源。如果 BotHub 帮你的桌面省下了十几个浏览器窗口，欢迎点亮右上角的 **⭐ Star** 支持我们！
