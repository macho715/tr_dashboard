---
name: tr-dashboard-autopilot
description: End-to-end autopilot for TR 이동 대시보드. Use to generate a plan from AGENTS.md, implement in small steps, and run lint/typecheck/test/build with SSOT(option_c.json) guardrails via subagents.
metadata:
  ssot: option_c.json
  outputs:
    - docs/plan/tr-dashboard-plan.md
    - docs/plan/tr-dashboard-verification-report.md
compatibility:
  notes: Requires a JS/TS repo with runnable scripts detected from package.json. Commands are discovered, not assumed.
---

# TR Dashboard Autopilot

## 언제 사용
- "AGENTS.md 기반으로 plan 문서부터 최종 테스트까지 에이전트가 혼자" 수행해야 할 때
- option_c.json(SSOT) 기반 일정/리플로우/충돌/모드 분리를 구현/검증할 때

## 입력
- 레포의 `AGENTS.md` (가장 가까운 파일 우선)
- SSOT: `option_c.json`

## 출력
- `docs/plan/tr-dashboard-plan.md` (Plan)
- `docs/plan/tr-dashboard-verification-report.md` (최종 검증 리포트)

## 실행 오케스트레이션
1) **Plan 생성**
   - `/tr-planner`를 호출해 `docs/plan/tr-dashboard-plan.md` 생성
2) **구현 루프**
   - plan의 Task를 1개씩 `/tr-implementer`로 수행
   - 각 Task 후 `ssot-guard`(또는 validate_optionc) 실행
3) **최종 검증**
   - `/tr-verifier`로 lint/typecheck/test/build + DoD + SSOT 검증
4) **FAIL 시 자동 루프**
   - verifier의 FAIL 항목을 implementer에게 전달 → 수정 → 재검증 반복

## 강제 가드레일
- 커맨드(dev/test/lint/typecheck/build)는 절대 추정하지 말고 `scripts/detect_project_commands.py`로 탐지한다.
- SSOT 위반(예: option_c.json 우회 SoT 도입) 징후가 있으면 즉시 중단하고 리포트에 기록한다.
- Preview→Apply 및 History append-only 원칙을 깨는 변경은 "기능 구현"이 아니라 "규칙 위반"으로 간주한다.

## 빠른 사용
- Cursor Agent 채팅에서:
  - `/tr-dashboard-autopilot` 실행
  - (필요 시) `/tr-dashboard-ssot-guard` 단독 실행
