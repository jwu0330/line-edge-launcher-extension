<#
Native Host installer for "Open LINE in Edge (Pro)".
Takes the Chrome extension ID as an explicit parameter instead of relying on
a hard-coded default (see HANDOFF.md P2/P3) - avoids stale-ID overwrites.

Usage:
  .\install-native-host.ps1 -ExtensionId <the-id-shown-on-chrome://extensions>
  .\install-native-host.ps1 -Uninstall
#>
param(
    [string]$ExtensionId,
    [switch]$Uninstall
)

if ($Uninstall) {
    Remove-Item "$env:LOCALAPPDATA\LineOpenerPro" -Recurse -Force -ErrorAction SilentlyContinue
    reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.line.opener" /f | Out-Null
    Write-Host "已解除安裝" -ForegroundColor Green
    exit 0
}

if (-not $ExtensionId) {
    Write-Host "請帶上擴充功能 ID，例如：" -ForegroundColor Red
    Write-Host '  .\install-native-host.ps1 -ExtensionId oppdldnoihbknlmdggabmhfiicpadfpd'
    Write-Host "ID 在 chrome://extensions 這個擴充卡片上可以看到。"
    exit 1
}
if ($ExtensionId -notmatch '^[a-p]{32}$') {
    Write-Host "這個 ID 格式看起來不對（應該是 32 個 a-p 的字母）：$ExtensionId" -ForegroundColor Red
    exit 1
}

$extId = $ExtensionId
$installDir = "$env:LOCALAPPDATA\LineOpenerPro\native-host"
New-Item -ItemType Directory -Path $installDir -Force | Out-Null

Set-Content "$installDir\line_opener_host.bat" -Value @'
@echo off
REM Native Messaging Host
powershell -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "%~dp0line_opener_host.ps1"
'@ -Encoding ASCII

Set-Content "$installDir\line_opener_host.ps1" -Value @'
$lengthBytes = New-Object byte[] 4
$stdin = [Console]::OpenStandardInput()
$bytesRead = $stdin.Read($lengthBytes, 0, 4)
if ($bytesRead -eq 0) { exit 0 }
$messageLength = [BitConverter]::ToInt32($lengthBytes, 0)
$messageBytes = New-Object byte[] $messageLength
$stdin.Read($messageBytes, 0, $messageLength) | Out-Null
$messageJson = [System.Text.Encoding]::UTF8.GetString($messageBytes)
$message = $messageJson | ConvertFrom-Json
if ($message.action -eq 'ping') {
    $response = @{ success = $true; message = "Native Host is running"; version = "2.4.2" } | ConvertTo-Json -Compress
} elseif ($message.action -eq 'openLINE') {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $autoClickScript = Join-Path $scriptDir "auto_click_line.ps1"
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -NoProfile -NonInteractive -File `"$autoClickScript`"" -WindowStyle Hidden
    $response = @{ success = $true; message = "LINE opener triggered" } | ConvertTo-Json -Compress
} else {
    $response = @{ success = $false; error = "Unknown action: $($message.action)" } | ConvertTo-Json -Compress
}
$responseBytes = [System.Text.Encoding]::UTF8.GetBytes($response)
$lengthBytes = [BitConverter]::GetBytes($responseBytes.Length)
$stdout = [Console]::OpenStandardOutput()
$stdout.Write($lengthBytes, 0, 4)
$stdout.Write($responseBytes, 0, $responseBytes.Length)
$stdout.Flush()
'@ -Encoding UTF8

