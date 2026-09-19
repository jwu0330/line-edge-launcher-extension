// 安裝腳本生成器 - 所有內容都在這裡，不需要從網路下載

function generateInstallCommand(extensionId) {
    // 使用字符串拼接而不是模板字串，避免特殊字符問題
    var cmd = '# LINE Opener Pro - 安裝指令（無需網路下載）\n';
    cmd += '$extId = "' + extensionId + '"\n';
    cmd += '$installDir = "$env:LOCALAPPDATA\\LineOpenerPro\\native-host"\n';
    cmd += 'New-Item -ItemType Directory -Path $installDir -Force | Out-Null\n\n';

    // line_opener_host.bat
    cmd += '# 建立 line_opener_host.bat\n';
    cmd += 'Set-Content "$installDir\\line_opener_host.bat" -Value @\'\n';
    cmd += '@echo off\n';
    cmd += 'REM Native Messaging Host\n';
    cmd += 'powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "%~dp0line_opener_host.ps1"\n';
    cmd += '\'@ -Encoding ASCII\n\n';

    // line_opener_host.ps1
    cmd += '# 建立 line_opener_host.ps1\n';
    cmd += 'Set-Content "$installDir\\line_opener_host.ps1" -Value @\'\n';
    cmd += '$lengthBytes = New-Object byte[] 4\n';
    cmd += '$stdin = [Console]::OpenStandardInput()\n';
    cmd += '$bytesRead = $stdin.Read($lengthBytes, 0, 4)\n';
    cmd += 'if ($bytesRead -eq 0) { exit 0 }\n';
    cmd += '$messageLength = [BitConverter]::ToInt32($lengthBytes, 0)\n';
    cmd += '$messageBytes = New-Object byte[] $messageLength\n';
    cmd += '$stdin.Read($messageBytes, 0, $messageLength) | Out-Null\n';
    cmd += '$messageJson = [System.Text.Encoding]::UTF8.GetString($messageBytes)\n';
    cmd += '$message = $messageJson | ConvertFrom-Json\n';
    cmd += 'if ($message.action -eq \'ping\') {\n';
    cmd += '    $response = @{ success = $true; message = "Native Host is running"; version = "2.4.2" } | ConvertTo-Json -Compress\n';
    cmd += '} elseif ($message.action -eq \'openLINE\') {\n';
    cmd += '    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path\n';
    cmd += '    $autoClickScript = Join-Path $scriptDir "auto_click_line.ps1"\n';
    cmd += '    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File `"$autoClickScript`"" -WindowStyle Hidden\n';
    cmd += '    $response = @{ success = $true; message = "LINE opener triggered" } | ConvertTo-Json -Compress\n';
    cmd += '} else {\n';
    cmd += '    $response = @{ success = $false; error = "Unknown action: $($message.action)" } | ConvertTo-Json -Compress\n';
    cmd += '}\n';
    cmd += '$responseBytes = [System.Text.Encoding]::UTF8.GetBytes($response)\n';
    cmd += '$lengthBytes = [BitConverter]::GetBytes($responseBytes.Length)\n';
    cmd += '$stdout = [Console]::OpenStandardOutput()\n';
    cmd += '$stdout.Write($lengthBytes, 0, 4)\n';
    cmd += '$stdout.Write($responseBytes, 0, $responseBytes.Length)\n';
    cmd += '$stdout.Flush()\n';
    cmd += '\'@ -Encoding UTF8\n\n';

    // auto_click_line.ps1 (v3 - Edge 相容版：鍵盤 Enter 開選單優先，滑鼠點擊墊底)
    // 說明：Edge 改版後，舊的 UIA Invoke/Toggle/Expand 對擴充功能按鈕已失效（Unsupported Pattern / E_FAIL）。
    //       經實測 Edge 153，可行方法為「鍵盤 SetFocus+Enter/Space」與「實體滑鼠點擊」；此處採鍵盤優先、滑鼠墊底的 fallback。
    //       擴充按鈕改以 ClassName「EdgeExtensionsHubButton」定位，較不受 Edge 版本影響。
    cmd += '# 建立 auto_click_line.ps1\n';
    cmd += 'Set-Content "$installDir\\auto_click_line.ps1" -Value @\'\n';
    cmd += '$ErrorActionPreference = "Continue"\n';
    cmd += 'Add-Type -AssemblyName UIAutomationClient\n';
    cmd += 'Add-Type -AssemblyName UIAutomationTypes\n';
    cmd += 'Add-Type -AssemblyName System.Windows.Forms\n';
    cmd += 'Add-Type @"\n';
    cmd += 'using System;\n';
    cmd += 'using System.Runtime.InteropServices;\n';
    cmd += 'public class NC {\n';
    cmd += '    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);\n';
    cmd += '    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);\n';
    cmd += '    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);\n';
    cmd += '    [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);\n';
    cmd += '    public const int SW_RESTORE = 9;\n';
    cmd += '    public static void Click(int x, int y){ SetCursorPos(x,y); System.Threading.Thread.Sleep(120); mouse_event(0x02,0,0,0,UIntPtr.Zero); System.Threading.Thread.Sleep(60); mouse_event(0x04,0,0,0,UIntPtr.Zero); }\n';
    cmd += '}\n';
    cmd += '"@\n';
    cmd += '$TS = [System.Windows.Automation.TreeScope]::Descendants\n';
    cmd += '$AE = [System.Windows.Automation.AutomationElement]\n';
    cmd += '$edgePath = "$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe"\n';
    cmd += 'if (-not (Test-Path $edgePath)) { $edgePath = "${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe" }\n';
    cmd += '$edge = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1\n';
    cmd += '$sleepTime = if ($edge) { 2 } else { 3 }\n';
    cmd += 'Start-Process $edgePath "edge://newtab/"\n';
    cmd += 'Start-Sleep -Seconds $sleepTime\n';
    cmd += 'function Get-HubButton {\n';
    cmd += '    $wins = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }\n';
    cmd += '    foreach ($w in $wins) {\n';
    cmd += '        $el = $AE::FromHandle($w.MainWindowHandle)\n';
    cmd += '        if ($el) {\n';
    cmd += '            $cond = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, "EdgeExtensionsHubButton")\n';
    cmd += '            $btn = $el.FindFirst($TS, $cond)\n';
    cmd += '            if ($btn) { return @{ hwnd = $w.MainWindowHandle; btn = $btn } }\n';
    cmd += '        }\n';
    cmd += '    }\n';
    cmd += '    return $null\n';
    cmd += '}\n';
    cmd += 'function Find-Line($hwnd) {\n';
    cmd += '    $el = $AE::FromHandle($hwnd)\n';
    cmd += '    if (-not $el) { return $null }\n';
    cmd += '    $cond = New-Object System.Windows.Automation.PropertyCondition($AE::NameProperty, "LINE")\n';
    cmd += '    return $el.FindFirst($TS, $cond)\n';
    cmd += '}\n';
    cmd += '$m = $null\n';
    cmd += 'for ($i = 0; $i -lt 8 -and -not $m; $i++) { $m = Get-HubButton; if (-not $m) { Start-Sleep -Milliseconds 800 } }\n';
    cmd += 'if (-not $m) { exit 1 }\n';
    cmd += '$hwnd = $m.hwnd\n';
    cmd += '[NC]::ShowWindow($hwnd, [NC]::SW_RESTORE) | Out-Null\n';
    cmd += '[NC]::SetForegroundWindow($hwnd) | Out-Null\n';
    cmd += 'Start-Sleep -Milliseconds 400\n';
    cmd += '[System.Windows.Forms.SendKeys]::SendWait("{ESC}")\n';
    cmd += 'Start-Sleep -Milliseconds 400\n';
    cmd += '$opened = $false\n';
    cmd += '# method 1: keyboard SetFocus + Enter\n';
    cmd += '$m = Get-HubButton\n';
    cmd += 'if ($m) {\n';
    cmd += '    try { $m.btn.SetFocus(); Start-Sleep -Milliseconds 200; [System.Windows.Forms.SendKeys]::SendWait("{ENTER}") } catch {}\n';
    cmd += '    Start-Sleep -Milliseconds 1000\n';
    cmd += '    if (Find-Line $hwnd) { $opened = $true }\n';
    cmd += '}\n';
    cmd += '# method 2: keyboard SetFocus + Space\n';
    cmd += 'if (-not $opened) {\n';
    cmd += '    [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 300\n';
    cmd += '    $m = Get-HubButton\n';
    cmd += '    if ($m) {\n';
    cmd += '        try { $m.btn.SetFocus(); Start-Sleep -Milliseconds 200; [System.Windows.Forms.SendKeys]::SendWait(" ") } catch {}\n';
    cmd += '        Start-Sleep -Milliseconds 1000\n';
    cmd += '        if (Find-Line $hwnd) { $opened = $true }\n';
    cmd += '    }\n';
    cmd += '}\n';
    cmd += '# method 3: physical mouse click (fallback)\n';
    cmd += 'if (-not $opened) {\n';
    cmd += '    [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 300\n';
    cmd += '    $m = Get-HubButton\n';
    cmd += '    if ($m) {\n';
    cmd += '        try { $r = $m.btn.Current.BoundingRectangle; [NC]::SetForegroundWindow($hwnd) | Out-Null; Start-Sleep -Milliseconds 150; [NC]::Click([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)) } catch {}\n';
    cmd += '        Start-Sleep -Milliseconds 1000\n';
    cmd += '        if (Find-Line $hwnd) { $opened = $true }\n';
    cmd += '    }\n';
    cmd += '}\n';
    cmd += 'if (-not $opened) { exit 1 }\n';
    cmd += '# click LINE: physical mouse click, UIA Invoke fallback\n';
    cmd += '$line = Find-Line $hwnd\n';
    cmd += 'if (-not $line) { exit 1 }\n';
    cmd += '$success = $false\n';
    cmd += 'try {\n';
    cmd += '    $r = $line.Current.BoundingRectangle\n';
    cmd += '    if ($r.Width -gt 0 -and $r.Height -gt 0) { [NC]::Click([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)); $success = $true }\n';
    cmd += '} catch {}\n';
    cmd += 'if (-not $success) {\n';
    cmd += '    try { $line.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke(); $success = $true } catch {}\n';
    cmd += '}\n';
    cmd += 'if ($success) { exit 0 }\n';
    cmd += 'exit 1\n';
    cmd += '\'@ -Encoding UTF8\n\n';

    // manifest
    cmd += '# 建立 manifest\n';
    cmd += '$hostPath = "$installDir\\line_opener_host.bat" -replace \'\\\\\', \'\\\\\'\n';
    cmd += '$manifest = @"\n';
    cmd += '{\n';
    cmd += '  "name": "com.line.opener",\n';
    cmd += '  "description": "LINE Opener Native Host",\n';
    cmd += '  "path": "$hostPath",\n';
    cmd += '  "type": "stdio",\n';
    cmd += '  "allowed_origins": [\n';
    cmd += '    "chrome-extension://$extId/"\n';
    cmd += '  ]\n';
    cmd += '}\n';
    cmd += '"@\n';
    cmd += 'Set-Content "$installDir\\com.line.opener.json" -Value $manifest -Encoding UTF8\n\n';

    // 註冊
    cmd += '# 註冊到 Chrome\n';
    cmd += 'reg add "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.line.opener" /ve /t REG_SZ /d "$installDir\\com.line.opener.json" /f | Out-Null\n\n';

    cmd += 'Write-Host "安裝完成！(v3 - Edge 相容版)" -ForegroundColor Green\n';
    cmd += 'Write-Host "請回到 Chrome 重新點一下擴充圖示即可（會自動偵測，無需按任何按鈕）" -ForegroundColor Cyan';

    return cmd;
}
