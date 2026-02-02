---
name: tr-dashboard-layout-optimizer
description: TR Dashboard 전체 레이아웃을 목적(Where→When/What→Evidence)에 맞게 재구성하고, 모바일 반응형까지 포함해 컴포넌트 조화/접근성/회귀를 품질게이트로 검증할 때 사용.
metadata:
  ssot: patch.md, LAYOUT.md, SYSTEM_ARCHITECTURE.md, option_c.json, AGENTS.md
  outputs:
    - docs/plan/layout-audit.md
    - references/acceptance-report-template.md
compatibility:
  notes: HVDC TR Transport Dashboard (Next.js App Router). Commands discovered from package.json.
---

# TR Dashboard Layout Optimizer

## 사용 시점
- "대시보드 전체 레이아웃"을 목적 중심(Where→When/What→Evidence)으로 재정렬해야 할 때
- 3-Column(Desktop) ↔ Single-Column(Mobile) 전환 규칙이 흐릿하거나, 탭/드로어 UX가 깨질 때
- 컴포넌트 과밀/중복/죽은 UI가 생겨 사용성 저하가 발생했을 때

## SSOT 우선순위
1) (존재 시) patch.md
2) LAYOUT.md, SYSTEM_ARCHITECTURE.md
3) AGENTS.md, option_c.json(SSOT)
4) 코드 주석/README

> patch.md와 충돌하는 UI/UX 도입 금지. (없으면 LAYOUT.md를 사실상 UI SSOT로 간주)

## 절대 불변(하드 룰)
- "계산 vs 렌더링 분리", "SSOT 단일 진입점", "조립자(app/page.tsx) 패턴" 유지
- Deep Ocean 테마/글로벌 스타일 무단 변경 금지(필요 시 변수/토큰만 최소 수정)
- 모바일 대응은 "기능 삭제"가 아니라 "표현/내비게이션 변경"으로 해결(정보 손실 금지)
- 레이아웃 변경 후 반드시 lint/typecheck/test/build(또는 탐지된 동등 커맨드) 통과

## 실행 절차 (Audit → Design → Implement → Verify)
### A) Layout Audit (현상/구조/의존성)
1. LAYOUT.md에서 "현재 레이아웃 트리"와 핵심 슬롯(Map/Timeline/Detail)을 확인
2. SYSTEM_ARCHITECTURE.md에서 레이어 책임(프리젠테이션/비즈니스/데이터) 위반 여부 점검
3. 실제 코드에서 다음 파일 후보를 빠르게 스캔:
   - app/page.tsx, components/dashboard/layouts/tr-three-column-layout.tsx
   - sections/*, gantt-chart.tsx, map/*, HistoryEvidencePanel 등
4. 모바일(<=768px)에서:
   - 정보 구조(우선순위): StoryHeader → 핵심 액션 → (Map/Timeline) → Detail
   - 내비게이션: sticky nav / 섹션 점프 / "선택된 TR/Trip 컨텍스트" 유지 여부
5. 결과는 references/layout-audit-checklist.md 형식으로 요약

### B) Layout Design (목적 기반 재배치)
- 목적 매핑:
  - Where: Map(상단/탭1) + "현재 위치/다음 노드" 요약
  - When/What: Timeline/Gantt(탭0) + "다음 일정/블로커/충돌" 3초 요약
  - Evidence: Detail 내 탭(History/Evidence/Compare) + 미비 카운트/링크
- Desktop(>=1024px): 3-Column 유지(가독성/동시성)
- Tablet(768~1023px): 2-Column 또는 1-Column + Drawer(정보 밀도 조절)
- Mobile(<768px): 탭 + BottomSheet(Detail) 패턴 권장 (references/mobile-responsive-patterns.md 준수)

### C) Implement (Surgical Changes)
- "레이아웃" 변경은 기본적으로:
  1) 레이아웃 컨테이너(그리드/슬롯) 변경
  2) 섹션 배치/접기/드로어 전환
  3) props/상태/이벤트 계약 유지(깨지면 Contract 수정+테스트 동반)
- 계산 로직(lib/utils/*)은 레이아웃 목적이면 건드리지 않는다.
- 변경 단위는 작게(구조 변경 → 동작 변경 분리 커밋 원칙)

### D) Verify (Quality Gates)
- 커맨드 추정 금지: repo에서 lint/test/build 명령을 탐지 후 실행
- 최소 검증:
  - Desktop/Tablet/Mobile breakpoint별 레이아웃 정상
  - "선택 컨텍스트(TR/Trip/Activity)"가 탭 전환/드로어 열기에도 유지
  - 섹션 점프/스크롤/포커스가 끊기지 않음
  - (가능하면) 스냅샷/간단 E2E 1개 추가
- 결과는 references/acceptance-report-template.md로 PASS/FAIL 리포트 작성

## 산출물
- Layout Audit 리포트(문서)
- 변경된 컴포넌트 구조(코드)
- 검증 리포트(PASS/FAIL, 재현 steps)

## 트리거 키워드
layout, responsive, mobile, dashboard ux, component harmony, refactor