Set-Content "$installDir\auto_click_line.ps1" -Value @'
$ErrorActionPreference = "Continue"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NC {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
    public const int SW_RESTORE = 9;
    public static void Click(int x, int y){ SetCursorPos(x,y); System.Threading.Thread.Sleep(120); mouse_event(0x02,0,0,0,UIntPtr.Zero); System.Threading.Thread.Sleep(60); mouse_event(0x04,0,0,0,UIntPtr.Zero); }
}
"@
$TS = [System.Windows.Automation.TreeScope]::Descendants
$AE = [System.Windows.Automation.AutomationElement]
$edgePath = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) { $edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" }
$edge = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
$sleepTime = if ($edge) { 2 } else { 3 }
Start-Process $edgePath "edge://newtab/"
Start-Sleep -Seconds $sleepTime
function Get-HubButton {
    $wins = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
    foreach ($w in $wins) {
        $el = $AE::FromHandle($w.MainWindowHandle)
        if ($el) {
            $cond = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, "EdgeExtensionsHubButton")
            $btn = $el.FindFirst($TS, $cond)
            if ($btn) { return @{ hwnd = $w.MainWindowHandle; btn = $btn } }
        }
    }
    return $null
}
function Find-Line($hwnd) {
    $el = $AE::FromHandle($hwnd)
    if (-not $el) { return $null }
    $cond = New-Object System.Windows.Automation.PropertyCondition($AE::NameProperty, "LINE")
    return $el.FindFirst($TS, $cond)
}
$m = $null
for ($i = 0; $i -lt 8 -and -not $m; $i++) { $m = Get-HubButton; if (-not $m) { Start-Sleep -Milliseconds 800 } }
if (-not $m) { exit 1 }
$hwnd = $m.hwnd
[NC]::ShowWindow($hwnd, [NC]::SW_RESTORE) | Out-Null
[NC]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 400
[System.Windows.Forms.SendKeys]::SendWait("{ESC}")
Start-Sleep -Milliseconds 400
$opened = $false
# method 1: keyboard SetFocus + Enter
$m = Get-HubButton
if ($m) {
    try { $m.btn.SetFocus(); Start-Sleep -Milliseconds 200; [System.Windows.Forms.SendKeys]::SendWait("{ENTER}") } catch {}
    Start-Sleep -Milliseconds 1000
    if (Find-Line $hwnd) { $opened = $true }
}
# method 2: keyboard SetFocus + Space
if (-not $opened) {
    [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 300
    $m = Get-HubButton
    if ($m) {
        try { $m.btn.SetFocus(); Start-Sleep -Milliseconds 200; [System.Windows.Forms.SendKeys]::SendWait(" ") } catch {}
        Start-Sleep -Milliseconds 1000
        if (Find-Line $hwnd) { $opened = $true }
    }
}
# method 3: physical mouse click (fallback)
if (-not $opened) {
    [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 300
    $m = Get-HubButton
    if ($m) {
        try { $r = $m.btn.Current.BoundingRectangle; [NC]::SetForegroundWindow($hwnd) | Out-Null; Start-Sleep -Milliseconds 150; [NC]::Click([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)) } catch {}
        Start-Sleep -Milliseconds 1000
        if (Find-Line $hwnd) { $opened = $true }
    }
}
if (-not $opened) { exit 1 }
# click LINE: physical mouse click, UIA Invoke fallback
$line = Find-Line $hwnd
if (-not $line) { exit 1 }
$success = $false
try {
    $r = $line.Current.BoundingRectangle
    if ($r.Width -gt 0 -and $r.Height -gt 0) { [NC]::Click([int]($r.X + $r.Width / 2), [int]($r.Y + $r.Height / 2)); $success = $true }
} catch {}
if (-not $success) {
    try { $line.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke(); $success = $true } catch {}
}
if ($success) { exit 0 }
exit 1
'@ -Encoding UTF8

$hostPath = "$installDir\line_opener_host.bat" -replace '\\', '\\'
$manifest = @"
{
  "name": "com.line.opener",
  "description": "LINE Opener Native Host",
  "path": "$hostPath",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$extId/"
  ]
}
"@
Set-Content "$installDir\com.line.opener.json" -Value $manifest -Encoding UTF8

reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.line.opener" /ve /t REG_SZ /d "$installDir\com.line.opener.json" /f | Out-Null

Write-Host "安裝完成！ExtensionId = $extId" -ForegroundColor Green
Write-Host "請回到 Chrome 點擊擴充圖示測試。"
