<div align="center">

<img src="../assets/logo.png" alt="BotArk" width="108" />

# BotArk

**把你常用的所有 Personal Agent，收進同一個原生桌面客戶端。**

告別滿桌面的獨立應用與十幾個無痕瀏覽器視窗，<br />
在一個乾淨順手的 macOS / Windows 視窗裡並排使用 **Grok Bot**、**ChatGPT Dot**、**Meta Muse** 與 **Hark**。

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
    <img src="../assets/botark-light.webp" alt="BotArk 三欄原生桌面工作台" width="100%" />
  </picture>
</div>

---

## ✨ 核心體驗：從接入到日常協作

現在的 Personal Agent 早已不只是簡單問答——它們有長期記憶、能跑背景子任務、會排程巡檢、還帶著各自的雲端電腦與檔案庫。但只要你同時在用兩三家平台，或者手裡有工作號、個人號好幾個帳號，每天光是找網頁、切無痕視窗、配代理就會被打斷無數次。

**BotArk 把這套碎片化的日常重新理順成了三件事：**

<table>
  <tr>
    <td width="46%" valign="middle">
      <h3>1. 不管幾個平台、多少個帳號，輕鬆收進來</h3>
      <p>無論是單號互動登入還是多號車隊匯入，都能用最順手的方式一步到位：</p>
      <ul>
        <li><b>彈窗直登與預設瀏覽器一鍵授權</b>：自動遵循系統代理，OAuth 驗證不亂跳</li>
        <li><b>全格式憑據貼上直連</b>：支援 Access Token、Cookie、JSON 或 API Key 貼上即用</li>
        <li><b>批次自動匯入</b>：支援 Meta Muse 信箱自動讀取驗證碼批次登入，以及 ChatGPT Dot 多行批次匯入</li>
      </ul>
    </td>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../assets/feature-platforms-dark.webp" />
        <img src="../assets/feature-platforms-light.webp" alt="BotArk 帳號匯入與四大平台概覽" width="100%" />
      </picture>
    </td>
  </tr>
  <tr>
    <td width="54%" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="../assets/feature-accounts-dark.webp" />
        <img src="../assets/feature-accounts-light.webp" alt="BotArk 多帳號控制台與 Grok 單號多 Bot 展開" width="100%" />
      </picture>
    </td>
    <td width="46%" valign="middle">
      <h3>2. 底層帳號徹底隔離，列表按 Bot 直觀平鋪</h3>
      <p>在底層，每個帳號都運行在獨立的 Chromium 沙盒分區與系統鑰匙圈加密槽位中，同一平台掛十幾個帳號也絕不串號，還支援在代理池中<b>一號一 IP 獨立綁定</b>（代理異常自動阻斷，絕不裸連暴露真實 IP）。</p>
      <p>在介面上，左側始終以<b>單個 Bot</b> 為單位清爽排列：登入 1 個 <b>Grok Bot</b> 帳號，名下所有專業 Bot 與群聊房間會自動逐個展開到側邊欄，也能直接在已有帳號下新建專屬 Bot。</p>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>🗂️ 跨平台混編分組（<code>⌘K</code>）</h4>
      按「日常助理 / 研究寫作 / 開發維運」而不是按廠商來歸類你的助手；常用 Bot 一鍵置頂，按 <code>⌘K</code> 秒搜秒切。
    </td>
    <td width="33%" valign="top">
      <h4>🛠️ 按需展開右側操作台（<code>⌘I</code>）</h4>
      平時收起面板保持聊天視野乾淨；需要查子任務進度、改長期記憶與技能、管排程任務或下載沙盒檔案時，一鍵呼出。
    </td>
    <td width="34%" valign="top">
      <h4>🛡️ 防重發狀態機 &amp; 純本地隱私</h4>
      精確區分「發送中 / 已接收 / 失敗」，平台已受理的訊息絕不誤判重發。無任何雲端中轉與遙測埋點，資料 100% 留在本機。
    </td>
  </tr>
</table>

---

## 🤖 四大平台原生能力一覽

| 平台 | 支援的登入與匯入方式 | 帳號與側邊欄關係 | 右側專屬操作台（`⌘I`） |
| :--- | :--- | :--- | :--- |
| <img src="../../src/renderer/src/assets/platforms/grok.png" width="18" height="18" align="absmiddle" /> **Grok Bot** | 彈窗登入、**預設瀏覽器一鍵授權**，或貼上 Token / Cookie / JSON / API Key | **1 個帳號 → 自動展開多個 Bot**（支援直接在已有帳號下新建 Bot） | 歷史會話、背景子任務、自動化觸發器、記憶與技能編輯、檔案庫、雲端沙盒終端、MCP 連接器與配方匯入匯出 |
| <img src="../../src/renderer/src/assets/platforms/muse.svg" width="18" height="18" align="absmiddle" /> **Meta Muse** | 獨立分區視窗登入，或**信箱列表自動收碼批次匯入** | 1 個獨立帳號 → 1 個 Muse 助手（支援多號並行） | 額度即時監控、Sentinel 操作審批、多會話切換、排程任務、長期目標、記憶與技能、檔案預覽與雲電腦視圖 |
| <img src="../../src/renderer/src/assets/platforms/dot.svg" width="18" height="18" align="absmiddle" /> **ChatGPT Dot** | 網頁彈窗登入，或**單條 / 多行批次貼上 AT、RT、JSON 匯入** | 1 個帳號 → 1 個 Dot 助手（內建 Refresh Token 自動續期） | Orbit 角色切換、Dot / Native 雙模式、核心目標編輯、**換號一鍵遷移目標與記憶**、Pages 頁面與檔案庫 |
| <img src="../../src/renderer/src/assets/platforms/hark.svg" width="18" height="18" align="absmiddle" /> **Hark** | Google / 信箱視窗登入，或**貼上 Session Cookie 匯入** | 1 個帳號 → 1 個 Hark 助手 | 快捷工作流卡片、歷史會話切換、排程巡檢任務、生成檔案下載、雲端瀏覽器即時畫面與工作區連接器 |

---

## ⚡ 30 秒快速開始

前往 [**GitHub Releases 最新版本**](https://github.com/qybaihe/botark/releases/latest) 下載安裝包：

- **macOS（Apple 晶片 / Intel）**：`BotArk-<版本號>-arm64.dmg` / `x64.dmg`（✅ **Apple Developer ID 官方簽章與公證**，拖入「應用程式」即可直接開啟）
- **Windows 10 / 11（64 位元）**：`BotArk-Setup-<版本號>-x64.exe`

---

## 🗺️ 後續計畫（Roadmap）

- [ ] **接入 Claude Duet**：原生適配 Anthropic **Claude Duet**（主動提醒、操作審批、雲端虛擬機檔案與記憶／技能管理）。
- [ ] **推出 Android & iOS 行動端**：隨時在手機上與各平台 Agent 對話與接收通知，並**支援直接匯入帳號**。
- [ ] **多帳號與效率持續增強**：持續完善批次匯入、全域快捷鍵與跨平台任務整合。

---

## 🤝 社群與致謝

- 感謝 [**LINUX DO**](https://linux.do/) 社群與各位開發者的交流、回饋與支持。
- 歡迎在 [**GitHub Discussions**](https://github.com/qybaihe/botark/discussions) 分享你的多 Agent 工作流或建議下一個想接入的平台。

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
  基於 <a href="../../LICENSE"><b>MIT 授權條款</b></a> 開源。<br />
  <sub>如果 <b>BotArk</b> 讓你的多 Agent 日常清爽了不少，歡迎點亮右上角的 <b>⭐ Star</b> 支持我們！</sub>
</div>
