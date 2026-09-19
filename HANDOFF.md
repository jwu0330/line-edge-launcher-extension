# 🧭 HANDOFF — Open LINE in Edge (Pro) / 交接筆記

> Bilingual dev notes. Read this before continuing work — especially the **Pitfalls** section.
> 雙語開發筆記。接手前請先看,尤其是「踩過的坑」那一節。

---

## 0. Current state / 目前狀態 (TL;DR)

- **Repo**: `github.com/jwu0330/line-edge-launcher-extension`
  (renamed from the old name `line-pro` / 由舊名 `line-pro` 改名而來)
- **Install page (GitHub Pages)**: https://jwu0330.github.io/line-edge-launcher-extension/install.html
- Everything is committed and pushed to `master`. / 所有變更都已提交並推送到 `master`。
- ⚠️ **`install.html` currently defaults to the TEST (local unpacked) ID** `akghapcbfibbmgglgkpnbahgdaakndem` (test mode). Switch it to the Web Store ID `fhgjojnifekiifaenchgammalffepbeg` **only when packaging the release zip** (see §4).
  ⚠️ **目前 `install.html` 預設是「測試(本機未封裝)」ID** `akghapcbfibbmgglgkpnbahgdaakndem`(測試模式)。**只有在打包正式上架 zip 前**才切換成上架版 ID `fhgjojnifekiifaenchgammalffepbeg`(見 §4)。

---

## 1. How it works / 運作原理

```
Click Chrome extension icon
  → popup.js sends Native Message "openLINE"
    → com.line.opener  (registered in HKCU registry)
      → line_opener_host.bat → line_opener_host.ps1
        → launches auto_click_line.ps1 (hidden)
          → opens Edge, opens the extensions flyout, clicks the "LINE" item
            → LINE web opens in Edge
```

- The **Chrome extension** (manifest.json, popup.html, popup.js, icons) is what ships to the Web Store (zipped by `build-extension.ps1`).
  Chrome 擴充本體是上架到 Web Store 的部分(用 `build-extension.ps1` 打包)。
- The **Native Host** (the 3 PowerShell files + the manifest json) is **generated on the user's PC** by the install command from `docs/install.html` + `docs/install-script.js`. It is NOT in the repo.
  Native Host(3 個 PowerShell 檔 + manifest json)是由 `docs/install.html` + `docs/install-script.js` 產生的安裝指令,在使用者電腦上**動態生成**,不在 repo 裡。

---

## 2. Pitfalls we hit / 我們踩過的坑 ⚠️ (MOST IMPORTANT)

### P1. Renaming the repo breaks the GitHub Pages URL / 改 repo 名稱會讓 Pages 網址失效
- Renaming `line-pro` → `line-edge-launcher-extension` made the **old Pages URL 404**.
  改名後**舊的 Pages 網址直接 404**。
- `github.com/...` and `git push` auto-redirect the old name, **but `*.github.io` Pages URLs do NOT redirect.**
  `github.com` 與 `git push` 會自動轉址,**但 `*.github.io` 的 Pages 網址不會轉址。**
- Fix: update every hard-coded URL (popup.js, README, privacy-policy) to the new name.
  解法:把所有寫死的網址(popup.js、README、privacy-policy)改成新名稱。

### P2. Extension ID mismatch = "not installed" / 擴充 ID 對不上 = 顯示「未安裝」
- An **unpacked** extension (載入未封裝項目) gets an ID derived from its folder path (e.g. `oppdld...`), which is **different** from the Web Store ID (`fhgjojni...`).
  「載入未封裝項目」的擴充,ID 是**依資料夾路徑**算出來的(例如 `oppdld...`),跟上架版 ID(`fhgjojni...`)**不一樣**。
- The Native Host's `allowed_origins` MUST match the ID of the extension you are actually clicking, otherwise Chrome blocks the ping and the popup shows "not installed".
  Native Host 的 `allowed_origins` 必須對上「你實際點的那個擴充」的 ID,否則 Chrome 會擋掉 ping,popup 就顯示「未安裝」。
- The install page supports `install.html?id=<ID>` to override the ID.
  安裝頁支援用 `install.html?id=<ID>` 覆寫 ID。

### P3. Re-running an OLD (cached) install page overwrites the config / 跑到舊快取的安裝頁會覆蓋設定
- Copying the install command from a **cached** (not hard-refreshed) install page re-generates the Native Host with the **old** ID/path, silently breaking a working setup.
  從**沒硬重整、被快取**的安裝頁複製指令,會用**舊的** ID/路徑重新產生 Native Host,把原本正常的設定悄悄弄壞。
