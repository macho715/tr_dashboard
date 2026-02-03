---
name: tr-dashboard-ssot-guard
description: Validates SSOT(option_c.json) integrity for TR 이동 대시보드. Use before/after schedule data or reflow/collision changes to prevent SSOT violations.
metadata:
  ssot: option_c.json
compatibility:
  notes: Runs a local script to validate option_c.json internal invariants.
---

# TR Dashboard SSOT Guard

## 목적
- option_c.json(SSOT)을 우회하는 변경을 조기에 탐지
- state/actual/history 최소 정합성 규칙 위반을 CI/로컬에서 FAIL로 차단

## 사용
- 로컬:
  - `python .cursor/skills/tr-dashboard-autopilot/scripts/validate_optionc.py`
  - 또는 레포 루트에서: `python .cursor/skills/tr-dashboard-ssot-guard/scripts/validate_optionc.py`
- autopilot 루프 내:
  - 각 Task 완료 직후 1회 실행

## FAIL 시 정책
- CRITICAL(Exit 2)면: 구현 중단 → 원인/수정안/영향을 `docs/plan/tr-dashboard-verification-report.md`에 기록 후 수정 루프 진입
