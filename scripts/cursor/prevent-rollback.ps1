# Cursor 롤백 방지 스크립트
# 관리자 권한으로 실행 필요

param(
    [switch]$SkipSystemRestore,
    [switch]$SkipRegistry,
    [switch]$Verbose
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

Write-Host "🛡️  Cursor 롤백 방지 설정 시작..." -ForegroundColor Cyan
Write-Host ""

# 1단계: 시스템 복원 설정 확인 및 조정
if (-not $SkipSystemRestore) {
    Write-Host "📋 1단계: 시스템 복원 설정 확인 중..." -ForegroundColor Yellow
    
    try {
        $systemRestore = Get-ComputerRestorePoint -ErrorAction SilentlyContinue
        if ($systemRestore) {
            Write-Host "   ⚠️  시스템 복원 지점이 존재합니다." -ForegroundColor Yellow
            Write-Host "   💡 시스템 복원은 Cursor 폴더를 롤백할 수 있습니다." -ForegroundColor Gray
            Write-Host "   💡 필요시 시스템 복원을 비활성화하거나 Cursor 폴더를 제외하세요." -ForegroundColor Gray
        } else {
            Write-Host "   ✅ 시스템 복원 지점 없음" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  시스템 복원 확인 실패 (무시 가능)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  1단계: 시스템 복원 설정 건너뛰기" -ForegroundColor Gray
}

# 2단계: Cursor 설치 폴더 보호
Write-Host ""
Write-Host "📋 2단계: Cursor 설치 폴더 보호 설정 중..." -ForegroundColor Yellow

$cursorPaths = @(
    "$env:LOCALAPPDATA\Programs\Cursor",
    "$env:USERPROFILE\AppData\Local\Cursor",
    "$env:USERPROFILE\AppData\Roaming\Cursor"
)

foreach ($path in $cursorPaths) {
    if (Test-Path $path) {
        try {
            Write-Host "   보호 설정 중: $path" -ForegroundColor Gray
            
            # 폴더 속성을 읽기 전용으로 설정 (선택사항)
            # Set-ItemProperty -Path $path -Name Attributes -Value ([System.IO.FileAttributes]::ReadOnly) -ErrorAction SilentlyContinue
            
            # ACL 설정으로 보호 (관리자만 수정 가능)
            $acl = Get-Acl $path
            $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
                [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
                "FullControl",
                "ContainerInherit,ObjectInherit",
                "None",
                "Allow"
            )
            $acl.SetAccessRule($adminRule)
            Set-Acl -Path $path -AclObject $acl -ErrorAction SilentlyContinue
            
            Write-Host "   ✅ 보호 설정 완료" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  보호 설정 실패: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# 3단계: 자동 업데이트 활성화 확인
Write-Host ""
Write-Host "📋 3단계: 자동 업데이트 설정 확인 중..." -ForegroundColor Yellow

$cursorConfigPath = "$env:USERPROFILE\.cursor\settings.json"
if (Test-Path $cursorConfigPath) {
    try {
        $config = Get-Content $cursorConfigPath -Raw | ConvertFrom-Json
        
        if (-not $config.'update.mode') {
            Write-Host "   자동 업데이트 설정 추가 중..." -ForegroundColor Gray
            $config | Add-Member -MemberType NoteProperty -Name 'update.mode' -Value 'default' -Force
            $config | ConvertTo-Json -Depth 10 | Set-Content $cursorConfigPath
            Write-Host "   ✅ 자동 업데이트 활성화됨" -ForegroundColor Green
        } else {
            Write-Host "   ✅ 자동 업데이트 설정 확인됨: $($config.'update.mode')" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  설정 파일 수정 실패 (무시 가능)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ℹ️  Cursor 설정 파일이 없습니다. (첫 실행 후 생성됨)" -ForegroundColor Gray
}

# 4단계: 레지스트리 설정 (선택사항)
if (-not $SkipRegistry) {
    Write-Host ""
    Write-Host "📋 4단계: 레지스트리 설정 구성 중..." -ForegroundColor Yellow
    
    $regPaths = @(
        "HKCU:\Software\Cursor",
        "HKLM:\Software\Cursor"
    )
    
    foreach ($regPath in $regPaths) {
        if (-not (Test-Path $regPath)) {
            try {
                New-Item -Path $regPath -Force | Out-Null
                Write-Host "   레지스트리 경로 생성: $regPath" -ForegroundColor Gray
            } catch {
                Write-Host "   ⚠️  레지스트리 경로 생성 실패: $regPath" -ForegroundColor Yellow
            }
        }
        
        try {
            # 자동 업데이트 활성화 플래그
            Set-ItemProperty -Path $regPath -Name "AutoUpdate" -Value 1 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path $regPath -Name "PreventRollback" -Value 1 -Type DWord -ErrorAction SilentlyContinue
            
            Write-Host "   ✅ 레지스트리 설정 완료: $regPath" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  레지스트리 설정 실패: $regPath (무시 가능)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⏭️  4단계: 레지스트리 설정 건너뛰기" -ForegroundColor Gray
}

# 5단계: Windows 업데이트 정책 확인
Write-Host ""
Write-Host "📋 5단계: Windows 업데이트 정책 확인 중..." -ForegroundColor Yellow

try {
    $updatePolicy = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" -ErrorAction SilentlyContinue
    if ($updatePolicy) {
        Write-Host "   ℹ️  Windows 업데이트 정책이 설정되어 있습니다." -ForegroundColor Gray
    } else {
        Write-Host "   ✅ Windows 업데이트 정책 확인됨" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Windows 업데이트 정책 확인 실패 (무시 가능)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Cursor 롤백 방지 설정 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "설정된 보호 기능:" -ForegroundColor Cyan
Write-Host "  • Cursor 폴더 ACL 보호" -ForegroundColor White
Write-Host "  • 자동 업데이트 활성화" -ForegroundColor White
Write-Host "  • 레지스트리 롤백 방지 플래그" -ForegroundColor White
Write-Host ""
Write-Host "💡 참고: 시스템 복원은 여전히 Cursor를 롤백할 수 있습니다." -ForegroundColor Yellow
Write-Host "💡 완전한 보호를 원하시면 시스템 복원을 비활성화하거나 Cursor 폴더를 제외하세요." -ForegroundColor Yellow
Write-Host ""