- Always **Ctrl+F5 hard-refresh** the install page before copying.
  複製前一定要 **Ctrl+F5 硬重整** 安裝頁。

### P4. PowerShell paste: last line needs a trailing newline / PowerShell 貼上最後一行要有結尾換行
- A pasted multi-line command whose last line has **no trailing newline** stops at the prompt and needs an extra Enter.
  貼上的多行指令,如果最後一行**沒有結尾換行**,會停在提示字元、要多按一次 Enter。
- Fix: the copy buttons append `\n` to the command (`command + '\n'`).
  解法:複製按鈕在指令後補上 `\n`。

### P5. Native Host manifest path over-escaping / Native Host manifest 的 path 過度跳脫
- `-replace '\\', '\\\\'` produced **4** backslashes in the JSON (`C:\\\\Users...`); it should produce **2**. Correct is `-replace '\\', '\\'`.
  `-replace '\\', '\\\\'` 會在 JSON 產生 **4** 個反斜線,應該是 **2** 個。正確寫法是 `-replace '\\', '\\'`。
- Windows tolerates mid-path double backslashes, but keep it clean.
  Windows 對路徑中間的雙反斜線有容忍度,但還是要寫對。

### P6. Do NOT inject a BOM when testing native messaging / 測試 native messaging 時別加 BOM
- The host reader is fine. A .NET `Process.StandardInput` StreamWriter **auto-injects a UTF-8 BOM** (`EF BB BF`) that corrupts the 4-byte length prefix, making it *look* like the host can't read the message.
  Host 的讀取是正常的。用 .NET `Process.StandardInput` 送資料時,StreamWriter 會**自動加 UTF-8 BOM**(`EF BB BF`),把 4 byte 長度前綴弄亂,讓人**誤以為**是 host 讀不到訊息。
- To test the host, feed **raw bytes** (e.g. `Start-Process -RedirectStandardInput <file>` with a BOM-free file).
  要測 host,請送**原始位元組**(例如用 `Start-Process -RedirectStandardInput <無BOM檔>`)。

### P7. checkNativeHost timeout too short / 檢測逾時太短
- The old 3-second timeout in `popup.js` occasionally lost to PowerShell cold start → intermittent "not installed".
  `popup.js` 舊的 3 秒逾時偶爾輸給 PowerShell 冷啟動 → 間歇性「未安裝」。
- Fix: raised to 8s + one retry. Normal response is ~1s, so this only affects cold starts.
  解法:改成 8 秒 + 重試一次。正常回應約 1 秒,只影響冷啟動那次。

### P8. 🔴 DANGER: window-closing scripts can kill VS Code / 自動關視窗腳本可能關掉 VS Code
- `-match 'LINE'` in PowerShell is **case-insensitive**, so it matched the VS Code window title `... line-pro ...` and closed the editor (killed the running session).
  PowerShell 的 `-match 'LINE'` **不分大小寫**,會匹配到 VS Code 標題裡的 `line-pro` 而把編輯器關掉(等於殺掉執行中的工作階段)。
- Rule for any auto-close script: only close windows that are **(a) `msedge.exe`**, **(b) newly created this run** (compare window-handle snapshot), and match titles with a **case-sensitive exact** comparison (`-cmatch '^LINE'`). Never touch `Code.exe` / `chrome.exe` / pre-existing windows.
  自動關視窗守則:只關 **(a) `msedge.exe`**、**(b) 本次執行才新開**(用視窗 handle 快照比對)的視窗,標題用**大小寫敏感精確**比對(`-cmatch '^LINE'`)。絕不碰 `Code.exe` / `chrome.exe` / 既有視窗。

### P9. Edge updates break the UI automation / Edge 改版會弄壞 UI 自動化
- The old auto_click used UIA `Invoke/Toggle/Expand` on the extensions button; after an Edge update these return `Unsupported Pattern` / `E_FAIL`.
  舊的 auto_click 用 UIA `Invoke/Toggle/Expand` 點擴充按鈕,Edge 改版後會回 `Unsupported Pattern` / `E_FAIL`。
- Current approach (works on Edge 153): locate the button by **ClassName `EdgeExtensionsHubButton`**, open the flyout with **keyboard Enter/Space**, then click the LINE item with a **physical mouse click**. See `AUTOMATION-METHODS.md` for the full comparison and backups.
  目前做法(Edge 153 實測可行):用 **ClassName `EdgeExtensionsHubButton`** 定位按鈕,用**鍵盤 Enter/Space** 開選單,再用**實體滑鼠點擊** LINE。完整比較與備案見 `AUTOMATION-METHODS.md`。

