# Cursor 캐시 정리 스크립트
# 안전한 캐시만 삭제 (설정 파일 보존)

param(
    [switch]$PreserveSettings,
    [switch]$PreserveExtensions,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

Write-Host "🧹 Cursor 캐시 정리 시작..." -ForegroundColor Cyan
Write-Host ""

# Cursor 프로세스 확인
$cursorProcesses = Get-Process | Where-Object { $_.ProcessName -like "*Cursor*" }
if ($cursorProcesses) {
    Write-Host "⚠️  Cursor가 실행 중입니다. 캐시 정리를 위해 종료하시겠습니까? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host "   Cursor 프로세스 종료 중..." -ForegroundColor Gray
        foreach ($proc in $cursorProcesses) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        Write-Host "   ✅ 프로세스 종료 완료" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 캐시 정리를 취소합니다." -ForegroundColor Red
        exit 0
    }
}

# 안전하게 삭제할 캐시 경로
$cachePaths = @(
    @{
        Path = "$env:LOCALAPPDATA\Cursor\Cache"
        Description = "메인 캐시"
        Safe = $true
    },
    @{
        Path = "$env:LOCALAPPDATA\Cursor\Code Cache"
        Description = "코드 캐시"
        Safe = $true
    },
    @{
        Path = "$env:LOCALAPPDATA\Cursor\GPUCache"
        Description = "GPU 캐시"
        Safe = $true
    },
    @{
        Path = "$env:LOCALAPPDATA\Cursor\ShaderCache"
        Description = "셰이더 캐시"
        Safe = $true
    },
    @{
        Path = "$env:LOCALAPPDATA\Cursor\logs"
        Description = "로그 파일"
        Safe = $true
    },
    @{
        Path = "$env:TEMP\Cursor"
        Description = "임시 파일"
        Safe = $true
    },
    @{
        Path = "$env:LOCALAPPDATA\Cursor\CachedData"
        Description = "캐시된 데이터"
        Safe = $true
    }
)

# 보존할 경로 (설정 파일)
$preservePaths = @(
    "$env:USERPROFILE\.cursor\settings.json",
    "$env:APPDATA\Cursor\User\settings.json",
    "$env:APPDATA\Cursor\User\keybindings.json",
    "$env:APPDATA\Cursor\User\snippets",
    "$env:APPDATA\Cursor\User\extensions"
)

Write-Host "📋 캐시 정리 대상:" -ForegroundColor Yellow

$totalSize = 0
$itemsToDelete = @()

foreach ($cacheItem in $cachePaths) {
    $path = $cacheItem.Path
    if (Test-Path $path) {
        try {
            $size = (Get-ChildItem -Path $path -Recurse -ErrorAction SilentlyContinue | 
                     Measure-Object -Property Length -Sum).Sum
            $sizeMB = [math]::Round($size / 1MB, 2)
            $totalSize += $sizeMB
            
            Write-Host "   • $($cacheItem.Description): $sizeMB MB" -ForegroundColor Gray
            $itemsToDelete += $cacheItem
        } catch {
            Write-Host "   ⚠️  크기 확인 실패: $path" -ForegroundColor Yellow
            $itemsToDelete += $cacheItem
        }
    }
}

if ($itemsToDelete.Count -eq 0) {
    Write-Host "   ℹ️  정리할 캐시가 없습니다." -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "   총 크기: $totalSize MB" -ForegroundColor Cyan
Write-Host ""

# 보존할 항목 확인
if ($PreserveSettings) {
    Write-Host "📋 보존할 항목:" -ForegroundColor Yellow
    foreach ($preservePath in $preservePaths) {
        if (Test-Path $preservePath) {
            Write-Host "   ✓ $preservePath" -ForegroundColor Green
        }
    }
    Write-Host ""
}

if ($PreserveExtensions) {
    Write-Host "   ✓ 확장 프로그램 보존" -ForegroundColor Green
    Write-Host ""
}

# 확인 프롬프트
Write-Host "⚠️  위의 캐시를 삭제하시겠습니까? (Y/N)" -ForegroundColor Yellow
$confirm = Read-Host

if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "   ❌ 캐시 정리를 취소합니다." -ForegroundColor Red
    exit 0
}

# 캐시 삭제 실행
Write-Host ""
Write-Host "🗑️  캐시 삭제 중..." -ForegroundColor Yellow

$deletedCount = 0
$failedCount = 0

foreach ($cacheItem in $itemsToDelete) {
    $path = $cacheItem.Path
    try {
        Write-Host "   삭제 중: $($cacheItem.Description)..." -ForegroundColor Gray
        Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
        Write-Host "   ✅ 삭제 완료" -ForegroundColor Green
        $deletedCount++
    } catch {
        Write-Host "   ⚠️  삭제 실패: $($_.Exception.Message)" -ForegroundColor Yellow
        $failedCount++
    }
}

# 보존 경로 확인
if ($PreserveSettings) {
    Write-Host ""
    Write-Host "✅ 보존된 설정 파일:" -ForegroundColor Green
    foreach ($preservePath in $preservePaths) {
        if (Test-Path $preservePath) {
            Write-Host "   ✓ $preservePath" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "✅ 캐시 정리 완료!" -ForegroundColor Green
Write-Host "   삭제된 항목: $deletedCount개" -ForegroundColor White
if ($failedCount -gt 0) {
    Write-Host "   실패한 항목: $failedCount개" -ForegroundColor Yellow
}
Write-Host "   정리된 크기: 약 $totalSize MB" -ForegroundColor White
Write-Host ""
Write-Host "💡 Cursor를 다시 실행하면 캐시가 자동으로 재생성됩니다." -ForegroundColor Cyan
Write-Host ""
