# TR Dashboard Plan Template (Contract v0.8.0)

## 0) SSOT/Contract 최상단 고정
- option_c.json Contract v0.8.0 준수(참조: contract-optionc-v0.8.0.md)
- SSOT 권위: entities.activities{}
- Reflow 출력: calc.* + reflow_runs[] + collisions{}
- Baseline: baselines.current_baseline_id/items + freeze_policy 강제

## 1) UX 계약(단일 시선 + 2-click)
- Where(Map) → When/What(Gantt) → Evidence(History/Evidence)
- 2-click 충돌 해결: 클릭2에서 해결옵션 선택 시 Reflow 자동 재실행(단, blocking은 제안만)

## 2) Runbook 계약
- state(소문자) + allowed transitions + 금지 규칙
- Preview→Apply(Apply만 SSOT 변경)
- Approval 모드 read-only + baseline_conflict 처리

## 3) Work Breakdown (Small diffs)
각 Task 필수:
- Goal(검증 가능)
- Files touched
- Data Contract 영향(contract keys/enum)
- Tests(탐지 커맨드 기반)
- SSOT validator 실행 포인트(validate_optionc.py CONTRACT 모드)

## 4) 커맨드 탐지(추정 금지)
- scripts/detect_project_commands.py 출력 JSON을 그대로 포함

## 5) DoD
- Contract validator PASS
- Reflow_runs 기록
- collisions 레지스트리 생성/갱신
- baseline_conflict 차단
- 2-click root cause 동작
- lint/typecheck/test/build PASS(가능 범위)
