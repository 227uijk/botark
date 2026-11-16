# Security Policy

## Local-First Privacy Model

BotHub is a local-only desktop client:

- **Zero Telemetry**: BotHub runs no backend servers and collects no analytics, crash dumps, or usage metrics.
- **OS Keychain Protection**: Account tokens and proxy credentials are encrypted locally via Electron `safeStorage` (macOS Keychain / Windows DPAPI) with owner-only (`0600`) file permissions.
- **Session Isolation**: Web sessions run in isolated Chromium `persist:` partitions with `contextIsolation: true` and `sandbox: true`.

## Supported Versions

Security fixes are shipped in the latest release on [GitHub Releases](https://github.com/qybaihe/bothub/releases/latest).

| Version | Supported |
| :--- | :--- |
| `0.5.x` (Latest) | ✅ Yes |
| `< 0.5.0` | ❌ Please upgrade to the latest release |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities (such as credential leakage, sandbox escapes, or proxy bypass bugs).

Instead, use [**GitHub Private Vulnerability Reporting**](https://github.com/qybaihe/bothub/security/advisories/new) on this repository so we can investigate and ship a fix promptly.
