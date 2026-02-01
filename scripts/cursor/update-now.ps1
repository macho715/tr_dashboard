# Quick Cursor update script
$ErrorActionPreference = "Continue"

Write-Host "Step 1: Stopping Cursor processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*Cursor*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Step 2: Downloading latest Cursor..." -ForegroundColor Yellow
$url = "https://downloader.cursor.sh/windows/x64"
$dest = "$env:TEMP\CursorSetup.exe"
try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Write-Host "Download complete" -ForegroundColor Green
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Step 3: Installing Cursor..." -ForegroundColor Yellow
if (Test-Path $dest) {
    Start-Process -FilePath $dest -ArgumentList "/S" -Wait -NoNewWindow
    Write-Host "Installation complete" -ForegroundColor Green
} else {
    Write-Host "Installer not found" -ForegroundColor Red
    exit 1
}

Write-Host "Step 4: Verifying installation..." -ForegroundColor Yellow
$cursorExe = "$env:LOCALAPPDATA\Programs\Cursor\Cursor.exe"
if (Test-Path $cursorExe) {
    $version = (Get-Item $cursorExe).VersionInfo.FileVersion
    Write-Host "Cursor installed successfully. Version: $version" -ForegroundColor Green
} else {
    Write-Host "Installation verification failed" -ForegroundColor Yellow
}

Write-Host "Step 5: Applying rollback prevention..." -ForegroundColor Yellow
$regPath = "HKCU:\Software\Cursor"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name "AutoUpdate" -Value 1 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $regPath -Name "PreventRollback" -Value 1 -Type DWord -ErrorAction SilentlyContinue
Write-Host "Rollback prevention applied" -ForegroundColor Green

Write-Host "Step 6: Cleanup..." -ForegroundColor Yellow
Remove-Item $dest -ErrorAction SilentlyContinue
Write-Host "Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "Cursor update completed!" -ForegroundColor Cyan
Write-Host "Please restart Cursor to use the new version." -ForegroundColor White
