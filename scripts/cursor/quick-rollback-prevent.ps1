# Quick rollback prevention
$regPath = "HKCU:\Software\Cursor"
if (-not (Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}
Set-ItemProperty -Path $regPath -Name "AutoUpdate" -Value 1 -Type DWord -ErrorAction SilentlyContinue
Set-ItemProperty -Path $regPath -Name "PreventRollback" -Value 1 -Type DWord -ErrorAction SilentlyContinue
Write-Host "Rollback prevention registry settings applied"
