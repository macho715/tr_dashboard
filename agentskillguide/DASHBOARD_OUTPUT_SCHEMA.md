# Dashboard Output Schema (SSOT)

**목적**: 에이전트 `agi-schedule-updater`와 4개 스킬(agi-schedule-shift, agi-schedule-daily-update, water-tide-voyage, weather-go-nogo)이 **동일한 출력 형식**을 사용하여 대시보드에 일관되게 표시되도록 함.

**레이아웃 매핑**: `docs/AGENT_DASHBOARD_INTEGRATION.md` — 각 출력 항목이 `docs/LAYOUT.md`의 어느 섹션에 표시되는지 정의.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

---

## 기본 출력 원칙 (Baseline Output)

**대시보드가 리뉴얼·리디자인되더라도**, 본 스키마에 정의된 아래 값들은 **기본(baseline)** 으로 대시보드에 **반드시 출력**되어야 한다.

| 구분 | 기본 출력 항목 |
|------|----------------|
| Schedule | activities, planned_start/finish, ganttData |
| Voyage | 7 Voyages Overview, data-start/end, Load-out/Sail/Load-in/Jack-down |
| Tide | tide-table 3행 (HH:00 / X.XXm) |
| KPI | Total Days, Voyages(7), SPMT Set(1), TR Units(7), Start/End Date |
| Weather | Last Updated, 4일치 예보(D~D+3), 히트맵 |
| Go/No-Go | Decision, ReasonCodes |

→ UI/레이아웃 변경 시에도 **이 데이터 항목들은 기본 출력으로 유지**한다.

---

## 1. Schedule JSON (SSOT)

**소스**: `files/agi tr final schedule.json`  
**대시보드 소비**: `data/schedule/option_c.json` (동기화 필요 시)

```json
{
  "document_metadata": {
    "title": "AGI TR 1-6 Transportation Master Gantt Chart - Option C",
    "source_file": "option_c.tsv",
    "generated_at": "ISO8601",
    "total_activities": 139
  },
  "activities": [
    {
      "level1": "MOBILIZATION",
      "level2": null,
      "activity_id": null,
      "activity_name": "MOBILIZATION",
      "duration": 10.0,
      "planned_start": "YYYY-MM-DD",
      "planned_finish": "YYYY-MM-DD"
    }
  ]
}
```

- **날짜 형식**: `YYYY-MM-DD` (UTC 기준)
- **ganttData 매핑**: `lib/data/schedule-data.ts` → `scheduleActivitiesToGanttRows()`

---

## 2. Voyage Card (7 Voyages Overview)

**위치**: HTML `.voyage-card[data-start][data-end]`  
**표기**: Load-out, Sail, Load-in, Jack-down (예: `Jan 29`, `Jan 31`, `Feb 02`, `Feb 07`)

| 필드 | 형식 | 예시 |
|------|------|------|
| data-start | YYYY-MM-DD | 2026-01-29 |
| data-end | YYYY-MM-DD | 2026-02-07 |
| Load-out | Mon DD | Jan 29 |
| Sail | Mon DD | Jan 31 |
| Load-in | Mon DD | Feb 02 |
| Jack-down | Mon DD | Feb 07 |

**대시보드 매핑**: `lib/dashboard-data.ts` → `voyages[]` (loadOut, sailDate, loadIn, jackDown)

---

## 3. Tide Table (Voyage Overview)

**소스**: `files/WATER TIDE.csv` (6:00~17:00 상위 3시간대)  
**출력**: `<table class="tide-table">` tbody 3행

| TIME | HEIGHT |
|------|--------|
| HH:00 | X.XXm |
| HH:00 | X.XXm |
| HH:00 | X.XXm |

- **형식**: `<tr><td>9:00</td><td>2.03m</td></tr>`
- **voyage 구간**: `data-start` ~ `data-end` 내 일자만 사용

---

## 4. KPI Grid

| 카드 | 형식 | 규칙 |
|------|------|------|
| Total Days | 숫자 | 프로젝트 종료일 − 오늘(또는 요청일) |
| Voyages | 7 | 고정 |
| SPMT Set | **1** | **항상 1** |
| TR Units | 7 | 고정 |
| Start Date | Mon DD | projectStart |
| End Date | Mon DD | projectEnd |

---

## 5. Weather & Marine Risk

- **Last Updated**: `DD Mon YYYY`
- **예보 일수**: 갱신일 기준 **4일치** (D, D+1, D+2, D+3)
- **포맷**: `<p><strong>DD Mon:</strong> …</p>`
- **히트맵**: `files/out/weather_4day_heatmap.png` → HTML `src` (파일 또는 Base64)

---

## 6. Weather Go/No-Go

**출력 형식** (대시보드 Alerts/Go-No-Go 표시용):

```
Decision: GO | NO-GO | CONDITIONAL
ReasonCodes: [WX_WAVE, WX_WIND, WX_SQUALL_BUFFER, WX_PEAK_WAVE, WX_WINDOW_GAP]
```

- **입력**: wave_ft, wind_kt, (선택) Hs_limit_m, Wind_limit_kt, SailingTime_hr
- **출력**: 위 형식으로 일관되게 반환

---

## 7. 동기화 규칙 (files/ ↔ dashboard)

| 파이프라인 출력 | 대시보드 소비 |
|-----------------|---------------|
| `files/agi tr final schedule.json` | `data/schedule/option_c.json` (동기화 시) |
| HTML voyage-card, ganttData | `lib/dashboard-data.ts` voyages, ganttData |
| KPI Grid | `lib/dashboard-data.ts` kpiData |

**동기화 시점**: 파이프라인 완료 후 `files/agi tr final schedule.json` → `data/schedule/option_c.json` 복사 시 대시보드가 최신 일정 반영.

---

## 8. 검증 체크리스트

모든 스킬 실행 후 다음이 일치하는지 확인:

- [ ] JSON `activities[].planned_start/finish` = HTML `ganttData` = voyage-card `data-start/end`
- [ ] KPI Total Days = 종료일 − 오늘
- [ ] KPI SPMT Set = 1
- [ ] Tide-table 3행 형식 = `HH:00` / `X.XXm`
- [ ] Weather 4일치 = D~D+3
- [ ] Go/No-Go 출력 = `Decision: GO|NO-GO|CONDITIONAL`

---

## 9. 대시보드 리뉴얼 시 준수 사항

**대시보드 UI/레이아웃이 변경되더라도**, §기본 출력 원칙에 정의된 항목들은 **기본 출력으로 유지**한다.

- 새 레이아웃·컴포넌트 도입 시에도 위 데이터 항목은 **반드시 표시**
- 제거·축소 시에는 본 스키마와 충돌 여부를 검토 후 결정
