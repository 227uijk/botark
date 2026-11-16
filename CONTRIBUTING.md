# Contributing to BotHub

Thanks for helping make **BotHub** better! Whether you're fixing a UI bug, improving platform login/streaming stability, or adding a brand-new personal AI agent platform, contributions are very welcome.

---

## Quick Local Setup

1. **Prerequisites**: Node.js `22.19+` (Node `24` recommended — matches [`.nvmrc`](.nvmrc) and CI).
2. **Install & start hot reload**:

```bash
git clone https://github.com/qybaihe/bothub.git
cd bothub
npm ci
npm run dev
```

3. **Before opening a Pull Request**, make sure all checks pass locally:

```bash
npm run typecheck
npm test
npm run build
```

---

## Architecture at a Glance

| Directory | Responsibility |
| :--- | :--- |
| `src/adapters/` | Renderer-side `PlatformAdapter` implementations (`meta-muse`, `grokbot`, `hark`, `dot`) and platform catalog |
| `src/main/` | Electron main process: session partitions, login windows, Connect-RPC / Noise / SSE clients, proxy routing, and Keychain storage |
| `src/preload/` | Minimal, strictly typed `window.electron` bridge (`contextIsolation: true`, `sandbox: true`) |
| `src/shared/` | Shared IPC channel contracts and TypeScript types |
| `src/renderer/` | React 19 + Tailwind CSS v4 + Zustand UI (Sidebar, ChatArea, Right-Side Workbench, Settings, Onboarding Guide) |
| `docs/` | Multi-language READMEs and wire-protocol reference docs for each platform |

---

## Adding or Extending a Platform

1. **Keep secrets in Main**: Never expose raw OAuth access/refresh tokens to the renderer process or commit any real tokens, cookies, or user identifiers in tests or sample JSON files.
2. **Honor Account Isolation & Proxy Routing**: Route HTTP/WebSocket traffic through `proxyFetch` / `proxyWsAgent` (`src/main/proxyTransport.ts`) and partition sessions via `applyProxyToPartition` (`src/main/muse/accountProxy.ts`).
3. **Tailor the Right-Side Workbench**: Register only real, working tabs and panels in `src/renderer/src/components/info/platformInspector.ts` and `InfoPanel.tsx` — avoid placeholder buttons.
4. **Add Unit Tests**: Place `<module>.test.ts` alongside new parsers, protocol clients, or store logic so `npm test` covers edge cases.

---

## Pull Request Tips

- Keep PRs focused on one clear improvement or fix.
- Include a short before/after summary (and a screenshot if touching UI).
- Ensure `npm run typecheck && npm test` passes cleanly.
