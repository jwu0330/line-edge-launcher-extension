# 🚀 Open LINE in Edge (Pro)

一鍵從 Chrome 開啟 Edge 的 LINE，無確認對話框，完全自動化。

[![Version](https://img.shields.io/badge/version-2.5.1-green.svg)](https://github.com/jwu0330/line-edge-launcher-extension/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ✨ 特色

- ⚡ **無確認對話框** - 使用 Chrome Native Messaging API
- 🎯 **完全自動化** - 自動點擊 LINE 圖示
- 🔒 **安全可靠** - Chrome 官方 API，開源可審查
- 💻 **一鍵安裝** - 複製指令到 PowerShell 即可

---

## 📥 快速開始

### 1. 安裝擴充程式

**開發版本（目前）：**
- 下載 [ZIP](https://github.com/jwu0330/line-edge-launcher-extension/archive/refs/heads/master.zip) 並解壓縮
- Chrome 前往 `chrome://extensions/`
- 開啟「開發人員模式」
- 點擊「載入未封裝項目」，選擇解壓後的資料夾

**Chrome Web Store（即將推出）：**
- 直接在 Chrome Web Store 安裝

### 2. 安裝 Native Host

1. 點擊 Chrome 工具列上的擴充圖示
2. 首次使用會顯示安裝引導，點「執行安裝腳本」開啟安裝頁
3. 依安裝頁指示：複製指令 → 開啟 PowerShell（`Win + X`）→ 貼上執行
4. 回到 Chrome 重新點一下擴充圖示（會自動偵測，無需按任何按鈕）

### 3. 完成！

之後只需點擊圖示，LINE 就會自動在 Edge 中開啟（約 3 秒）

---

## 🔧 系統需求

- Windows 10/11
- Chrome 瀏覽器
- Microsoft Edge（已安裝 LINE 擴充功能）
- PowerShell 5.0+（Windows 內建）

---

## ❓ 常見問題

### 如何解除安裝？

在擴充程式的安裝頁面複製「解除安裝指令」，貼到 PowerShell 執行，然後在 Chrome 移除擴充程式。

### 安裝在哪裡？

- 位置：`%LOCALAPPDATA%\LineOpenerPro\`
- 不需要管理員權限
- 可以完全移除

### 點擊圖示沒反應？

1. 確認已執行安裝指令
2. 重新點一下擴充圖示（會自動重新偵測）
3. 必要時到 `chrome://extensions` 重新載入擴充程式

---

## 🛠️ 專案結構

```
line-edge-launcher-extension/
├── manifest.json              # Chrome 擴充程式配置
├── popup.html                 # 擴充程式 UI
├── popup.js                   # 擴充程式邏輯
├── icons/                     # 圖示
├── docs/
│   ├── install.html           # 安裝頁面
│   └── install-script.js      # 一鍵安裝腳本生成器
└── build-extension.ps1        # 打包腳本（用於發佈到 Chrome Web Store）
```

**註：** Native Host 檔案由 `install-script.js` 動態生成到用戶的 `%LOCALAPPDATA%\LineOpenerPro\` 目錄。

---

## 📝 更新日誌

### v2.5.1 (2026-09-20)
- 🔄 提高 Native Host 需求版本，用於驗證「偵測到舊版 → 需要更新」的提示流程
- 🧪 測試模式：`install.html` 預設 ID 使用本機未封裝 ID（打包正式上架 zip 時才切換為 Web Store ID）

### v2.5.0 (2026-09-20)
- 🚀 正式發佈版：預設擴充 ID 切換為 Chrome Web Store 上架版 ID（`fhgjojni…`）
- 🔄 新增 Native Host 版本偵測：擴充啟動時會比對已安裝的 Host 版本，若過舊會顯示「需要更新」並引導重新安裝（重新安裝為覆蓋更新，不殘留舊檔）
- 📝 修正 README 與安裝頁提示中過時的操作教學（移除已不存在的「開始安裝 / 重新檢測」按鈕說明，改為「重新點圖示自動偵測」流程）
- 🧹 移除 popup 未使用的 CSS（`.button.secondary`）

### v2.4.2 (2026-09-19)
- 🐛 修復 Edge 改版後自動化失效問題（改用「鍵盤 Enter 開啟擴充選單 + 滑鼠點擊」的相容方案，取代已失效的 UIA Invoke/Toggle/Expand）
- 🎯 擴充功能按鈕改以 ClassName `EdgeExtensionsHubButton` 定位，較不受 Edge 改版影響
- 🔗 修正安裝頁連結（GitHub Pages 網址更新為 line-edge-launcher-extension）

### v2.4.0 (2025-11-24)
- 🎨 全新米白色主題設計
- ✨ 分頁式安裝介面（安裝/解除安裝/開始執行）
- 🧹 移除 native-host 資料夾（改由 install-script.js 動態生成）
- 🧹 移除 background.js（無實際功能）
- 🔧 修復 popup.js 雙重啟動問題
- ⚡ 簡化 Edge 啟動邏輯
- 📱 精簡 popup 介面，移除 Extension ID 顯示和重新檢測按鈕
- 💡 提供清晰的使用說明和錯誤處理指引
- 🔗 新增 Edge LINE 安裝引導（複製網址方式）
- 🧹 清理未使用的 CSS 樣式

### v2.3.0 (2025-11-23)
- 🎨 簡化安裝頁面，只保留安裝和解除安裝指令
- 🧹 清理不必要的測試腳本和文件
- 📦 準備發佈到 Chrome Web Store

### v2.2.0 (2025-11-24)
- ✨ 一鍵 PowerShell 安裝
- ✨ 智能安裝引導系統
- ✨ 自動檢測 Native Host 狀態

---

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE)

---

## 📞 支援

- 🐛 [回報問題](https://github.com/jwu0330/line-edge-launcher-extension/issues)
- 💬 [討論區](https://github.com/jwu0330/line-edge-launcher-extension/discussions)

---

**⭐ 如果這個專案對你有幫助，請給個星星！**
