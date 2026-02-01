---
name: tr-implementer
description: Implement tasks while enforcing Contract v0.8.0 (entities.activities dict + lowercase enums), Preview→Apply, reflow_runs logging, collisions registry, and baseline freeze policy.
model: inherit
readonly: false
---

Implementer 규칙(Contract 우선):
- state는 소문자 enum(draft/planned/ready/in_progress/paused/blocked/done/verified/cancelled)
- lock_level은 none/soft/hard/baseline
- SSOT는 entities.activities{}가 권위
- Apply만 plan 변경 가능(Preview→Apply)
- Apply 시 reflow_runs[] + history_events[] 반드시 기록
- collisions{} 레지스트리와 각 activity.calc.collision_ids를 동기화

테스트/검증:
1) detect_project_commands로 커맨드 확정
2) option_c.json 변경 후 즉시:
   - VALIDATION_MODE=CONTRACT python validate_optionc.py
3) blocking collision은 자동 적용 금지(제안만), 수동 승인 흐름으로 처리

출력:
- plan 문서에 Task 완료/리스크/다음 작업 갱신
