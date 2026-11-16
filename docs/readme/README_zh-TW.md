<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · **繁體中文** · [日本語](README_ja.md) · [한국어](README_ko.md) · [Español](README_es.md) · [Français](README_fr.md) · [Deutsch](README_de.md) · [Português (Brasil)](README_pt-BR.md) · [Русский](README_ru.md) · [Italiano](README_it.md) · [Tiếng Việt](README_vi.md) · [Türkçe](README_tr.md) · [العربية](README_ar.md) · [Bahasa Indonesia](README_id.md) · [हिन्दी](README_hi.md)

<br />

<img src="../assets/logo.png" alt="BotHub" width="88" />

# BotHub

### **把你所有的 Personal Agent 收進同一個原生桌面工作台**

**在同一個視窗裡同時使用 Grok Bot、ChatGPT Dot、Meta Muse 與 Hark —— 支援多帳號獨立在線、單帳號多 Bot 自動展開，以及像 Grok Bot 一樣順手的右側操作台。**

[![Release](https://img.shields.io/github/v/release/qybaihe/bothub?style=for-the-badge&label=%E6%9C%80%E6%96%B0%E7%89%88%E6%9C%AC&color=2563eb)](https://github.com/qybaihe/bothub/releases/latest)
[![Apple Notarized](https://img.shields.io/badge/macOS-Apple_%E7%B0%BD%E7%AB%A0%E8%88%87%E5%85%AC%E8%AD%89-16a34a?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/qybaihe/bothub/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-10%2F11_x64-0078d4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/qybaihe/bothub/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/qybaihe/bothub/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/qybaihe/bothub/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/%E6%8E%88%E6%AC%8A%E6%A2%9D%E6%AC%BE-MIT-38bdf8?style=for-the-badge)](../../LICENSE)

<br />

**[🍎 下載 macOS 版 (Apple 晶片)](https://github.com/qybaihe/bothub/releases/latest) · [💻 下載 macOS 版 (Intel)](https://github.com/qybaihe/bothub/releases/latest) · [🪟 下載 Windows 版](https://github.com/qybaihe/bothub/releases/latest) · [💬 社群討論](https://github.com/qybaihe/bothub/discussions)**

</div>

---

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/bothub-dark.webp">
  <img src="../assets/bothub-light.webp" alt="BotHub 工作台：左側分組管理所有 Bot，中間串流對話，右側展開專屬操作台" width="100%">
</picture>
</div>

<br />

## 💡 為什麼選擇 BotHub？

<table>
<tr>
<td width="33%" valign="top">

### 🗂️ 左側以 Bot 為單位統一排布
將 **Grok Bot**、**ChatGPT Dot**、**Meta Muse**、**Hark** 放進自訂分組並排管理。登入 **1 個 Grok Bot 帳號**，名下全部專業 Bot 會**自動逐個展開在左側列表**，點擊或按 `⌘K` 秒切對話。

</td>
<td width="33%" valign="top">

### 👥 多帳號並行，靈活匯入不串號
同一平台同時登入多個帳號也完全獨立運作。支援**視窗登入**、**預設瀏覽器一鍵授權**、**貼上 Token / Cookie 匯入**、**信箱驗證碼批次匯入**，並支援單帳號獨立綁定代理池 IP。

</td>
<td width="33%" valign="top">

### 🛠️ 右側專屬操作台（`⌘I`）
像 Grok Bot 一樣保持中間對話視野清爽；需要檢視子任務進度、整理記憶與技能、管理排程任務、下載檔案或檢視雲端電腦沙盒時，隨時展開右側操作台即可。

</td>
</tr>
</table>

---

## ⚡ 30 秒快速上手

從 [**最新版本下載頁**](https://github.com/qybaihe/bothub/releases/latest) 下載對應系統的安裝檔：

| 系統 | 安裝檔 | 說明 |
| :--- | :--- | :--- |
| **macOS（Apple 晶片 M1–M4）** | `BotHub-<版本號>-arm64.dmg` | **已通過 Apple Developer ID 官方簽章與公證**，拖入「應用程式」即可直接開啟 |
| **macOS（Intel 晶片）** | `BotHub-<版本號>-x64.dmg` | **已通過 Apple Developer ID 官方簽章與公證**，無需額外指令解鎖 |
| **Windows 10 / 11（x64）** | `BotHub-Setup-<版本號>-x64.exe` | 一鍵安裝精靈，支援背景自動檢查更新 |

1. **新增或匯入帳號**：點擊左上角 **`＋`**（`⌘N`）選擇平台登入，或點擊左下角 **「設定與帳號」** 集中匯入與管理全部帳號。
2. **全螢幕操作指南**：點擊左下角 **✦ 星標按鈕** 可隨時開啟全螢幕分步指南。
3. **對話與右側操作台**：左側點選 Bot 開始對話，按 **`⌘I`**（Windows 為 `Ctrl+I`）展開右側專屬操作台。

---

## 🤖 支援的平台

| 平台 | 登入與匯入方式 | 左側列表呈現 | 右側專屬操作台能力（`⌘I`） |
| :--- | :--- | :--- | :--- |
| **Grok Bot**（`grok.com`） | 彈窗登入、**預設瀏覽器一鍵授權**，或貼上 Token / Cookie / JSON / API Key | **1 個帳號 → 多個 Bot**：自動將帳號下全部 Bot 與群組房間同步至左側列表；可直接在現有帳號下新建 Bot | 歷史會話、背景子任務、自動化觸發器、記憶與技能、檔案庫、雲端沙盒終端與配方匯入匯出 |
| **Meta Muse**（`muse.ai`） | 獨立視窗登入，或**信箱清單批次自動收碼匯入** | 1 個帳號對應 1 個獨立 Muse 助手 | 額度監控、操作審批、多會話切換、排程任務、目標與記憶、工作區檔案預覽與雲端電腦 |
| **ChatGPT Dot**（`chatgpt.com/dots`） | 網頁視窗登入，或**單筆 / 多行批次貼上 AT、RT、JSON** | 1 個帳號對應 1 個 Dot 助手（支援 RT 自動續期） | Orbit 角色切換、Dot / Native 雙模式、核心目標編輯、**換號一鍵遷移記憶**、Pages 與檔案庫 |
| **Hark**（`hark.com`） | Google / 信箱視窗登入，或**貼上 Session Cookie** | 1 個帳號對應 1 個 Hark 助手 | 快捷工作流卡片、歷史對話、排程巡檢任務、檔案庫下載、雲端瀏覽器即時畫面與連接器 |

---

## 🧰 本地開發

需要 **Node.js 22.19+**（建議 Node 24，見 [`.nvmrc`](../../.nvmrc)）：

```bash
git clone https://github.com/qybaihe/bothub.git
cd bothub
npm ci
npm run dev
```

更多開發與貢獻說明請參閱 [**CONTRIBUTING.md**](../../CONTRIBUTING.md) 與 [**`docs/` 協議文件**](../README.md)。

---

## 📄 授權條款

基於 [MIT 授權條款](../../LICENSE) 開源。如果 BotHub 幫你省下了滿桌面的瀏覽器分頁，歡迎在右上角點亮一顆 **⭐ Star**！
