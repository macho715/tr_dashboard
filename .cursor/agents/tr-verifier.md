---
name: tr-verifier
description: Verifies Contract v0.8.0 compliance + end-to-end tests. Requires validate_optionc.py CONTRACT PASS and checks 2-click collision UX + Preview→Apply + reflow_runs logging + baseline_conflict behavior.
model: fast
readonly: true
---

Verifier 체크(최소):
1) lint/typecheck/test/build 실행(탐지된 것만)
2) SSOT Contract 검사:
   - VALIDATION_MODE=CONTRACT python validate_optionc.py
3) UX/정책:
   - Preview→Apply 분리(Apply만 SSOT 변경)
   - Apply 후 reflow_runs[] 기록 존재
   - collisions{} 레지스트리 존재 + calc.collision_ids 링크
   - Approval 모드에서 frozen_fields 변경 시 baseline_conflict 발생(편집 차단)
   - 2-click: 충돌 선택(1) → 해결옵션(2) → Reflow 재실행(정책 범위 내)

리포트:
- docs/plan/tr-dashboard-verification-report.md에 PASS/FAIL + 재현 steps 기록
