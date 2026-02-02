# TR Dashboard Plan — vis-timeline Gantt 통합

**생성일**: 2026-02-02  
**갱신일**: 2026-02-02 (tr-planner: GANTTPATCH4 Task 12 추가)  
**참조**: GANTTPATCH.MD, GANTTPATCH1.MD, GANTTPATCH2.MD, **GANTTPATCH4.MD**, vis-timeline-gantt, AGENTS.md, patch.md, LAYOUT.md

---

## Gantt 차트 전체 레이아웃 (검토 결과)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Gantt Chart (Jan 26 - Mar 22, 2026)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ TimelineControls: View(Day/Week) | Highlights(Delay/Lock/Constraint)    │
│                    Jump to YYYY-MM-DD [Go]                               │
├─────────────────────────────────────────────────────────────────────────┤
│ Legend: [Mobilization][Loadout][Transport][Loadin][Turning][Jackdown]   │
│         [W][PTW][CERT][LNK][BRG][RES] [COL][COL-LOC][COL-DEP] +Xd CP    │
├─────────────────────────────────────────────────────────────────────────┤
│ Gantt Container (vis-timeline 또는 legacy DOM)                           │
│ ┌────────────────────┬────────────────────────────────────────────────┐ │
│ │ 좌측: 그룹 라벨     │ 우측: 타임라인 그리드 (막대/의존성)              │ │
│ │ MOBILIZATION       │                                                │ │
│ │   SPMT             │  [막대들]                                       │ │
│ │   MARINE           │                                                │ │
│ │   ...              │                                                │ │
│ └────────────────────┴────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ Milestones: Jan 26 | Jan 31 | Feb 14 | Feb 28 | Mar 14 | Mar 22         │
├─────────────────────────────────────────────────────────────────────────┤
│ Dependency Heatmap                                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

**vis vs legacy 갭**: vis-timeline 모드에서 시간 범위 미설정 → 막대 미표시. Task 5a로 해결.

---

## 0) SSOT/Contract 최상단 고정

- option_c.json Contract 준수 (activities: level1, level2, activity_id, planned_start, planned_finish)
- SSOT 권위: entities.activities{} — vis-timeline은 **표시 전용**, SSOT 우회 금지
- Plan 변경: Preview→Apply 분리 (1차 통합에서는 editable=false, 기존 Dialog/Preview 흐름 유지)
- Freeze: actual_start/actual_finish 존재 시 해당 시각 리플로우 금지

---

## 1) UX 계약 (단일 시선 + 2-click)

- Where(Map) → When/What(Gantt) → Evidence(History/Evidence)
- 2-click 충돌: 배지 클릭 → Why 패널 → Root cause + Evidence
- Gantt 통합 포인트: `components/dashboard/sections/gantt-section.tsx` → `GanttChart` (렌더러만 교체)

---

## 2) 통합 전략 (GANTTPATCH.MD / GANTTPATCH1.MD)

### 2.1 권장: "Adapter + Feature Flag"로 무중단 교체

- **렌더링 엔진만 교체**: DOM 기반 커스텀 → vis-timeline
- 기존 `currentActivities`, `reflowSchedule`, `scheduleActivitiesToGanttRows`, Compare Diff 패널 **유지**
- `vis-timeline`은 DOM 의존 → **Client-only + dynamic import (ssr:false)**

### 2.2 교체 지점

| 현재 | 통합 후 |
|------|---------|
| gantt-chart.tsx (막대/축 그리기) | VisTimelineGantt (vis-timeline 렌더러) |
| scheduleActivitiesToGanttRows() | 유지 → GanttRow[] → vis groups/items 매핑 추가 |
| scrollToActivity (DOM ref) | timeline.setSelection([id], { focus: true }) |
| selectedDate 세로 라인 | addCustomTime / setCustomTime ("selected-date") |

### 2.3 날짜 파싱 통일 (버그 #1 방지)

- `new Date("2026-02-07")` 금지 (UTC/로컬 혼재)
- 단일 경로: `parseDateInput()` 또는 `new Date(y, m-1, d, 12, 0, 0)` (로컬 정오)
- items(start/end)와 selectedDate custom time bar에 **동일 파서** 사용

