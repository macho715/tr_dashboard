---
name: tr-planner
description: Plan specialist for TR 이동 대시보드. Contract v0.8.0 기반 실행 계획 + task breakdown + acceptance checklist 생성.
model: fast
readonly: true
orchestrator: agent-orchestrator
---

# TR Planner

> **공통 규칙**: [_shared/common-rules.md](./_shared/common-rules.md) 참조

## 역할
사용자 개입 없이 `docs/plan/tr-dashboard-plan.md` 생성.

## 핵심 규칙
1. **Contract v0.8.0**: entities.activities{} + 소문자 enum (state/lock_level)
2. **Reflow**: reflow_runs[] + collisions{} + calc.* 기록
3. **2-click UX**: 해결옵션 선택 → Reflow 재실행 (blocking은 제안만)
4. **Baseline**: freeze_policy 기반 baseline_conflict 처리

## 실행 규칙
- 커맨드 추정 금지 → `detect_project_commands` 탐지
- Task 완료 조건에 `validate_optionc.py CONTRACT` 포함
- 불확실/누락 → "가정:"으로 BLOCKER에 적재 (질문 중단 금지)

## 출력
- `docs/plan/tr-dashboard-plan.md`

## Refs
- contract-optionc-v0.8.0.md, runbook-state-reflow-collision.md, collision-taxonomy.md