### P10. Keep the generated auto_click_line.ps1 ASCII / 產生的 auto_click_line.ps1 保持純 ASCII
- Non-ASCII comments risk mis-decoding if the file ever loses its BOM. Put explanatory Chinese in the JS source, keep the emitted `.ps1` ASCII-only.
  非 ASCII 註解在檔案掉了 BOM 時可能被解錯碼。中文說明放在 JS 原始碼,產生出來的 `.ps1` 保持純 ASCII。

---

## 3. Setup on a NEW machine / 換一台電腦怎麼接手

1. `git clone https://github.com/jwu0330/line-edge-launcher-extension.git`
2. Load the extension in Chrome (chrome://extensions → Developer mode → Load unpacked → select the repo root or `dist`).
   在 Chrome 載入擴充(開發人員模式 → 載入未封裝項目 → 選 repo 根目錄或 `dist`)。
3. ⚠️ The unpacked ID on the new machine will be **different** (path-derived). Either:
   ⚠️ 新機器的未封裝 ID 會**不一樣**(依路徑而定),二選一:
   - Set `DEFAULT_EXTENSION_ID` in `docs/install.html` to that new ID, **or**
     把 `docs/install.html` 的 `DEFAULT_EXTENSION_ID` 設成那個新 ID,**或**
   - Install via `install.html?id=<new-unpacked-id>`.
     用 `install.html?id=<新的未封裝ID>` 安裝。
4. Run the install command (from a hard-refreshed install page) in Terminal / PowerShell.
   從硬重整後的安裝頁複製安裝指令,貼到終端機執行。
5. Build the Web Store zip when needed: run `build-extension.ps1` → `line-opener-pro-v<version>-<date>.zip`.
   需要打包上架檔時執行 `build-extension.ps1` → 產生 `line-opener-pro-v<版本>-<日期>.zip`。
   (The zip and `dist/` are git-ignored — they are build outputs, not in the repo. / zip 與 `dist/` 被 gitignore,是建置產物,不在 repo。)

---

## 4. Before PUBLIC launch / 正式上架前檢查清單

- [ ] In `docs/install.html`, set `DEFAULT_EXTENSION_ID = 'fhgjojnifekiifaenchgammalffepbeg'` (the Web Store ID) — **only when packaging the release zip** (otherwise stay in test mode with the local unpacked ID). / 打包正式 zip 前才把 `DEFAULT_EXTENSION_ID` 切成上架版 ID(平時測試模式用本機未封裝 ID)。
- [ ] Push and hard-refresh; confirm the install page generates a host for the Web Store ID. / 推送後硬重整,確認安裝頁產生的是上架版 ID 的 host。
- [ ] Rebuild the zip and upload the new version to the Chrome Web Store. / 重新打包並上傳新版到 Web Store。
- [ ] Existing users must re-run the install command to get the fixed Native Host. / 舊使用者需重跑安裝指令才能拿到修好的 Native Host。

---

## 5. Key files / 重要檔案

| File | Purpose / 用途 |
|------|----------------|
| `manifest.json`, `popup.html`, `popup.js` | Chrome extension (ships to Web Store) / 擴充本體 |
| `docs/install.html` | Install page UI + the `DEFAULT_EXTENSION_ID` config / 安裝頁與 ID 設定 |
| `docs/install-script.js` | Generates the PowerShell install command + the Native Host scripts / 產生安裝指令與 Native Host 腳本 |
| `build-extension.ps1` | Packs the Web Store zip / 打包上架 zip |
| `AUTOMATION-METHODS.md` | Edge click-method comparison + backups / Edge 點擊方法比較與備案 |
| `HANDOFF.md` | This file / 本文件 |

---

## 6. Two extension IDs seen in this project / 本專案出現過的兩個擴充 ID

- `fhgjojnifekiifaenchgammalffepbeg` — Web Store (production) ID / 上架版(正式)ID
- `akghapcbfibbmgglgkpnbahgdaakndem` — unpacked (test, current machine, path-derived) ID / 未封裝(測試,目前這台,依路徑而定)ID
  (path / 路徑: `E:\code\github\新增資料夾\line-edge-launcher-extension`)
- (older test IDs, path-derived on other machines, no longer used: `faoojfgpccfpgjjgomedfbdpcdbjkdej`, `oppdldnoihbknlmdggabmhfiicpadfpd`, `phmpiijeidboekpokjaannamejbkjock`) / (更早的測試 ID,其他機器/路徑算出,已不用)
