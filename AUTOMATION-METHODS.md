# 自動化點擊方法備忘（Edge 擴充選單 → LINE）

本文件記錄「Chrome 擴充 → Native Host → 自動在 Edge 點開 LINE」流程中，
**點擊 Edge 擴充功能按鈕 / LINE 項目** 的各種方法、實測結果與備案。
當 Edge 再次改版導致自動化失效時，先讀這份文件。

---

## 流程回顧

```
① 點 Chrome 擴充圖示 → popup.js
② popup.js 送 Native Message「openLINE」→ com.line.opener
③ Native Host: line_opener_host.bat → line_opener_host.ps1
④ ps1 啟動 auto_click_line.ps1（隱藏視窗）← 真正的自動化
⑤ auto_click_line.ps1：
   • 啟動 Edge (msedge.exe) 開 edge://newtab/
   • 找到工具列的「擴充功能」按鈕並開啟選單
   • 在選單中找到「LINE」並點擊 → 開啟 LINE 網頁
```

第 ⑤ 步是最脆弱處：靠 UI Automation 定位 Edge 介面元素，**Edge 改版會改變元素的
Pattern 支援、名稱與 AutomationId**。

---

## 實測結果（Edge 153.0.4234.32，2026-09-19）

測試方式：每種方法測試前先按 ESC 關閉選單、重新抓按鈕，確保公平；成功 = 選單彈出、
可找到「LINE」項目。

| 代號 | 方法 | 結果 | 備註 |
|------|------|------|------|
| M1 | 實體滑鼠點擊按鈕中心（`mouse_event`） | ✅ 可行 | 需座標、會移動游標 |
| M2 | UIA `ExpandCollapsePattern.Expand()` | ❌ 失效 | `E_FAIL`（COM 錯誤） |
| M3 | UIA `InvokePattern.Invoke()` | ❌ 失效 | `Unsupported Pattern` |
| M4 | 鍵盤 `SetFocus()` + 空白鍵 | ✅ 可行 | 不需座標、不移動游標 |
| M5 | 鍵盤 `SetFocus()` + Enter | ✅ 可行 | 不需座標、不移動游標 |

> **重點**：舊版程式主力用的是 M2/M3（UIA Pattern），這正是 Edge 改版後**整個失效**的原因
> （`Unsupported Pattern` / `E_FAIL`）。鍵盤法（M4/M5）與實體滑鼠（M1）不受影響。

---

## 目前採用的主力方案（v2.4.2）

寫在 `docs/install-script.js` 產生的 `auto_click_line.ps1` 中，採「鍵盤優先、滑鼠墊底」的
fallback 鏈，每一步都確認選單真的開了才繼續：

**開啟擴充選單**（依序嘗試，成功即停）：
1. M5 鍵盤 `SetFocus` + Enter（最穩、不動游標）
2. M4 鍵盤 `SetFocus` + Space
3. M1 實體滑鼠點擊按鈕中心（墊底）

**點擊 LINE 項目**：
1. 實體滑鼠點擊 LINE 項目中心
2. UIA `InvokePattern.Invoke()`（墊底）

**擴充按鈕的定位方式**：改用 ClassName **`EdgeExtensionsHubButton`**（比舊版用的
localized 名稱「擴充功能」/「Extensions」或 AutomationId `view_1015` 更穩定，較不受
Edge 改版與語系影響）。

端到端實測：從乾淨狀態（先關掉既有 LINE 視窗）→ 鍵盤 Enter 開選單 → 滑鼠點 LINE →
LINE 視窗成功開啟，`exit 0`。

---

## 備案（若上述主力再次失效）

依「改動成本由低到高」排序：

### 備案 A：把 LINE 釘選到 Edge 工具列（最簡單、最穩）
若使用者在 Edge 將 LINE 擴充「釘選」到工具列，LINE 按鈕會**直接出現在工具列**，
不必先開「擴充功能」選單。程式可先嘗試直接在工具列找 `Name = "LINE"` 的按鈕並點擊，
找不到再走「開選單 → 點 LINE」流程。
- 優點：少一個步驟、最不容易被 Edge 改版影響。
- 缺點：需引導使用者手動釘選一次。

### 備案 B：改用其他定位條件
若 `EdgeExtensionsHubButton` 這個 ClassName 被 Edge 改掉，可改抓：
- localized 名稱：`擴充功能` / `Extensions`（`NameProperty`）
- AutomationId：`view_1015`（**注意：此 ID 會隨 Edge 版本變動，不建議當主力**）
- 以 `ControlType = Button` + 位置（工具列最右側）啟發式尋找。

### 備案 C：座標校準版滑鼠點擊
若 UIA 完全抓不到按鈕，退回「相對視窗右上角固定位移」的實體滑鼠點擊；
較不穩（受 DPI、視窗大小影響），僅作最後手段。

### 備案 D：改走 Edge 自身的擴充深連結 / LINE 網址
評估是否能以 `msedge.exe <LINE 網址或擴充頁>` 直接開啟，繞過點按鈕。
（目前 LINE 擴充未提供穩定的直接啟動 URL，故未採用；Edge 改版時可重新評估。）

---

## 重新驗證的方法

1. 查 Edge 版本：`(Get-Item "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe").VersionInfo.ProductVersion`
2. 用 `scratchpad/line-test/validate_methods.ps1` 之類的腳本，對 M1~M5 做公平比較。
3. **安全守則（重要）**：任何自動關視窗的腳本，**只能關「執行期間新開、且屬於 `msedge.exe`」
   的視窗**，用視窗 handle 快照比對；比對視窗標題時**務必用大小寫敏感的精確比對**
   （PowerShell `-match` 預設不分大小寫，`line-pro`、VS Code 標題含 "line" 會被 `LINE`
   誤中而誤關 —— 曾因此把編輯器關掉）。
