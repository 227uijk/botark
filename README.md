<div align="center">

<img src="docs/assets/logo.png" alt="BotArk" width="108" />

# BotArk

**All your personal AI agents, aboard one native desktop ark.**

Run **Grok Bot**, **ChatGPT Dot**, **Meta Muse**, and **Hark** side by side on macOS & Windows — with multi-account isolation, automatic 1-account → multi-bot sidebar sync, and a Grok-style right-side workbench.

<p>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/github/v/release/qybaihe/botark?style=flat-square&label=Release&color=2563eb" alt="Latest Release" /></a>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/badge/macOS-Signed_%26_Notarized-16a34a?style=flat-square&logo=apple&logoColor=white" alt="Apple Signed & Notarized" /></a>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/badge/Windows-10%2F11_x64-0078d4?style=flat-square&logo=windows&logoColor=white" alt="Windows 10/11" /></a>
  <a href="https://github.com/qybaihe/botark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/qybaihe/botark/ci.yml?branch=main&style=flat-square&label=CI" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-0ea5e9?style=flat-square" alt="MIT License" /></a>
</p>

<h4>
  <a href="https://github.com/qybaihe/botark/releases/latest">🍎 Download for Mac (Apple Silicon)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">💻 Download for Mac (Intel)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">🪟 Download for Windows</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/discussions">💬 Discussions</a>
</h4>

<sub>
  <b>English</b> ·
  <a href="docs/readme/README_zh.md">简体中文</a> ·
  <a href="docs/readme/README_zh-TW.md">繁體中文</a> ·
  <a href="docs/readme/README_ja.md">日本語</a> ·
  <a href="docs/readme/README_ko.md">한국어</a> ·
  <a href="docs/readme/README_es.md">Español</a> ·
  <a href="docs/readme/README_fr.md">Français</a> ·
  <a href="docs/readme/README_de.md">Deutsch</a> ·
  <a href="docs/readme/README_pt-BR.md">Português</a> ·
  <a href="docs/readme/README_ru.md">Русский</a> ·
  <a href="docs/readme/README_it.md">Italiano</a> ·
  <a href="docs/readme/README_vi.md">Tiếng Việt</a> ·
  <a href="docs/readme/README_tr.md">Türkçe</a> ·
  <a href="docs/readme/README_ar.md">العربية</a> ·
  <a href="docs/readme/README_id.md">Indonesia</a> ·
  <a href="docs/readme/README_hi.md">हिन्दी</a>
</sub>

</div>

<br />

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/botark-dark.webp" />
    <img src="docs/assets/botark-light.webp" alt="BotArk native three-column workspace: bots grouped in the left sidebar, streaming conversation in the center, and tailored right-side workbench" width="100%" />
  </picture>
</div>

---

## ✨ Why BotArk?

Using personal AI agents every day shouldn't mean juggling four separate apps and a dozen incognito browser windows. **BotArk brings every agent into one calm, native desktop workspace:**

