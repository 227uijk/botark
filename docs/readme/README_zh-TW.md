<div align="center">

<img src="../assets/logo.png" alt="BotArk" width="108" />

# BotArk

**把你所有的 Personal Agent，收進同一艘原生桌面方舟。**

在一個清爽的 macOS / Windows 原生視窗裡並排使用 **Grok Bot**、**ChatGPT Dot**、**Meta Muse** 與 **Hark** —— 支援多帳號獨立在線、Grok 單號多 Bot 自動展開，以及像 Grok Bot 一樣順手的右側操作台。

<p>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/github/v/release/qybaihe/botark?style=flat-square&label=%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC&color=2563eb" alt="最新版本" /></a>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/badge/macOS-%E8%98%8B%E6%9E%9C%E7%B0%BD%E7%AB%A0%E8%88%87%E5%85%AC%E8%AD%89-16a34a?style=flat-square&logo=apple&logoColor=white" alt="蘋果簽章與公證" /></a>
  <a href="https://github.com/qybaihe/botark/releases/latest"><img src="https://img.shields.io/badge/Windows-10%2F11_x64-0078d4?style=flat-square&logo=windows&logoColor=white" alt="Windows 10/11" /></a>
  <a href="https://github.com/qybaihe/botark/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/qybaihe/botark/ci.yml?branch=main&style=flat-square&label=CI" alt="CI 狀態" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/%E6%8E%88%E6%AC%8A-MIT-0ea5e9?style=flat-square" alt="MIT 授權" /></a>
</p>

<h4>
  <a href="https://github.com/qybaihe/botark/releases/latest">🍎 下載 macOS 版 (Apple 晶片)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">💻 下載 macOS 版 (Intel)</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/releases/latest">🪟 下載 Windows 版</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/qybaihe/botark/discussions">💬 社群討論</a>
</h4>

<sub>
  <a href="../../README.md">English</a> ·
  <a href="README_zh.md">简体中文</a> ·
  <b>繁體中文</b> ·
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
    <img src="../assets/botark-light.webp" alt="BotArk 三欄原生工作台" width="100%" />
  </picture>
</div>

---

## ✨ 為什麼選擇 BotArk？

每天重度使用多家 Personal Agent、甚至同一家還有多個工作號與主力號時，桌面上很快就會塞滿四五個客戶端和十幾個無痕瀏覽器視窗。**BotArk 用一個輕快、克制的原生桌面端徹底消除切換負擔：**

<table>
  <tr>
    <td width="46%" valign="middle">
      <h3>🧭 四大平台聚合，兩種零門檻接入入口</h3>
      <p>點擊左上角 <b><code>＋</code></b> 新建按鈕（<code>⌘N</code>）或打開左下角<b>「設定與帳號」</b>，靈活接入所有主力平台：</p>
      <ul>
        <li><b>絲滑彈窗與瀏覽器一鍵授權</b>：自動遵循系統代理，OAuth 登入不亂跳</li>
        <li><b>全格式憑據貼上直連</b>：支援 Access Token、Cookie、JSON 或 API Key 直接匯入</li>
        <li><b>車隊級批次匯入</b>：支援 Meta Muse 信箱自動收碼批次匯入與 ChatGPT Dot 多行批次匯入</li>
      </ul>
    </td>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../assets/feature-platforms-dark.webp" />
        <img src="../assets/feature-platforms-light.webp" alt="BotArk 四大平台接入規則與匯入方式全覽" width="100%" />
      </picture>
    </td>
  </tr>
  <tr>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../assets/feature-accounts-dark.webp" />
        <img src="../assets/feature-accounts-light.webp" alt="BotArk 多帳號隔離控制台與 Grok 單號多 Bot 自動展開" width="100%" />
      </picture>
    </td>
    <td width="46%" valign="middle">
      <h3>👥 多帳號並行不串號 &amp; 單號多 Bot 自動展開</h3>
      <p>工作號、個人號、測試號同時在線，會話完全獨立互不干擾：</p>
      <ul>
        <li><b>Grok 單號自動展開全部 Bot</b>：登入 1 個 Grok 帳號，名下所有專業 Bot 與群聊房間自動逐個出現在左側列表，並可直接新建專屬 Bot</li>
        <li><b>獨立沙盒分區隔離</b>：每個帳號運行在獨立 Chromium 會話分區，憑據由系統鑰匙圈加密儲存</li>
        <li><b>一號一代理防洩漏</b>：支援批次匯入 <code>SOCKS5</code> / <code>HTTP</code> 代理池一對一綁定，代理異常自動阻斷絕不裸連暴露真實 IP</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🤖 支援的智慧體平台

| 平台 | 登入與憑據匯入方式 | 左側列表展示邏輯 | 右側專屬操作台能力（`⌘I`） |
| :--- | :--- | :--- | :--- |
| <img src="../../src/renderer/src/assets/platforms/grok.png" width="18" height="18" align="absmiddle" /> **Grok Bot** | 彈窗直連登入、**預設瀏覽器一鍵授權**，或貼上 Token / Cookie / JSON / API Key | **1 個帳號 → 多個 Bot**：自動同步帳號下全部 Bot 與群聊房間；可在已有帳號下直接新建 Bot | 歷史會話、背景子任務進度、自動化觸發器、記憶與技能編輯、生成檔案庫、雲端沙盒終端、MCP 連接器與配方匯入匯出 |
| <img src="../../src/renderer/src/assets/platforms/muse.svg" width="18" height="18" align="absmiddle" /> **Meta Muse** | 獨立視窗登入，或**信箱列表批次自動收碼匯入** | 1 個帳號對應 1 個獨立 Muse 助手 | 帳號額度監控、操作審批確認、多會話切換、排程任務、目標設定、記憶與技能、工作區檔案預覽與雲電腦控制 |
| <img src="../../src/renderer/src/assets/platforms/dot.svg" width="18" height="18" align="absmiddle" /> **ChatGPT Dot** | 網頁彈窗登入，或**單條 / 多行批次貼上 AT、RT、JSON 匯入** | 1 個帳號對應 1 個 Dot 助手（內建 Refresh Token 自動續期） | Orbit 角色切換、Dot / Native 雙模式切換、核心目標編輯、**換號一鍵遷移目標與記憶**、Pages 頁面與檔案庫瀏覽 |
| <img src="../../src/renderer/src/assets/platforms/hark.svg" width="18" height="18" align="absmiddle" /> **Hark** | Google / 信箱視窗登入，或**直接貼上 Session Cookie 匯入** | 1 個帳號對應 1 個 Hark 助手 | 快捷工作流卡片、歷史會話切換、排程巡檢任務、生成資料庫下載、雲端瀏覽器即時畫面與工作區連接器 |

---

## ⚡ 30 秒快速上手

前往 [**GitHub Releases 最新版本**](https://github.com/qybaihe/botark/releases/latest) 下載安裝包：

- **macOS（Apple 晶片 / Intel）**：`BotArk-<版本號>-arm64.dmg` / `x64.dmg`（**Apple Developer ID 官方簽章與公證**，拖入「應用程式」即可直接開啟）
- **Windows 10 / 11（64 位元）**：`BotArk-Setup-<版本號>-x64.exe`

---

## 📈 Star 增長趨勢

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
  基於 <a href="../../LICENSE"><b>MIT 授權條款</b></a> 開源。歡迎點亮右上角的 <b>⭐ Star</b> 支持 <b>BotArk</b>！
</div>
