# Cursor 업데이트 스크립트
# 관리자 권한으로 실행 필요

param(
    [switch]$SkipCacheClean,
    [switch]$PreserveSettings,
    [string]$DownloadUrl = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"

# 관리자 권한 확인
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "❌ 관리자 권한이 필요합니다. PowerShell을 관리자 권한으로 실행해주세요." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Cursor 업데이트 프로세스 시작..." -ForegroundColor Cyan
Write-Host ""

# 1단계: Cursor 프로세스 완전 종료
Write-Host "📋 1단계: Cursor 프로세스 종료 중..." -ForegroundColor Yellow
$cursorProcesses = Get-Process | Where-Object { $_.ProcessName -like "*Cursor*" -or $_.MainWindowTitle -like "*Cursor*" }

if ($cursorProcesses) {
    Write-Host "   발견된 Cursor 프로세스: $($cursorProcesses.Count)개" -ForegroundColor Gray
    foreach ($proc in $cursorProcesses) {
        try {
            Write-Host "   종료 중: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Host "   ⚠️  프로세스 종료 실패: $($proc.ProcessName)" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "   ✅ 프로세스 종료 완료" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  실행 중인 Cursor 프로세스가 없습니다." -ForegroundColor Gray
}

# 2단계: 앱 데이터 및 캐시 삭제
if (-not $SkipCacheClean) {
    Write-Host ""
    Write-Host "📋 2단계: 앱 데이터 및 캐시 삭제 중..." -ForegroundColor Yellow
    
    $pathsToClean = @(
        "$env:USERPROFILE\AppData\Local\Programs\Cursor",
        "$env:USERPROFILE\AppData\Local\Cursor",
        "$env:USERPROFILE\AppData\Roaming\Cursor",
        "$env:LOCALAPPDATA\Cursor\Cache",
        "$env:TEMP\Cursor"
    )
    
    if (-not $PreserveSettings) {
        $pathsToClean += @(
            "$env:USERPROFILE\.cursor*"
        )
    }
    
    foreach ($path in $pathsToClean) {
        if (Test-Path $path) {
            try {
                Write-Host "   삭제 중: $path" -ForegroundColor Gray
                Remove-Item -Path $path -Recurse -Force -ErrorAction Stop
                Write-Host "   ✅ 삭제 완료" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  삭제 실패: $path - $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
    
    # 레지스트리 정리 (선택사항)
    try {
        $regPath = "HKCU:\Software\Cursor"
        if (Test-Path $regPath) {
            Write-Host "   레지스트리 정리 중..." -ForegroundColor Gray
            Remove-Item -Path $regPath -Recurse -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "   ⚠️  레지스트리 정리 실패 (무시 가능)" -ForegroundColor Yellow
    }
    
    Write-Host "   ✅ 캐시 정리 완료" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⏭️  2단계: 캐시 정리 건너뛰기 (--SkipCacheClean)" -ForegroundColor Gray
}

# 3단계: 최신 버전 다운로드
Write-Host ""
Write-Host "📋 3단계: 최신 버전 다운로드 중..." -ForegroundColor Yellow

$downloadDir = "$env:TEMP\CursorUpdate"
if (-not (Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
}

# Cursor 공식 다운로드 URL (Windows)
if ([string]::IsNullOrEmpty($DownloadUrl)) {
    $DownloadUrl = "https://downloader.cursor.sh/windows/x64"
    Write-Host "   공식 다운로드 URL 사용: $DownloadUrl" -ForegroundColor Gray
} else {
    Write-Host "   사용자 지정 URL 사용: $DownloadUrl" -ForegroundColor Gray
}

$installerPath = Join-Path $downloadDir "CursorSetup.exe"

try {
    Write-Host "   다운로드 중..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "   ✅ 다운로드 완료: $installerPath" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 다운로드 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4단계: 설치
Write-Host ""
Write-Host "📋 4단계: Cursor 설치 중..." -ForegroundColor Yellow

try {
    Write-Host "   설치 프로그램 실행 중..." -ForegroundColor Gray
    $process = Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0 -or $process.ExitCode -eq $null) {
        Write-Host "   ✅ 설치 완료" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  설치 종료 코드: $($process.ExitCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ 설치 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5단계: 설치 후 검증
Write-Host ""
Write-Host "📋 5단계: 설치 검증 중..." -ForegroundColor Yellow

$cursorExePath = "$env:LOCALAPPDATA\Programs\Cursor\Cursor.exe"
if (Test-Path $cursorExePath) {
    Write-Host "   ✅ Cursor 설치 확인: $cursorExePath" -ForegroundColor Green
    
    # 버전 정보 확인
    try {
        $versionInfo = (Get-Item $cursorExePath).VersionInfo
        Write-Host "   버전: $($versionInfo.FileVersion)" -ForegroundColor Gray
    } catch {
        Write-Host "   ⚠️  버전 정보 확인 실패" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Cursor 실행 파일을 찾을 수 없습니다." -ForegroundColor Yellow
}

# 임시 파일 정리
Write-Host ""
Write-Host "🧹 임시 파일 정리 중..." -ForegroundColor Gray
try {
    Remove-Item -Path $downloadDir -Recurse -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "   ⚠️  임시 파일 정리 실패 (무시 가능)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Cursor 업데이트 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "다음 단계:" -ForegroundColor Cyan
Write-Host "  1. Cursor를 실행하여 업데이트 확인" -ForegroundColor White
Write-Host "  2. prevent-rollback.ps1 스크립트를 실행하여 롤백 방지 설정" -ForegroundColor White
Write-Host ""