### 2.4 Gantt 계약 (GANTTPATCH2.MD)

**Props/State/Events** JSON Schema (draft 2020-12) 기준:

| 계약 | 용도 |
|------|------|
| `GanttRendererProps` | 오케스트레이터 → 렌더러 입력 (trip, timeline, groups, items, selected_date_cursor, options) |
| `GanttRendererState` | 복원 가능한 상태 (trip_id, timezone, selection, viewport, compare_as_of_date) |
| `GanttEvent` | 렌더러 → 오케스트레이터 이벤트 (ITEM_SELECTED, DATE_CURSOR_CHANGED, VIEWPORT_CHANGED 등) |

**적용 가이드** (GANTTPATCH2 §적용 가이드):

1. **Props 고정**: 오케스트레이터는 계산/SSOT/저장을 처리, 렌더러는 `GanttRendererProps`만 받아서 그림
2. **State**: `selected_date_cursor`, `compare_as_of_date`, `viewport.visible_window` 등 복원 가능한 것만 저장
3. **이벤트**: `ITEM_SELECTED` → Detail/Evidence 패널 동기화, `DATE_CURSOR_CHANGED` → 버그 #1 방지

> **적용 완료**: `lib/gantt/contract.schema.json`, `lib/gantt/gantt-contract.ts` 추가. VisTimelineGantt `onEvent` → ITEM_SELECTED, GANTT_READY 발생. GanttChart `onGanttEvent` prop 전달.

---

## 3) Runbook 계약

- state(소문자) + allowed transitions
- Preview→Apply (Apply만 SSOT 변경)
- Approval 모드 read-only
- 1차 통합: vis-timeline **editable=false** (날짜 변경은 기존 Dialog → reflow → Preview 유지)

---

## 4) Work Breakdown (Small diffs)

### Task 1: 의존성 + CSS 추가 (Structural) ✅

- **Goal**: vis-timeline 설치, CSS 전역 로드
- **Files**: package.json, app/globals.css (또는 app/layout.tsx)
- **Data Contract**: 영향 없음
- **Tests**: `pnpm install && pnpm build` 통과
- **SSOT validator**: 해당 없음

```bash
pnpm add vis-timeline vis-data
```

```ts
// app/globals.css 또는 app/layout.tsx
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
```

---

### Task 2: GanttRow → vis-timeline 매퍼 작성 (Structural) ✅

- **Goal**: `ganttRowsToVisData(GanttRow[])` 순수 함수로 `{ groups, items }` 변환
- **Files**: lib/gantt/visTimelineMapper.ts (신규)
- **Data Contract**: GanttRow (lib/dashboard-data.ts) → DataGroup, DataItem (vis-timeline)
- **Tests**: 단위 테스트 (level1/level2/activity_id 매핑, 날짜 파싱 일관성)
- **SSOT validator**: 해당 없음

**매핑 규칙** (GANTTPATCH1.MD §4.2):

- GanttRow (isHeader=false, activities) → group(id, content)
- Activity (label, start, end) → item(id, group, content, start, end, type: "range")
- 날짜: `parseDateInput()` 또는 `toUtcNoon()` 사용 (SSOT 유틸과 동일)

---

### Task 3: VisTimelineGantt 컴포넌트 추가 (Structural) ✅

- **Goal**: Client-only vis-timeline 래퍼, Props는 gantt-chart.tsx 인터페이스와 호환
- **Files**: components/gantt/VisTimelineGantt.tsx (신규)
- **Data Contract**: groups, items, selectedDate, onItemClick
- **Tests**: 렌더링 테스트 (activities 주입 시 아이템 수 검증)
- **SSOT validator**: 해당 없음

**핵심** (GANTTPATCH1.MD §4.1):

- `"use client"`
- DataSet(groups), DataSet(items) — 인스턴스 유지, clear/add로 업데이트
- `timeline.on("select", ...)` → onItemClick(itemId)
- `addCustomTime(selectedDate, "selected-date")` / `setCustomTime(selectedDate, "selected-date")`
- cleanup: `timeline.destroy()`

---

