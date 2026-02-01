# Cursor 전체 업데이트 통합 스크립트
# 업데이트 + 롤백 방지 설정을 한 번에 실행

param(
    [switch]$SkipCacheClean,
    [switch]$PreserveSettings,
    [switch]$SkipRollbackPrevention,
    [string]$DownloadUrl = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# 스크립트 디렉토리 확인
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cursorScriptDir = Join-Path $scriptDir "cursor"

if (-not (Test-Path $cursorScriptDir)) {
    Write-Host "❌ scripts/cursor 디렉토리를 찾을 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Cursor 전체 업데이트 프로세스" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 관리자 권한 확인
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "❌ 관리자 권한이 필요합니다." -ForegroundColor Red
    Write-Host "   PowerShell을 관리자 권한으로 실행해주세요." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   실행 방법:" -ForegroundColor Cyan
    Write-Host "   1. PowerShell을 우클릭" -ForegroundColor White
    Write-Host "   2. '관리자 권한으로 실행' 선택" -ForegroundColor White
    Write-Host "   3. 이 스크립트 다시 실행" -ForegroundColor White
    Write-Host ""
    exit 1
}

# 설정 파일 로드
$configPath = Join-Path $cursorScriptDir "cursor-update-config.json"
$config = $null

if (Test-Path $configPath) {
    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        Write-Host "✅ 설정 파일 로드 완료" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  설정 파일 로드 실패 (기본값 사용): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 단계 1: 캐시 정리 (선택사항)
if (-not $SkipCacheClean) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   단계 1/3: 캐시 정리" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $cleanScript = Join-Path $cursorScriptDir "clean-cursor-cache.ps1"
    if (Test-Path $cleanScript) {
        try {
            $preserveFlag = if ($PreserveSettings) { "-PreserveSettings" } else { "" }
            $keepLogsFlag = if ($config -and $config.cache.keepLogs) { "-KeepLogs" } else { "" }
            
            & $cleanScript $preserveFlag $keepLogsFlag
        } catch {
            Write-Host "⚠️  캐시 정리 스크립트 실행 실패: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   계속 진행합니다..." -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  캐시 정리 스크립트를 찾을 수 없습니다: $cleanScript" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  단계 1/3: 캐시 정리 건너뛰기" -ForegroundColor Gray
}

# 단계 2: Cursor 업데이트
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   단계 2/3: Cursor 업데이트" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$updateScript = Join-Path $cursorScriptDir "update-cursor.ps1"
if (Test-Path $updateScript) {
    try {
        $skipCacheFlag = if ($SkipCacheClean) { "-SkipCacheClean" } else { "" }
        $preserveFlag = if ($PreserveSettings) { "-PreserveSettings" } else { "" }
        $urlParam = if ($DownloadUrl) { "-DownloadUrl `"$DownloadUrl`"" } else { "" }
        
        $params = @()
        if ($skipCacheFlag) { $params += $skipCacheFlag }
        if ($preserveFlag) { $params += $preserveFlag }
        if ($urlParam) { $params += $urlParam }
        
        & $updateScript @params
        
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
            Write-Host ""
            Write-Host "❌ 업데이트 실패 (종료 코드: $LASTEXITCODE)" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } catch {
        Write-Host ""
        Write-Host "❌ 업데이트 스크립트 실행 실패: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 업데이트 스크립트를 찾을 수 없습니다: $updateScript" -ForegroundColor Red
    exit 1
}

# 단계 3: 롤백 방지 설정
if (-not $SkipRollbackPrevention) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   단계 3/3: 롤백 방지 설정" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $rollbackScript = Join-Path $cursorScriptDir "prevent-rollback.ps1"
    if (Test-Path $rollbackScript) {
        try {
            & $rollbackScript
            
            if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
                Write-Host ""
                Write-Host "⚠️  롤백 방지 설정에 일부 문제가 있을 수 있습니다 (종료 코드: $LASTEXITCODE)" -ForegroundColor Yellow
                Write-Host "   수동으로 확인하시기 바랍니다." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  롤백 방지 스크립트 실행 실패: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "   수동으로 설정하시기 바랍니다." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  롤백 방지 스크립트를 찾을 수 없습니다: $rollbackScript" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  단계 3/3: 롤백 방지 설정 건너뛰기" -ForegroundColor Gray
}

# 완료 요약
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ 전체 업데이트 프로세스 완료!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. Cursor를 실행하여 업데이트 확인" -ForegroundColor White
Write-Host "  2. Settings → Updates에서 자동 업데이트 활성화 확인" -ForegroundColor White
Write-Host "  3. 정기적으로 캐시 정리 실행 (clean-cursor-cache.ps1)" -ForegroundColor White
Write-Host ""

Write-Host "도움말:" -ForegroundColor Cyan
Write-Host "  - 캐시만 정리: .\scripts\cursor\clean-cursor-cache.ps1" -ForegroundColor Gray
Write-Host "  - 업데이트만: .\scripts\cursor\update-cursor.ps1" -ForegroundColor Gray
Write-Host "  - 롤백 방지만: .\scripts\cursor\prevent-rollback.ps1" -ForegroundColor Gray
Write-Host ""
