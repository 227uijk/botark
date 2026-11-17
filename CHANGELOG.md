# Changelog

All notable changes to **BotHub** are documented in this file.

## [0.5.0] - 2026-11-16

### Added
- **Official Apple Developer ID Signed & Notarized macOS Builds**: Both `arm64` (Apple Silicon) and `x64` (Intel) `.dmg` & `.zip` installers open directly without Gatekeeper warnings and support 1-click in-app updates.
- **Grok Bot 1-Account → Multi-Bot Sidebar Sync**: Signing into or importing a single Grok Bot account automatically populates every agent and group room under that account as an individual Bot in the left sidebar. Create new bots on an existing account without re-authenticating.
- **Zero-Bounce Grok Sign-In & Universal Credential Import**: Keeps OAuth popups (Google, X, Apple, GitHub) inside the login partition, blocks external deep-link app hijacking, honors OS system proxies (e.g. Clash / Surge), supports **1-click default browser authorization**, and imports Access Tokens, Cookies, JSON, or API Keys directly.
- **Tailored Right-Side Workbench (`⌘I`)**: Product-specific panels for **Grok Bot**, **ChatGPT Dot**, **Meta Muse**, and **Hark** covering sessions, subagent tasks, memories, skills, schedules, cloud sandboxes, and file libraries.
- **Full-Screen Interactive Quick Guide**: Step-by-step visual walkthrough of the three-column layout, account import entry points, and right-side workbench.

## [0.4.0] - 2026-11-09

### Added
- Multi-platform workspace uniting **Meta Muse**, **Grok Bot**, **Hark**, and **ChatGPT Dot** in one Electron + React desktop client.
- Per-account isolated partitions, Keychain-encrypted token storage, and 1-to-1 HTTP / SOCKS5 proxy pool routing.
- Streaming chat with tool-call traces, interactive approvals, document canvas, and animated `GrokBotMark` avatars.