### Task 4: gantt-chart.tsx facade로 전환 (Behavioral) ✅

- **Goal**: GanttChart 내부에서 VisTimelineGantt로 렌더 위임, 외부 Props/상태 유지
- **Files**: components/dashboard/gantt-chart.tsx
- **Data Contract**: GanttChartProps, GanttChartHandle (scrollToActivity → setSelection)
- **Tests**: 기존 GanttSection 연동 E2E 또는 통합 테스트
- **SSOT validator**: 해당 없음

**변경**:

- `scheduleActivitiesToGanttRows(activities)` → `ganttRowsToVisData(ganttRows)` → `<VisTimelineGantt ... />`
- `scrollToActivity(id)` → `timelineRef.current?.setSelection([id], { focus: true })`
- selectedDate → parseDateInput(jumpDate) 또는 useDate().selectedDate

---

### Task 5a: vis-timeline 시간 범위(start/end) 설정 (Behavioral) ✅

- **Goal**: VisTimelineGantt options에 `start`/`end` 추가 → Jan 26–Mar 22, 2026 프로젝트 기간에 맞춤
- **Files**: components/gantt/VisTimelineGantt.tsx
- **Data Contract**: PROJECT_START, PROJECT_END (lib/dashboard-data.ts) 또는 props로 전달
- **Tests**: vis 모드에서 막대 표시 검증
- **SSOT validator**: 해당 없음

**원인**: vis-timeline 기본 시간 범위가 프로젝트 기간과 불일치 → 막대 미표시.

```ts
// VisTimelineGantt options 예시
const options = {
  start: new Date(2026, 0, 26),   // Jan 26, 2026
  end: new Date(2026, 2, 23),    // Mar 23, 2026
  // ...
}
```

---

### Task 5: Feature Flag로 Legacy/Vis 전환 (Behavioral) ✅

- **Goal**: `NEXT_PUBLIC_GANTT_ENGINE=vis|legacy`로 렌더러 선택
- **Files**: components/dashboard/gantt-chart.tsx, config
- **Data Contract**: 영향 없음
- **Tests**: 플래그별 렌더링 검증
- **SSOT validator**: 해당 없음

---

### Task 6: selectedDate 라인 + 날짜 파싱 통일 (Behavioral, 버그 #1) ✅

- **Goal**: jumpDate/selectedDate가 타임라인 상 2/7 입력 시 2/7 라인에 정확히 표시
- **Files**: VisTimelineGantt.tsx, lib/ssot/schedule.ts (toUtcNoon 등)
- **Data Contract**: parseDateInput / toUtcNoon 단일 경로 사용
- **Tests**: 날짜 파싱 단위 테스트, selectedDate 라인 위치 검증
- **SSOT validator**: 해당 없음

---

### Task 7: Map↔Timeline 상호 하이라이트 (Behavioral) ✅

- **Goal**: Timeline 선택 → Map 지오펜스 하이라이트, Map 선택 → Timeline setSelection
- **Files**: VisTimelineGantt, Map 컴포넌트, 상위 레이아웃
- **Data Contract**: focusedActivityId 기반 선택 상태 공유
- **Tests**: 상호 하이라이트 동작 검증
- **SSOT validator**: 해당 없음

**적용 완료** (app/page.tsx):
- handleActivityClick: setFocusedActivityId(activityId) 추가 → Timeline 클릭 시 Gantt 막대 링 + Map 라우트 하이라이트
- Map onActivitySelect: setFocusedActivityId(activityId) + scrollIntoView(gantt) 추가 → Map 클릭 시 Gantt 막대 링 + 스크롤
- MapPanelWrapper selectedActivityId: focusedActivityId fallback 추가

---

### Task 8: Compare Mode ghost bars (Behavioral) ✅

- **Goal**: compareDelta가 있으면 baseline items를 className "baseline-ghost"로 추가
- **Files**: visTimelineMapper.ts, VisTimelineGantt.tsx
- **Data Contract**: CompareResult
- **Tests**: ghost bar 렌더링 검증
- **SSOT validator**: 해당 없음

