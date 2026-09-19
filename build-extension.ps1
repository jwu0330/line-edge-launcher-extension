# Build Chrome Extension for Web Store
$ErrorActionPreference = "Stop"

Write-Host "Building Chrome Extension..." -ForegroundColor Cyan

$outputDir = "dist"
$manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
$version = $manifest.version
$dateStamp = Get-Date -Format "yyyy-MM-dd"
$zipFile = "line-opener-pro-v$version-$dateStamp.zip"

if (Test-Path $outputDir) { Remove-Item $outputDir -Recurse -Force }
if (Test-Path $zipFile) { Remove-Item $zipFile -Force }

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$files = @("manifest.json", "popup.html", "popup.js", "icons")

foreach ($item in $files) {
    if (Test-Path $item) {
        Write-Host "Copying: $item" -ForegroundColor Green
        if (Test-Path $item -PathType Container) {
            Copy-Item $item -Destination $outputDir -Recurse -Force
        } else {
            Copy-Item $item -Destination $outputDir -Force
        }
    }
}

Compress-Archive -Path "$outputDir\*" -DestinationPath $zipFile -Force

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "Output: $zipFile" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round((Get-Item $zipFile).Length / 1KB, 2)) KB" -ForegroundColor Gray
