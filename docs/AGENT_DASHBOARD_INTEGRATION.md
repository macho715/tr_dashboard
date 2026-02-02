# 에이전트 스킬 ↔ 대시보드 레이아웃 통합 가이드

**최종 업데이트**: 2026-02-02  
**목적**: `agi-schedule-updater` 에이전트와 4개 스킬의 출력이 `docs/LAYOUT.md`에 정의된 대시보드 레이아웃에 일관되게 반영되도록 통합 방법을 정의한다.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

---

## 1. 현재 구조 요약

| 구분 | 에이전트/스킬 출력 | 대시보드 소비 |
|------|-------------------|---------------|
| **Schedule** | `files/agi tr final schedule.json` | `data/schedule/option_c.json` → `schedule-data.ts` → activities |
| **Voyages** | HTML voyage-card `data-start`/`data-end` | `lib/dashboard-data.ts` voyages (하드코딩) |
| **KPI** | HTML KPI Grid | `lib/dashboard-data.ts` kpiData (하드코딩) |
| **Tide** | HTML `table.tide-table` (3행) | **대시보드에 미구현** |
| **Weather** | HTML Weather & Marine Risk 블록 | **대시보드에 미구현** |
| **Go/No-Go** | `Decision: GO\|NO-GO\|CONDITIONAL` | **대시보드에 미구현** |

---

## 2. DASHBOARD_OUTPUT_SCHEMA → LAYOUT 매핑

`agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md`의 각 출력 항목이 `docs/LAYOUT.md`의 어느 컴포넌트에 표시되는지 매핑한다.

| DASHBOARD_OUTPUT_SCHEMA | LAYOUT 컴포넌트 | 위치 | 상태 |
|-------------------------|-----------------|------|------|
| Schedule JSON (activities) | GanttChart, ScheduleTable, TimelinePanel | GanttSection, ScheduleSection | ✅ option_c.json 연동 |
| Voyage Cards (data-start/end) | VoyageCards | VoyagesSection | ✅ 구현 완료 |
| KPI Grid (Total Days, SPMT Set) | KPICards | KPISection | ✅ 구현 완료 |
| Tide Table (3행 HH:00 / X.XXm) | TideTable | VoyagesSection (각 카드 하단) | ✅ 구현 완료 |
| Weather (4일치 D~D+3) | WeatherBlock | AlertsSection | ✅ 구현 완료 |
| Go/No-Go (Decision, Reason) | GoNoGoBadge | AlertsSection | ✅ 구현 완료 |
| Map Visualization | MapPanel (Leaflet) | Map column (3-column layout) | ✅ Phase 4 구현 |
| Activity Detail | DetailPanel | Detail column (3-column layout) | ✅ Phase 4 구현 |
| History & Evidence | HistoryEvidencePanel | Detail column tabs | ✅ Phase 4 구현 |

---

## 3. 통합 방법 (3단계)

### 3.1 동기화 경로 확립 (Sync Path)

**파이프라인 완료 후** 에이전트 출력 → 대시보드 데이터 소스로 복사:

```
files/agi tr final schedule.json  →  data/schedule/option_c.json
```

- **수동**: 파이프라인 완료 후 개발자가 복사
- **자동화**: `scripts/sync_schedule_to_dashboard.py` 또는 npm script 추가

**voyages, kpiData 통합** (선택):

- `lib/dashboard-data.ts`의 voyages, kpiData를 `option_c.json` 또는 별도 JSON에서 **파생**하도록 변경
- 또는 `files/agi tr final schedule.json` 파싱 결과를 `data/schedule/voyages.json`, `data/schedule/kpi.json`으로 저장 후 대시보드가 로드

### 3.2 레이아웃에 누락 컴포넌트 추가

| 컴포넌트 | 위치 | 데이터 소스 |
|----------|------|-------------|
| **TideTable** | VoyagesSection 내 각 VoyageCard 하단, 또는 VoyagesSection 상단 | `data/schedule/tide.json` (WATER TIDE.csv 파싱 결과) |
| **WeatherBlock** | OverviewSection 또는 AlertsSection | `data/schedule/weather.json` (파이프라인 출력) |
| **GoNoGoBadge** | AlertsSection 또는 OverviewSection | `data/schedule/go_nogo.json` (weather-go-nogo 출력) |

**데이터 소스 생성**:

- `agi-schedule-pipeline-check` 또는 `water-tide-voyage` 스킬 실행 시 `files/` 내 JSON 출력 → `data/schedule/`로 복사
- 예: `files/out/tide_voyage.json` → `data/schedule/tide.json`

### 3.3 에이전트/룰에 LAYOUT 참조 추가

**`.cursor/rules/agi-schedule-updater.mdc`** 에 다음 블록 추가:

```markdown
## 대시보드 레이아웃 준수

- 스킬 출력 형식은 `docs/LAYOUT.md`의 섹션 구조와 일치해야 함.
- Schedule → GanttSection, ScheduleSection
- Voyage Cards → VoyagesSection
- KPI → KPISection
- Tide Table → VoyagesSection (tide-table 3행)
- Weather → OverviewSection 또는 AlertsSection
- Go/No-Go → AlertsSection
```

**`.cursor/agents/agi-schedule-updater.md`** 에 동일 참조 추가.

---

## 5. 구현 완료 상태 (2026-02-02)

### ✅ 완료된 컴포넌트
1. **TideTable** - `components/dashboard/tide-table.tsx` (VoyageCards 각 카드 하단)
   - 데이터: `data/schedule/tide.json`
   - 형식: 3행 HH:00 / X.XXm

2. **WeatherBlock** - `components/dashboard/weather-block.tsx` (AlertsSection)
   - 데이터: `data/schedule/weather.json`
   - 4일치 D~D+3 표시

3. **GoNoGoBadge** - `components/dashboard/go-nogo-badge.tsx` (AlertsSection)
   - 데이터: `data/schedule/go_nogo.json`
   - Decision: GO|NO-GO|CONDITIONAL

4. **MapPanel** - `components/map/MapPanel.tsx` (Phase 4)
   - Leaflet 기반 지도
   - TR 마커 + 상호 하이라이트

5. **DetailPanel** - `components/detail/DetailPanel.tsx` (Phase 4)
   - Activity inspector
   - State, Plan vs Actual, Resources, Constraints

6. **HistoryEvidencePanel** - `components/history/HistoryEvidencePanel.tsx` (Phase 4)
   - History/Evidence 탭 통합

### 🔄 동기화 스크립트 (구현 완료)
- `scripts/sync_schedule_to_dashboard.py` - Schedule 복사 (`npm run sync:schedule`)
- `scripts/sync_tide_to_dashboard.py` - Tide 복사 (`npm run sync:tide`)
- `scripts/sync_agent_to_dashboard.py` - 통합 (`npm run sync:agent`)

---

## 6. 참조 문서

- [DASHBOARD_OUTPUT_SCHEMA.md](../agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md) - 출력 형식 SSOT
- [LAYOUT.md](./LAYOUT.md) - 대시보드 레이아웃 SSOT
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - 데이터 흐름 및 레이어 구조
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Phase 1-11 구현 요약
- [.cursor/rules/agi-schedule-updater.mdc](../.cursor/rules/agi-schedule-updater.mdc) - 에이전트 규칙
- [.cursor/agents/agi-schedule-updater.md](../.cursor/agents/agi-schedule-updater.md) - 에이전트 정의

**Last Updated**: 2026-02-02