<table>
  <tr>
    <td width="46%" valign="middle">
      <h3>🧭 Four Agent Platforms, Two Effortless Entry Points</h3>
      <p>Connect accounts from the top-left <b><code>+</code></b> button (<code>⌘N</code>) or manage your entire fleet in <b>Settings &amp; Accounts</b>:</p>
      <ul>
        <li><b>Popup or 1-Click Browser Sign-In</b> with zero OAuth bounce</li>
        <li><b>Paste Credentials Directly</b> — Access Token, Session Cookie, JSON, or API Key</li>
        <li><b>Batch Fleet Import</b> — import dozens of Meta Muse or ChatGPT Dot accounts in one go</li>
      </ul>
    </td>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/feature-platforms-dark.webp" />
        <img src="docs/assets/feature-platforms-light.webp" alt="BotArk unified onboarding and four-platform import guide" width="100%" />
      </picture>
    </td>
  </tr>
  <tr>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="docs/assets/feature-accounts-dark.webp" />
        <img src="docs/assets/feature-accounts-light.webp" alt="BotArk multi-account management console and 1-account to multi-bot expansion" width="100%" />
      </picture>
    </td>
    <td width="46%" valign="middle">
      <h3>👥 Multi-Account Isolation &amp; 1-Account → Multi-Bot Sync</h3>
      <p>Keep work, personal, and team accounts online side by side without ever crossing sessions:</p>
      <ul>
        <li><b>Grok Bot Roster Auto-Sync</b>: Sign into <i>one</i> Grok account and every bot &amp; room on it expands into the left sidebar automatically</li>
        <li><b>Isolated Partitions</b>: Each account lives in its own sandboxed Chromium partition &amp; OS Keychain vault</li>
        <li><b>1-to-1 Proxy Pool</b>: Bind dedicated <code>SOCKS5</code> / <code>HTTP</code> egress IPs per account with fail-closed leak protection</li>
      </ul>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>🗂️ Bot-First Left Sidebar</h4>
      Organize bots from any platform into custom project sections, pin daily drivers, and jump between conversations in milliseconds via <code>⌘K</code>.
    </td>
    <td width="33%" valign="top">
      <h4>🛠️ Tailored Right Workbench (<code>⌘I</code>)</h4>
      Keep the center chat distraction-free. Toggle the right-hand panel anytime to inspect subagents, edit memories &amp; skills, manage cron jobs, or browse cloud sandbox files.
    </td>
    <td width="34%" valign="top">
      <h4>🔒 100% Local &amp; Telemetry-Free</h4>
      Zero cloud relays, zero analytics. Tokens and cookies stay strictly on your machine, encrypted via macOS Keychain or Windows DPAPI (<code>safeStorage</code>).
    </td>
  </tr>
</table>

---

## 🤖 Supported Agent Platforms

Every platform adapts the right-side workbench (`⌘I`) to its genuine native capabilities — zero placeholder filler:

| Platform | Sign-In & Credential Import | Sidebar Behavior | Right-Side Workbench (`⌘I`) |
| :--- | :--- | :--- | :--- |
| <img src="src/renderer/src/assets/platforms/grok.png" width="18" height="18" align="absmiddle" /> **Grok Bot** | Partition login window, **1-click default browser auth**, or Token / Cookie / JSON / API Key paste | **1 account → many bots**: auto-syncs all agents & group rooms; create new bots without re-logging in | Sessions, live subagent tasks, automations, memories & skills, generated files, cloud sandbox, MCP connectors & recipes |
| <img src="src/renderer/src/assets/platforms/muse.svg" width="18" height="18" align="absmiddle" /> **Meta Muse** | Partition login window or **batch email OTP auto-import** | 1 bot per isolated Muse account (run 10+ accounts in parallel) | Usage quota, Sentinel action approvals, session history, cron schedules, goals, memories, skills, file preview & cloud VM |
| <img src="src/renderer/src/assets/platforms/dot.svg" width="18" height="18" align="absmiddle" /> **ChatGPT Dot** | Web login window or **single / multi-line AT, RT & JSON batch import** | 1 bot per Dot account with automatic Refresh Token renewal | Orbit persona switcher, Dot vs. Native mode, core goal editor, **1-click cross-account memory migration**, and Pages / Library |
| <img src="src/renderer/src/assets/platforms/hark.svg" width="18" height="18" align="absmiddle" /> **Hark** | Google / email login window or **Session Cookie / Token paste** | 1 bot per Hark account | Workflow cards, conversation switcher, scheduled tasks, generated file library, live cloud browser view & connectors |

---

## ⚡ 30-Second Quick Start

### 1. Download & Install

