# 에이전트 스킬 ↔ 대시보드 레이아웃 통합 가이드

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
| Schedule JSON (activities, planned_start/finish) | GanttChart, ScheduleTable | GanttSection, ScheduleSection | ✅ option_c.json 연동 |
| Voyage Cards (data-start/end, Load-out/Sail/Load-in/Jack-down) | VoyageCards | VoyagesSection | ⚠️ dashboard-data.ts 하드코딩 |
| KPI Grid (Total Days, SPMT Set=1, Voyages, TR Units, Start/End) | KPICards | KPISection | ⚠️ dashboard-data.ts 하드코딩 |
| Tide Table (3행 HH:00 / X.XXm) | **TideTable** | VoyagesSection 또는 별도 | ❌ 미구현 |
| Weather (4일치 D~D+3, Last Updated, 히트맵) | **WeatherBlock** | OverviewSection 또는 AlertsSection | ❌ 미구현 |
| Go/No-Go (Decision, ReasonCodes) | **GoNoGoBadge** | AlertsSection 또는 OverviewSection | ❌ 미구현 |

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

## 4. 권장 실행 순서 (구현 완료)

1. **동기화 스크립트** (구현됨)
   - `scripts/sync_schedule_to_dashboard.py` — Schedule 복사
   - `scripts/sync_tide_to_dashboard.py` — Tide 복사
   - `scripts/sync_agent_to_dashboard.py` — 통합 (Schedule + Tide + Weather/GoNoGo)
   - `npm run sync:schedule`, `npm run sync:tide`, `npm run sync:agent`

2. **LAYOUT.md** — TideTable, WeatherBlock, GoNoGoBadge 섹션 추가됨

3. **대시보드 컴포넌트** (구현됨)
   - `components/dashboard/tide-table.tsx` — VoyageCards 내 각 카드 하단
   - `components/dashboard/weather-block.tsx` — AlertsSection
   - `components/dashboard/go-nogo-badge.tsx` — AlertsSection

4. **데이터 파이프라인**
   - `files/tide_to_voyage_overview.py --output-json` — tide_voyage.json 생성
   - `data/schedule/tide.json`, `weather.json`, `go_nogo.json` — 대시보드 소비

---

## 5. 참조 문서

- `agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md` — 출력 형식 SSOT
- `docs/LAYOUT.md` — 대시보드 레이아웃 SSOT
- `docs/SYSTEM_ARCHITECTURE.md` — 데이터 흐름 및 레이어 구조
- `.cursor/rules/agi-schedule-updater.mdc` — 에이전트 규칙
- `.cursor/agents/agi-schedule-updater.md` — 에이전트 정의