**적용 완료**:
- visTimelineMapper: ganttRowsToVisData(rows, compareDelta) — compareDelta.changed에 d.compare 있으면 ghost items 추가 (id: ghost_${activity_id}, className: baseline-ghost)
- gantt-chart: compareDelta 전달, ghost 클릭 시 activityId 추출
- globals.css: .vis-item.baseline-ghost 스타일 (dashed amber)

---

### Task 9: Zoom/Controls 통합 (Behavioral) ✅

- **Goal**: vis-timeline-gantt의 ZoomIn/Out, ChevronLeft/Right, Today, Fit All → TimelineControls와 통합
- **Files**: timeline-controls.tsx, VisTimelineGantt.tsx, gantt-chart.tsx
- **Data Contract**: TimelineView (Day/Week)
- **Tests**: 뷰 전환 시 scale 변경 검증
- **SSOT validator**: 해당 없음

**적용 완료**:
- VisTimelineGantt: zoomIn, zoomOut, fit, moveToToday, panLeft, panRight handle 메서드
- view prop → Day=14d, Week=56d visible window
- TimelineControls: zoomCallbacks (onZoomIn, onZoomOut, onFit, onToday, onPanLeft, onPanRight)
- gantt-chart: useVisEngine 시 zoomCallbacks 전달, Jump Go → moveToToday(clamped)

---

### Task 10: CSS/테마 오버라이드 (Structural) ✅

- **Goal**: vis-timeline 기본 스타일을 Deep Ocean Theme와 조화
- **Files**: app/globals.css, lib/gantt/visTimelineMapper.ts
- **Data Contract**: 영향 없음
- **Tests**: 시각적 회귀 (선택)
- **SSOT validator**: 해당 없음

**적용 완료**:
- gantt-vis-wrapper 스코프로 vis-timeline 오버라이드
- 컨테이너/패널/라벨/그리드: slate/cyan 배경·테두리
- custom-time(selected date): amber
- vis-selected: cyan 강조
- visTimelineMapper: activity.type → gantt-type-{type} className
- Activity type별 그라데이션 (mobilization/loadout/transport/loadin/turning/jackdown)

---

### Task 11: GANTTPATCH2 계약 정렬 ✅

- **Goal**: VisTimelineGantt Props/State를 GanttRendererProps/GanttRendererState 스키마에 맞춤
- **Files**: lib/gantt/contract.schema.json, lib/gantt/gantt-contract.ts, VisTimelineGantt.tsx, gantt-chart.tsx
- **Data Contract**: DateCursor, GanttEventBase, createItemSelectedEvent, createGanttReadyEvent
- **Tests**: build 통과
- **SSOT validator**: 해당 없음

**적용 완료**:
- `contract.schema.json` — JSON Schema 저장
- `gantt-contract.ts` — TypeScript 타입 + createItemSelectedEvent, createGanttReadyEvent
- VisTimelineGantt `onEvent`, `tripId` — ITEM_SELECTED, GANTT_READY 발생
- GanttChart `onGanttEvent` — 이벤트 스트림 구독

---

### Task 12: GANTTPATCH4 — JSON Schema(SSOT) → TS 타입 + Ajv 검증 (Structural)

- **Goal**: GANTTPATCH4.MD 권장 구성 적용 — 스키마 TS const, json-schema-to-ts 타입 추출, Ajv server-only 검증
- **Files**: schemas/gantt/contract.v1.ts, lib/gantt/contract.types.ts, lib/gantt/contract.validate.ts, lib/gantt/gantt-contract.ts
- **Data Contract**: 기존 contract.schema.json 내용을 TS const로 이전, 타입은 FromSchema로 자동 생성
- **Tests**: schema:smoke 스크립트, build 통과
- **SSOT validator**: 해당 없음

**Work Breakdown** (GANTTPATCH4.MD §1–8):

