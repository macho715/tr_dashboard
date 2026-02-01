# Cursor 업데이트 가이드

**HVDC TR Transport Dashboard 프로젝트용 Cursor IDE 업데이트 및 롤백 방지 가이드**

---

## 목차

1. [빠른 시작](#빠른-시작)
2. [전체 업데이트 프로세스](#전체-업데이트-프로세스)
3. [개별 스크립트 사용법](#개별-스크립트-사용법)
4. [롤백 방지 설정](#롤백-방지-설정)
5. [문제 해결](#문제-해결)
6. [자주 묻는 질문](#자주-묻는-질문)

---

## 빠른 시작

### 전체 업데이트 (권장)

PowerShell을 **관리자 권한**으로 실행한 후:

```powershell
.\scripts\update-cursor-full.ps1
```

이 명령은 다음을 자동으로 수행합니다:
1. 캐시 정리 (선택사항)
2. Cursor 최신 버전 다운로드 및 설치
3. 롤백 방지 설정 구성

---

## 전체 업데이트 프로세스

### 사전 요구사항

- **Windows 10/11**
- **PowerShell 5.1 이상**
- **관리자 권한**
- **인터넷 연결** (최신 버전 다운로드용)

### 실행 정책 설정

PowerShell 실행 정책이 제한되어 있을 수 있습니다. 다음 명령으로 확인:

```powershell
Get-ExecutionPolicy
```

제한된 경우, 다음 명령으로 변경:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 전체 업데이트 실행

```powershell
# 기본 실행 (모든 단계 포함)
.\scripts\update-cursor-full.ps1

# 캐시 정리 건너뛰기
.\scripts\update-cursor-full.ps1 -SkipCacheClean

# 설정 보존
.\scripts\update-cursor-full.ps1 -PreserveSettings

# 롤백 방지 설정 건너뛰기
.\scripts\update-cursor-full.ps1 -SkipRollbackPrevention

# 사용자 지정 다운로드 URL
.\scripts\update-cursor-full.ps1 -DownloadUrl "https://custom-url.com/cursor.exe"
```

### 실행 단계

1. **캐시 정리** (선택사항)
   - Cursor 프로세스 종료
   - 안전한 캐시 삭제
   - 설정 파일 보존

2. **Cursor 업데이트**
   - 모든 Cursor 프로세스 완전 종료
   - 앱 데이터 및 캐시 삭제
   - 최신 버전 다운로드
   - 자동 설치
   - 설치 검증

3. **롤백 방지 설정**
   - 시스템 복원 설정 확인
   - Cursor 폴더 보호
   - 자동 업데이트 활성화
   - 레지스트리 설정

---

## 개별 스크립트 사용법

### 1. 캐시 정리만 실행

```powershell
.\scripts\cursor\clean-cursor-cache.ps1
```

**옵션:**
- `-PreserveSettings`: 설정 파일 보존
- `-PreserveExtensions`: 확장 프로그램 보존
- `-Verbose`: 상세 로그 출력

**예시:**
```powershell
# 설정과 확장 프로그램 보존하며 캐시 정리
.\scripts\cursor\clean-cursor-cache.ps1 -PreserveSettings -PreserveExtensions
```

### 2. 업데이트만 실행

```powershell
.\scripts\cursor\update-cursor.ps1
```

**옵션:**
- `-SkipCacheClean`: 캐시 정리 건너뛰기
- `-PreserveSettings`: 설정 파일 보존
- `-DownloadUrl`: 사용자 지정 다운로드 URL

**예시:**
```powershell
# 설정 보존하며 업데이트
.\scripts\cursor\update-cursor.ps1 -PreserveSettings
```

### 3. 롤백 방지 설정만 실행

```powershell
.\scripts\cursor\prevent-rollback.ps1
```

**옵션:**
- `-SkipSystemRestore`: 시스템 복원 확인 건너뛰기
- `-SkipRegistry`: 레지스트리 설정 건너뛰기
- `-Verbose`: 상세 로그 출력

**예시:**
```powershell
# 레지스트리 설정만 건너뛰고 실행
.\scripts\cursor\prevent-rollback.ps1 -SkipRegistry
```

---

## 롤백 방지 설정

### 자동 설정

`prevent-rollback.ps1` 스크립트가 다음을 자동으로 설정합니다:

1. **Cursor 폴더 보호**
   - ACL 설정으로 관리자만 수정 가능
   - 설치 폴더 보호

2. **자동 업데이트 활성화**
   - Cursor 설정 파일에 `update.mode` 추가
   - 레지스트리 플래그 설정

3. **레지스트리 보호**
   - `AutoUpdate` 플래그 설정
   - `PreventRollback` 플래그 설정

### 수동 설정

#### Cursor 내부 설정

1. Cursor 실행
2. `Ctrl+,` (설정 열기)
3. "Updates" 검색
4. 다음 설정 확인:
   - ✅ "Automatically download updates" 활성화
   - ✅ "Update channel" → "default" (stable)

#### 시스템 복원 제외 (선택사항)

시스템 복원이 Cursor를 롤백하는 것을 완전히 방지하려면:

1. **제어판** → **시스템** → **시스템 보호**
2. **C 드라이브** 선택 → **구성**
3. **시스템 복원 사용 안 함** 선택 (또는)
4. **제외** 섹션에 Cursor 폴더 추가:
   - `%LOCALAPPDATA%\Programs\Cursor`
   - `%APPDATA%\Cursor`

---

## 문제 해결

### 문제 1: "관리자 권한이 필요합니다" 오류

**원인:** PowerShell이 관리자 권한으로 실행되지 않음

**해결:**
1. PowerShell을 우클릭
2. "관리자 권한으로 실행" 선택
3. 스크립트 다시 실행

### 문제 2: "실행 정책으로 인해 스크립트를 실행할 수 없습니다"

**원인:** PowerShell 실행 정책이 제한됨

**해결:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 문제 3: 다운로드 실패

**원인:** 인터넷 연결 문제 또는 방화벽 차단

**해결:**
1. 인터넷 연결 확인
2. 방화벽/프록시 설정 확인
3. 사용자 지정 URL 사용:
   ```powershell
   .\scripts\cursor\update-cursor.ps1 -DownloadUrl "https://your-mirror.com/cursor.exe"
   ```

### 문제 4: 설치 후 구버전으로 롤백됨

**원인:** 시스템 복원 또는 캐시 문제

**해결:**
1. 롤백 방지 스크립트 실행:
   ```powershell
   .\scripts\cursor\prevent-rollback.ps1
   ```
2. 시스템 복원 제외 설정 (위 참조)
3. 캐시 완전 정리:
   ```powershell
   .\scripts\cursor\clean-cursor-cache.ps1
   ```

### 문제 5: Cursor 프로세스 종료 실패

**원인:** 다른 프로그램이 Cursor를 사용 중

**해결:**
1. 작업 관리자에서 수동 종료
2. 재부팅 후 스크립트 실행
3. `-SkipCacheClean` 옵션 사용

### 문제 6: 레지스트리 설정 실패

**원인:** 권한 부족 또는 레지스트리 손상

**해결:**
1. 관리자 권한 확인
2. `-SkipRegistry` 옵션으로 건너뛰기
3. 수동으로 Cursor 설정에서 자동 업데이트 활성화

---

## 자주 묻는 질문

### Q1: 업데이트 시 설정이 삭제되나요?

**A:** `-PreserveSettings` 옵션을 사용하면 설정 파일이 보존됩니다. 기본적으로 통합 스크립트는 설정을 보존합니다.

### Q2: 확장 프로그램도 보존되나요?

**A:** `clean-cursor-cache.ps1`의 `-PreserveExtensions` 옵션을 사용하면 확장 프로그램이 보존됩니다.

### Q3: 업데이트는 얼마나 자주 해야 하나요?

**A:** Cursor는 자동 업데이트가 활성화되면 자동으로 업데이트됩니다. 수동 업데이트는 문제가 발생했을 때만 필요합니다.

### Q4: 시스템 복원을 비활성화해야 하나요?

**A:** 필수는 아닙니다. 다만 완전한 롤백 방지를 원한다면 Cursor 폴더를 시스템 복원 제외 목록에 추가하는 것을 권장합니다.

### Q5: 스크립트 실행이 안전한가요?

**A:** 네, 모든 스크립트는:
- 공식 Cursor 다운로드 URL 사용
- 설정 파일 보존 옵션 제공
- 각 단계별 확인 프롬프트
- 상세한 로그 출력

### Q6: 업데이트 후 Cursor가 실행되지 않으면?

**A:**
1. 설치 경로 확인: `%LOCALAPPDATA%\Programs\Cursor\Cursor.exe`
2. 재부팅 후 다시 시도
3. 클린 재설치:
   ```powershell
   .\scripts\cursor\update-cursor.ps1 -SkipCacheClean:$false
   ```

### Q7: 바이러스 백신이 차단하면?

**A:** 바이러스 백신 예외 목록에 다음 경로 추가:
- `%LOCALAPPDATA%\Programs\Cursor`
- `%APPDATA%\Cursor`
- `%USERPROFILE%\.cursor`

---

## 고급 사용법

### 설정 파일 커스터마이징

`scripts/cursor/cursor-update-config.json` 파일을 수정하여 기본 동작을 변경할 수 있습니다:

```json
{
  "update": {
    "autoUpdate": true,
    "channel": "default",
    "downloadUrl": "https://downloader.cursor.sh/windows/x64"
  },
  "rollbackPrevention": {
    "enabled": true,
    "protectFolders": true
  },
  "cache": {
    "preserveSettings": true,
    "preserveExtensions": true
  }
}
```

### 스크립트 로깅

상세한 로그를 파일로 저장:

```powershell
.\scripts\update-cursor-full.ps1 | Tee-Object -FilePath "cursor-update-log.txt"
```

### 스케줄 작업으로 자동화

Windows 작업 스케줄러를 사용하여 정기적으로 실행:

```powershell
# 작업 스케줄러에 등록
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File `"$PWD\scripts\update-cursor-full.ps1`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "Cursor Auto Update" -Action $action -Trigger $trigger -RunLevel Highest
```

---

## 지원 및 피드백

문제가 발생하거나 개선 사항이 있으면:

1. 프로젝트 이슈 트래커에 보고
2. 로그 파일 첨부 (`cursor-update-log.txt`)
3. 실행한 명령어와 옵션 명시

---

## 참고 자료

- [Cursor 공식 웹사이트](https://cursor.sh)
- [PowerShell 실행 정책](https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies)
- [Windows 시스템 복원](https://support.microsoft.com/windows/recovery-options-in-windows-10-31ce2444-7de3-818c-d626-e3af4230c071)

---

**Last Updated:** 2026-01-31