Grab the latest official installer from [**GitHub Releases**](https://github.com/qybaihe/botark/releases/latest):

| Operating System | Installer Package | Highlights |
| :--- | :--- | :--- |
| **macOS (Apple Silicon M1–M4)** | `BotArk-<version>-arm64.dmg` | ✅ **Apple Developer ID signed & notarized** — drag into `Applications` and launch directly |
| **macOS (Intel x64)** | `BotArk-<version>-x64.dmg` | ✅ **Apple Developer ID signed & notarized** — zero Gatekeeper warnings |
| **Windows 10 / 11 (64-bit)** | `BotArk-Setup-<version>-x64.exe` | One-click NSIS setup wizard (preserves local account data on upgrade/uninstall) |

### 2. Connect Accounts & Start Chatting

1. Click **`+` (`⌘N` / `Ctrl+N`)** at the top-left of the sidebar to connect an account, or open **Settings & Accounts** at the bottom-left for batch imports and proxy binding.
2. Select any bot in the left sidebar to stream replies, attach files, or approve tool calls; press **`⌘I` / `Ctrl+I`** anytime to open its right-side workbench.

> [!TIP]
> Click the **✦ Sparkles** button at the bottom-left of the sidebar anytime to launch the built-in **Full-Screen Interactive Guide**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut (macOS / Windows) | Action |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | **Command Palette** — instant search across bots, groups, messages, and commands |
| `⌘N` / `Ctrl+N` | Add a new bot or connect a platform account |
| `⌘I` / `Ctrl+I` | Toggle the tailored right-side workbench for the active bot |
| `⌘[` · `⌘]` / `Ctrl+[` · `Ctrl+]` | Switch to the previous / next bot in the sidebar |

---

## 🧰 Local Development

Requires **Node.js 22.19+** (Node 24 recommended; see [`.nvmrc`](.nvmrc)).

```bash
git clone https://github.com/qybaihe/botark.git
cd botark
npm ci
npm run dev          # Start Electron main, preload & React renderer with hot reload
```

| Script | Description |
| :--- | :--- |
| `npm run dev` | Launch Electron + Vite in hot-reload development mode |
| `npm run typecheck` | Type-check both Node and renderer TypeScript configs |
| `npm test` | Run the Vitest unit test suite |
| `npm run build` | Build production bundles into `out/` |
| `npm run dist:dir` | Package an unpacked macOS `arm64` `.app` in `release/` |
| `npm run dist:mac` / `npm run dist:win` | Build distributable macOS `.dmg` + `.zip` or Windows `.exe` installers |

Want to contribute or integrate a new agent platform? Check out [**CONTRIBUTING.md**](CONTRIBUTING.md) and the protocol reference notes in [**`docs/`**](docs/README.md).

---

## ❓ FAQ

<details>
<summary><b>Is BotArk affiliated with xAI, OpenAI, Meta, or Hark?</b></summary>

No. BotArk is an independent, MIT-licensed desktop client. You sign in with your own accounts, and all requests go directly from your device to each platform.

</details>

<details>
<summary><b>Will macOS show "unverified developer" or Gatekeeper warnings?</b></summary>

No — official macOS `.dmg` releases are signed with an **Apple Developer ID** certificate and **notarized by Apple**. Drag `BotArk.app` into `Applications` and open it normally.

</details>

<details>
<summary><b>How does Grok Bot 1-account → multi-bot sync work?</b></summary>

In Grok Bot, a single user account owns multiple specialized bots and multi-bot rooms. Once you sign into or import a Grok account in BotArk, every bot on that account automatically appears in your left sidebar. Removing one bot locally only hides it from the list without signing out your account, and **Sync All Bots** restores hidden bots anytime.

</details>

<details>
<summary><b>Where are my credentials and conversations stored?</b></summary>

Locally on your computer (`~/Library/Application Support/botark` on macOS, `%APPDATA%\botark` on Windows — with automatic seamless migration if you upgraded from legacy `bothub`), encrypted by your OS Keychain / DPAPI (`safeStorage`).

</details>

---

## 📈 Star History

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
  Released under the <a href="LICENSE"><b>MIT License</b></a>.<br />
  <sub>If <b>BotArk</b> saves your desktop from browser-tab overload, a <b>⭐ Star</b> helps more builders discover it!</sub>
</div>
