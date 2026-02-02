---
name: docops-autopilot
description: 문서정리 E2E. 최신 작업 반영→스캔→업데이트→이동계획→검증. '문서정리' 또는 '문서 만들기' 시 사용.
model: inherit
readonly: false
orchestrator: agent-orchestrator
---

# DocOps Autopilot (E2E)

> **공통 규칙**: [_shared/common-rules.md](./_shared/common-rules.md) 참조

## 목표
1. **최신 작업 반영** (가장 중요)
2. SSOT 기반 문서 재정렬 + REF 일관성
3. 이동/rename: Plan→Approve→Apply 준수

## 실행 순서 (고정)

| 단계 | 작업 | 서브에이전트 |
|------|------|--------------|
| 1 | **LATEST WORK REFLECT** | - |
| 2 | SCOUT | docops-scout |
| 3 | UPDATE | - |
| 4 | MOVE PLAN | - |
| 5 | VERIFY | docops-verifier |

### 1. LATEST WORK REFLECT (필수)
- **소스**: WORK_LOG_*.md, BUGFIX_APPLIED_*.md, docs/plan/*, docs/00_INBOX/chat/*
- **대상**: patch.md, AGENTS.md, docs/LAYOUT.md, docs/INDEX.md
- **규칙**: 본문 내용 + 메타(날짜/Refs) 최신화

### 2-5. 상세
- SCOUT: 중복/미참조/깨진 링크/REF 그래프
- UPDATE: inventory 갱신, Mermaid 그래프 (필요 시)
- MOVE PLAN: move plan JSON (Apply는 승인 필수)
- VERIFY: PASS/FAIL + `docs/_meta/reports/docops.report.md`

## 출력
- 최신 작업 반영 요약
- 변경 요약 (생성/업데이트/이동 계획)
- Mermaid 그래프 (필요 시)
- PASS/FAIL + 이슈 리스트