| Step | Action | Files |
|------|--------|-------|
| 12a | 패키지 설치: `pnpm add ajv ajv-formats` `pnpm add -D json-schema-to-ts` | package.json |
| 12b | 스키마 TS const: contract.schema.json → schemas/gantt/contract.v1.ts | schemas/gantt/contract.v1.ts |
| 12c | 타입 추출: FromSchema + Extract (GanttContract, GanttRendererProps, GanttRendererState, GanttEvent) | lib/gantt/contract.types.ts |
| 12d | Ajv validator (server-only): assertGanttContract, assertGanttRendererProps, assertGanttRendererState, assertGanttEvent | lib/gantt/contract.validate.ts |
| 12e | gantt-contract.ts 마이그레이션: contract.types.ts에서 타입 import, createItemSelectedEvent/createGanttReadyEvent 유지 | lib/gantt/gantt-contract.ts |
| 12f | schema:smoke 스크립트 (선택): scripts/schema-smoke.ts + package.json | scripts/schema-smoke.ts |

**적용 가이드** (GANTTPATCH4 §5.1):
- Ajv는 server-only → `/api/*`, Report export, Snapshot import/export 경계에서만 사용
- Client 번들 보호: Ajv를 client에서 import하지 않음

**가정**:
- 기존 contract.schema.json의 $defs 구조를 그대로 TS const로 이전 (oneOf union 유지)
- gantt-contract.ts의 createItemSelectedEvent, createGanttReadyEvent 시그니처는 유지 (하위 호환)

**적용 완료**:
- schemas/gantt/contract.v1.ts — JSON Schema TS const
- lib/gantt/contract.types.ts — FromSchema 타입 (GanttContract, GanttEvent 등)
- lib/gantt/contract.validate.ts — Ajv server-only
- lib/gantt/contract.validate.runtime.ts — 스크립트/클라이언트용 (server-only 없음)
- gantt-contract.ts — GanttEventBase = GanttEvent (contract.types)
- pnpm schema:smoke — 스키마 검증 스크립트

---

## 5) 커맨드 탐지 (추정 금지)

```json
{
  "workspace_root": "C:\\Users\\jichu\\Downloads\\tr_dashboard-main",
  "package_manager": "pnpm",
  "scripts": {
    "dev": "pnpm dev",
    "lint": "pnpm lint",
    "typecheck": "pnpm typecheck",
    "test": "pnpm test",
    "build": "pnpm build"
  }
}
```

---

## 6) DoD (Definition of Done)

- [x] option_c.json에서만 데이터 소비 (SSOT 준수)
- [x] scheduleActivitiesToGanttRows 유지, ganttRowsToVisData 추가
- [x] Plan 변경 시 Preview→Apply 분리 유지 (editable=false 1차)
- [x] **vis-timeline 시간 범위(start/end) 설정** — 막대 표시 (Task 5a)
- [x] selectedDate 라인 정확 표시 (날짜 파싱 통일)
- [x] scrollToActivity → setSelection 동작
- [x] GANTTPATCH2 Event 스트림 (ITEM_SELECTED, GANTT_READY)
- [x] Map↔Timeline 상호 하이라이트
- [ ] lint/typecheck/test/build PASS
- [ ] validate_optionc.py PASS (option_c 변경 시)

---

## 7) 참조

- **Gantt 레이아웃 검토** — patch.md §2.1, LAYOUT.md, vis vs legacy 갭
- **GANTTPATCH.MD** — Adapter + Feature Flag, Client-only, 렌더러만 교체
- **GANTTPATCH1.MD** — VisTimelineGantt 스켈레톤, visTimelineMapper, selectedDate, 버그 #1
- **GANTTPATCH2.MD** — Props/State/Events JSON Schema (GanttRendererProps, GanttRendererState, GanttEvent)
- **GANTTPATCH4.MD** — JSON Schema(SSOT)→TS 타입(json-schema-to-ts)+Ajv 런타임 검증(server-only)
- vis-timeline-gantt/ — PoC (groups, items, zoom, nestedGroups)
- AGENTS.md §1 (SSOT, Plan 변경, Freeze)
- patch.md §2 (레이아웃), §4 (배지, 2-click)
- lib/data/schedule-data.ts (scheduleActivitiesToGanttRows)
- lib/dashboard-data.ts (GanttRow, Activity)
- lib/gantt/contract.schema.json (GANTTPATCH2 JSON Schema)
- lib/gantt/gantt-contract.ts (GanttEventBase, createItemSelectedEvent, createGanttReadyEvent)
