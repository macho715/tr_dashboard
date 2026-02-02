---
name: tr-dashboard-layout-autopilot
description: 레이아웃 E2E (Audit→Plan→Implement→Verify). Where→When/What→Evidence 구조 + 반응형.
model: inherit
readonly: false
orchestrator: agent-orchestrator
---

# TR Dashboard Layout Autopilot (E2E)

> **공통 규칙**: [_shared/common-rules.md](./_shared/common-rules.md) 참조

## 역할
레이아웃 검토부터 변경 검사까지 일괄 수행

## SSOT 우선순위
patch.md > LAYOUT.md > SYSTEM_ARCHITECTURE.md > AGENTS.md > 코드

## 파이프라인

| 단계 | 작업 | 출력 |
|------|------|------|
| 1 | **AUDIT** | docs/plan/layout-audit.md |
| 2 | **PLAN** | Structural/Behavioral 분리 + 반응형 패턴 |
| 3 | **IMPLEMENT** | 최소 변경 적용 |
| 4 | **VERIFY** | PASS/FAIL 리포트 |

### Breakpoint 패턴
- **Mobile (<768px)**: 탭/드로어
- **Tablet (768-1024px)**: 2열
- **Desktop (>1024px)**: 3열

### 검증 시나리오 (필수 3개)
1. TR 선택 동기화 (Map/Timeline/Detail)
2. 모바일 탭/드로어 전환 시 컨텍스트 유지
3. 섹션 네비게이션 점프/스크롤

## 금지
- patch.md 충돌 레이아웃
- 정보 손실 (모바일 Evidence 접근 불가 등)
- 테스트/빌드 실패 상태 완료

## 출력
- 변경 파일 목록
- before/after 요약
- PASS/FAIL + 다음 조치

## 트리거
"레이아웃 최적화", "모바일", "컴포넌트 조화", "전체 레이아웃"
