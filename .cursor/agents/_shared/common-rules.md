# Shared Agent Rules (공통 규칙)

> 이 파일은 모든 에이전트가 참조하는 공통 규칙을 정의한다.  
> 개별 에이전트 파일에서 중복 기술하지 않고 이 파일을 참조한다.

---

## 1. SSOT 계층 (Single Source of Truth)

```yaml
ssot_priority:
  1: option_c.json      # Activity/Plan/Actual/Evidence 데이터
  2: patch.md           # UI/UX/레이아웃 스펙
  3: AGENTS.md          # 프로젝트 규칙/도메인 계약
  4: docs/LAYOUT.md     # 컴포넌트 구조/책임
  5: src/**             # 구현 코드
```

**규칙**: 상위 SSOT와 충돌 시 상위가 우선.

---

## 2. Contract v0.8.0 (TR 에이전트 필수)

### 2.1 스키마 규칙
```yaml
entities:
  activities: {}        # 딕셔너리 구조 (배열 아님)
  
state_enum:             # 소문자 필수
  - draft
  - planned
  - ready
  - in_progress
  - paused
  - blocked
  - done
  - verified
  - cancelled

lock_level_enum:        # 소문자 필수
  - none
  - soft
  - hard
  - baseline
```

### 2.2 검증 명령
```bash
VALIDATION_MODE=CONTRACT python validate_optionc.py
```

### 2.3 필수 기록
- `reflow_runs[]`: Apply 시 리플로우 실행 기록
- `history_events[]`: 모든 변경 이력 (append-only)
- `collisions{}`: 충돌 레지스트리

---

## 3. Preview → Apply 패턴

| 단계 | SSOT 변경 | 권한 | 기록 |
|------|-----------|------|------|
| **Preview** | 불가 | 모든 사용자 | 없음 |
| **Apply** | 허용 | 승인된 역할만 | reflow_runs + history_events |

**규칙**: Apply 없이 SSOT 변경 금지.

---

## 4. 파이프라인 게이트

### 4.1 필수 명령 (커밋/완료 전)
```bash
pnpm lint        # 0 errors, 0 warnings
pnpm typecheck   # TypeScript 타입 체크 통과
pnpm test        # 모든 테스트 통과
pnpm build       # 빌드 성공
```

### 4.2 명령 탐지
```bash
# 레포마다 스크립트가 다를 수 있으므로 항상 확인
node -e "console.log(require('./package.json').scripts)"
```

### 4.3 실패 시 동작
- 커밋 중단
- 에러 로그 출력
- 수정 가이드 제공

---

## 5. 커밋 규칙

### 5.1 메시지 형식
```yaml
structural: "structural(<scope>): <description>"    # 행위 불변 변경
behavioral: "behavioral(<scope>): <type>: <desc>"  # 기능/버그 변경
ssot: "ssot(<scope>): <description>"               # SSOT 데이터 변경
docs: "docs: <description>"                         # 문서 변경
test: "test(<scope>): <description>"               # 테스트 변경
deps: "deps: <description>"                         # 의존성 변경
```

### 5.2 분리 원칙
- Structural과 Behavioral 혼합 금지
- Structural 먼저, Behavioral 나중
- 작고 자주 커밋

---

## 6. View Mode 권한

| 모드 | 편집 | Apply | Evidence 첨부 | Export |
|------|------|-------|---------------|--------|
| **Live** | 역할 기반 | 제한(승인) | 가능 | 가능 |
| **History** | 불가 | 불가 | 불가(조회만) | 가능 |
| **Approval** | 불가 | 불가 | 보기만 | 가능 |
| **Compare** | 불가 | 불가 | 보기만 | 가능 |

---

## 7. 2-Click Collision UX

```
1-Click: 배지 클릭 → Collision 요약 팝오버
2-Click: "Why 패널" → Root cause chain + Evidence/로그 점프
```

**규칙**: 2클릭 이내 원인 도달 불가한 UX 금지.

---

## 8. Freeze 규칙

### 8.1 자동 Freeze 조건
- `actual.start` 존재
- `actual.end` 존재
- `state`: IN_PROGRESS, PAUSED, COMPLETED, VERIFIED, ABORTED

### 8.2 Freeze 영향
- 해당 시각은 리플로우로 이동 금지
- `lock_level=HARD`: 자동 조정 금지 (충돌로 남기고 수동 해결)

---

## 9. 금지 목록 (모든 에이전트)

1. **SSOT 우회**: option_c.json 외 별도 SoT 생성
2. **파이프라인 스킵**: lint/typecheck/test/build 생략
3. **검증 없는 완료**: verifier 통과 없이 "완료" 선언
4. **History 수정**: append-only 위반 (삭제/수정)
5. **Apply 없는 SSOT 변경**: Preview 결과로 직접 SSOT 수정
6. **혼합 커밋**: Structural + Behavioral 동시 커밋

---

## 10. 출력 표준

### 10.1 성공 시
```yaml
status: SUCCESS
agent: <agent_name>
artifacts:
  - path: <file_path>
    action: created|updated|verified
summary: "<1-2문장 요약>"
next_steps:
  - "<다음 작업 1>"
  - "<다음 작업 2>"
```

### 10.2 실패 시
```yaml
status: FAIL
agent: <agent_name>
error:
  stage: <실패 단계>
  message: "<에러 메시지>"
  log: "<에러 로그>"
remediation:
  - "<수정 방법 1>"
  - "<수정 방법 2>"
```

---

## Refs

- [AGENTS.md](../../../AGENTS.md)
- [patch.md](../../../patch.md)
- [option_c.json](../../../option_c.json)
