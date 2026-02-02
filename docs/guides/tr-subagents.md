# TR 이동 대시보드 Subagents

TR 이동 대시보드 개발을 위한 3개 subagent: **tr-planner**, **tr-implementer**, **tr-verifier**.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

## 개요

| Subagent | 역할 | 출력 |
|----------|------|------|
| **tr-planner** | AGENTS.md/runbook → 실행 가능한 plan 문서 | `docs/plan/tr-dashboard-plan.md` |
| **tr-implementer** | plan의 Task 구현 (SSOT·Preview→Apply·모드 준수) | plan 갱신, 코드 변경 |
| **tr-verifier** | E2E 검증 (lint/test/build + SSOT + DoD) | `docs/plan/tr-dashboard-verification-report.md` |

## 사용법

Cursor 채팅에서 슬래시 명령으로 호출:

```
/tr-planner      — plan 문서 생성
/tr-implementer  — plan의 Task 구현
/tr-verifier     — E2E 검증 및 리포트 생성
```

## 실행 순서 (Autopilot)

1. `/tr-planner` → plan 생성
2. `/tr-implementer` → Task 1개씩 구현 (반복)
3. `/tr-verifier` → 최종 검증
4. FAIL 시 → verifier 리포트를 implementer에 전달 → 수정 → 재검증

## 스크립트 경로

- `scripts/detect_project_commands.py` — 커맨드 탐지 (dev/lint/test/build)
- `scripts/validate_optionc.py` — SSOT(option_c.json) 검증

스크립트는 `.cursor/skills/tr-dashboard-autopilot/scripts/`에 있으며, 필요 시 `scripts/`로 복사하거나 경로 지정.

## 참조

- Agent: `.cursor/agents/tr-*.md`
- Command: `.cursor/commands/tr-*.mdc`
- Rule: `.cursor/rules/tr-*.mdc`
- Autopilot: `.cursor/skills/tr-dashboard-autopilot/SKILL.md`
