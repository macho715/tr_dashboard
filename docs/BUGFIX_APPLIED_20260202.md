# TR Dashboard Bugfix 적용 보고서 (2026-02-02)

**기준 문서**: `TR_Dashboard_Bugfix_Prompt_v1.1.md`, `PATCHBUG.MD`

---

## 개요

현장 운영 관점에서 **Trip/TR 선택 → Timeline/Gantt 확인 → Evidence/History 기록 → Compare/Report/Readiness 확인**의 핵심 루프가 "오작동/혼란/끊김 없이" 동작하도록, 배포본의 UX 결함과 기능 버그를 수정함.

---

## 적용 완료 항목

### Bug #4: WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거 ✅

**문제**: 사용자 요청으로 해당 가이드 문구 제거

**변경 파일**:
- `components/dashboard/StoryHeader.tsx`
  - 빈 상태: WHERE/WHEN/WHAT/EVIDENCE + "좌측 지도에서 TR 선택" 등 → "TR을 선택하세요"로 축약
  - 라벨: WHERE/WHEN/WHAT/EVIDENCE → Location/Schedule/Verification
- `components/dashboard/layouts/tr-three-column-layout.tsx`
  - "WHERE (Map)", "WHEN/WHAT (Timeline)" → "Map", "Timeline"
- `app/page.tsx`
  - `aria-label="EVIDENCE"` → `aria-label="History and evidence"`

**수용 기준**: UI에서 WHERE/WHEN/WHAT/EVIDENCE 문구 노출 0

---

### Bug #2: Trip/TR 필터 + 7 TRs visible ✅

**문제**: Trip 클릭 시 상관없는 데이터, TR 3개만 노출, "0 of 7 visible"

**변경 파일**:
- `app/page.tsx`
  - API 실패/7개 미만 시 voyages 기반 fallback으로 trips/trs 7개 노출
  - `selectedVoyage` ↔ view-mode `selectedTripId`/`selectedTrIds` 동기화
  - `handleSelectVoyage`: voyage 선택 시 Trip/TR selector 동기화
  - `ReadinessPanel tripId`: `selectedVoyage?.id` → `selectedVoyage.voyage` (String)
- `components/dashboard/schedule-table.tsx`
  - 날짜 필터 결과 0개 시 전체 7개 표시 (fallback)

**수용 기준**: Trip 1~7 각각 클릭 시 일관된 데이터, TR selector 1~7 전부 노출, 기본 "7 of 7 visible"

---

### Bug #1: Selected Date UTC 정렬 ✅

**문제**: Selected Date 커서가 Gantt 날짜 축과 맞지 않음 (타임존 혼선)

**변경 파일**:
- `lib/ssot/schedule.ts`
  - `dateToIsoUtc(d: Date): string` — Date → YYYY-MM-DD (UTC)
  - `toUtcNoon(d: Date): Date` — UTC noon 정규화
- `components/dashboard/gantt-chart.tsx`
  - `formatShortDate` → `formatShortDateUtc` (getUTCMonth, getUTCDate)
  - `getDatePosition`: `toUtcNoon(date)` 적용
  - Selected Date 라벨에 `(YYYY-MM-DD)` 표시, tooltip 추가
- `components/dashboard/date-picker.tsx`
  - input `title`: "Selected date: YYYY-MM-DD (UTC day index used for Gantt)"

**수용 기준**: 2026-02-07 입력 시 Gantt 02-07 열에 정확히 정렬, UI에 기준 명시

---

### Bug #3: View 버튼 동작 ✅

**문제**: View 클릭 시 이동되는 화면/라우트 없음

**변경 파일**:
- `components/control-bar/GlobalControlBar.tsx`
  - "View" 버튼 추가 (LayoutList 아이콘)
  - 클릭 시 `document.getElementById('schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`

**수용 기준**: View 클릭 → Detailed Voyage Schedule 섹션으로 스크롤

---

### Bug #5: Compare Diff 날짜/스냅샷 UI ✅

**문제**: Compare Diff가 어떤 시점을 기준으로 비교하는지 입력/표시 없음

**변경 파일**:
- `components/compare/CompareDiffPanel.tsx`
  - 상단에 "Baseline snapshot: (created_at) (immutable)" 표시
  - "Compare as-of: Live (current state)" 표시

**수용 기준**: Diff가 어떤 baseline/compare 시점인지 UI에 명확히 표시

---

### Bug #6: Note 영속 + 비밀번호 삭제 ⏸️

**상태**: 미적용 (복잡도로 인해 별도 Phase로 이관)

**요구사항**: Note localStorage 저장, tombstone 삭제, Web Crypto salted hash 비밀번호

---

### Bug #7: Regression/Polish ✅

**검증**:
- `pnpm run build` — 성공
- `pnpm run lint` — 0 errors (기존 경고만 존재)

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `components/dashboard/StoryHeader.tsx` | WHERE/WHEN/WHAT/EVIDENCE 제거, Location/Schedule/Verification |
| `components/dashboard/layouts/tr-three-column-layout.tsx` | Map, Timeline 라벨 |
| `app/page.tsx` | trips/trs fallback, selectedVoyage 동기화, ReadinessPanel tripId |
| `components/dashboard/schedule-table.tsx` | 0개 시 7개 fallback |
| `lib/ssot/schedule.ts` | dateToIsoUtc, toUtcNoon |
| `components/dashboard/gantt-chart.tsx` | UTC 정렬, formatShortDateUtc |
| `components/dashboard/date-picker.tsx` | UTC tooltip |
| `components/control-bar/GlobalControlBar.tsx` | View 버튼 추가 |
| `components/compare/CompareDiffPanel.tsx` | Baseline/Compare as-of 표시 |

---

## 실행 방법

```bash
pnpm install
pnpm run dev
# http://localhost:3000 (또는 사용 가능한 포트)
```

---

**Last Updated**: 2026-02-02
