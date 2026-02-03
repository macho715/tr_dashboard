---
name: tr-dashboard-pipeline
description: Orchestrates TR dashboard development with mandatory SSOT validation. Use when running plan→implement→verify cycles, schedule/reflow/collision changes, or when AGENTS.md-based implementation requires option_c.json integrity checks.
metadata:
  ssot: option_c.json
  subskills:
    - tr-dashboard-autopilot
    - tr-dashboard-ssot-guard
outputs:
  - docs/plan/tr-dashboard-plan.md
  - docs/plan/tr-dashboard-verification-report.md
compatibility:
  notes: Requires JS/TS repo with runnable scripts from package.json. Commands discovered via detect_project_commands.py.
---

# TR Dashboard Pipeline (Autopilot + SSOT Guard)

## 언제 사용
- AGENTS.md 기반 plan → 구현 → 검증을 **SSOT 보호**와 함께 수행할 때
- 일정/리플로우/충돌 변경 전후에 option_c.json 정합성 검증이 필요할 때
- `/tr-dashboard-autopilot` 또는 `/tr-dashboard-ssot-guard` 단독 실행 대신 **통합 파이프라인**으로 실행할 때

## 입력
- `AGENTS.md` (가장 가까운 파일 우선)
- SSOT: `option_c.json`

## 출력
- `docs/plan/tr-dashboard-plan.md` (Plan)
- `docs/plan/tr-dashboard-verification-report.md` (최종 검증 리포트)

---

## 실행 오케스트레이션

### 1) Plan 생성
- `/tr-planner` 호출 → `docs/plan/tr-dashboard-plan.md` 생성
- Plan에 `detect_project_commands.py` 결과 포함 (추정 금지)

### 2) 구현 루프 (Autopilot + SSOT Guard 통합)
각 Task마다:
1. `/tr-implementer`로 Task 1개 수행
2. **SSOT Guard 실행** (필수):
   ```bash
   python .cursor/skills/tr-dashboard-autopilot/scripts/validate_optionc.py
   ```
   또는:
   ```bash
   python .cursor/skills/tr-dashboard-ssot-guard/scripts/validate_optionc.py
   ```
3. Exit 2(CRITICAL)면 → 중단, 원인/수정안/영향을 verification report에 기록 후 수정 루프 진입

### 3) 최종 검증
- `/tr-verifier`로 lint/typecheck/test/build + DoD + SSOT 검증
- SSOT Guard 최종 1회 실행

### 4) FAIL 시 자동 루프
- Verifier FAIL 항목 → Implementer 전달 → 수정 → 재검증 반복

---

## SSOT Guard 정책 (tr-dashboard-ssot-guard)

| 상황 | 동작 |
|------|------|
| Exit 0 | PASS → 다음 Task 진행 |
| Exit 2 (CRITICAL) | 구현 중단 → verification report에 기록 → 수정 루프 |

**검증 대상**: state/actual/history 최소 정합성, option_c.json 우회 SoT 탐지

---

## 강제 가드레일
- 커맨드(dev/test/lint/typecheck/build)는 `scripts/detect_project_commands.py`로 탐지 (추정 금지)
- SSOT 위반 징후 → 즉시 중단, 리포트 기록
- Preview→Apply 및 History append-only 원칙 위반 → "기능 구현"이 아닌 "규칙 위반"으로 간주

---

## 상세 참조
- **Autopilot 전체 흐름**: `.cursor/skills/tr-dashboard-autopilot/SKILL.md`
- **SSOT Guard 상세**: `.cursor/skills/tr-dashboard-ssot-guard/SKILL.md`
- **Plan 템플릿**: `.cursor/skills/tr-dashboard-autopilot/references/plan-template.md`
