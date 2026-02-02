---
name: tr-dashboard-layout-autopilot
description: 레이아웃 전용 end-to-end autopilot. Where→When/What→Evidence 구조·반응형·크기 균형을 Audit→Design→Implement→Verify 루프로 수행하고, 품질게이트·SSOT 가드로 검증할 때 사용.
metadata:
  ssot: patch.md, AGENTS.md, option_c.json
  depends_on: tr-dashboard-layout-optimizer
  outputs:
    - docs/plan/layout-audit.md
    - docs/plan/layout-verification-report.md
compatibility:
  notes: HVDC TR Transport Dashboard (Next.js App Router). Commands from package.json.
---

# TR Dashboard Layout Autopilot

## 언제 사용
- "레이아웃만" 자동으로 점검·수정·검증하고 싶을 때
- 2열(WHERE+DETAIL | Gantt)·반응형·크기 균형·타이포 통일 등 레이아웃 이슈를 한 번에 돌리고 싶을 때
- `/tr-dashboard-autopilot`은 전체 기능+SSOT 중심이므로, **레이아웃 전용** 루프가 필요할 때

## 입력
- `AGENTS.md` §5 (UI 레이아웃 불변조건)
- `patch.md` §2.1 (레이아웃)
- `components/dashboard/layouts/tr-three-column-layout.tsx`, `app/page.tsx`, 관련 sections

## 출력
- `docs/plan/layout-audit.md` – 현재 레이아웃 구조·슬롯·크기·반응형 요약
- `docs/plan/layout-verification-report.md` – Layout Autopilot 검증 결과 (PASS/FAIL + 항목별)

---

## 실행 오케스트레이션

1) **Layout Audit**
   - `tr-dashboard-layout-optimizer` 절차 A 참조
   - app/page.tsx, TrThreeColumnLayout, GanttSection, VisTimelineGantt, globals.css 등 스캔
   - 그리드 비율(1fr/2fr), min-h, flex 체인, breakpoint(lg) 확인
   - 결과 → `docs/plan/layout-audit.md` (또는 기존 layout-size-balance-verification.md 활용)

2) **Layout Design (필요 시)**
   - 목적: Where → When/What → Evidence, 2열 유지, Gantt/디테일 높이 유동
   - Optimizer의 B 절차 참조 (Desktop/Tablet/Mobile)

3) **Implement (작은 단위)**
   - 레이아웃 컨테이너·슬롯·flex/grid만 변경
   - props/이벤트 계약 유지, Deep Ocean 테마/토큰 무단 변경 금지
   - 구조 변경 → 동작 변경 분리 커밋

4) **Verify (Quality Gates)**
   - 커맨드: `package.json` 기준 `lint` / `typecheck` / `test` / `build` (존재하는 것만)
   - SSOT: `pnpm run validate:ssot` (option_c.json 우회 레이아웃 SoT 도입 금지)
   - 레이아웃 전용 체크:
     - [ ] 2열(lg) / 1열(기본) 전환 정상
     - [ ] Gantt·디테일 높이 유동(flex-1/min-h) 정상
     - [ ] StoryHeader·Map↔Timeline·Detail 슬롯 유지
     - [ ] 선택 컨텍스트(TR/Trip/Activity) 유지
   - 결과 → `docs/plan/layout-verification-report.md`

5) **FAIL 시**
   - 리포트의 FAIL 항목을 기준으로 수정 후 4) 재실행

---

## 강제 가드레일
- 커맨드는 `package.json` scripts에서 탐지, 추정 금지
- 레이아웃 변경으로 **option_c.json 우회 SoT** 도입 금지 (SSOT 검증 통과 유지)
- patch.md §2.1, AGENTS.md §5와 충돌하는 레이아웃 도입 금지

---

## 빠른 사용
- Cursor에서: `/tr-dashboard-layout-autopilot` 실행
- 레이아웃만 검증: Audit → Verify만 수행 (Implement 생략 가능)
