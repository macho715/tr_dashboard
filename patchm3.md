## 1) 요약 (요구사항 1~6에 대한 결론)

* (1) **BulkAnchors(/bulk) UI는 기본 대시보드에서 제거**: 운영자/관리자 관점에서 “사용되지 않는 도구”로 보이므로 **숨김(또는 삭제)** 처리. 현재 화면에 노출되어 있음. ([tr-dashboard-ten.vercel.app][1])
* (2) **History / Evidence에 “사용자 직접 입력 + 저장”**을 추가: 특히 **항차 종료(Trip Closeout)** 시 운영자가 요약/지연사유/첨부증빙을 입력하면, 시스템이 **Trip 단위로 스냅샷 + 로그 + 증빙 링크를 SSOT(option_c.json)로 누적**.
* (3) **Original Plan vs 변경 Plan 비교 강화**: 이미 Compare 모드(ghost bar) 기반이 있으므로 ([GitHub][2]), “변경된 날짜/Activity를 목록으로 1~2클릭에 찾는 Diff 패널”을 추가하고, **항차별 baseline(승인/시작 시점) 스냅샷**을 명시.
* (4) **항차 종료 시 자동 Trip Summary 생성 + 보고서 소스(Export)**: 실제 수행일자/지연/원인/증빙 completeness를 자동 계산해 **Trip Report(JSON+MD)**로 저장/내보내기.
* (5) **다음 항차 진행 준비를 위한 Readiness 패널**: 다음 48~72h의 크리티컬 태스크/필수 증빙/제약(WX·LINKSPAN·BARGE·PTW)을 “체크리스트 + 결정을 위한 1페이지”로 제공.
* (6) 추가 아이디어: **TR Digital Passport, Trip Closeout 워크플로, Project Report(7항차 자동 합본), Mobile Field Mode(최소 UI)** 등을 우선순위로 제안.

> 참고: 현재 대시보드는 이미 **Trip/TR 선택 + ViewMode(Live/History/Approval/Compare) + Risk Overlay**를 갖춘 것으로 보이며 ([tr-dashboard-ten.vercel.app][1]), 이번 요청은 **“불필요 UI 제거 + 운영 입력/보고 체계 강화 + 비교/리포트 UX 강화”**가 핵심입니다.

---

## 2) 레이아웃 (BulkAnchors 제거 + History/Evidence 입력/저장 + Compare/Diff + Report)

### 2.1 화면에서 제거(또는 기본 숨김)할 영역

현재 상단에 **“Bulk Anchors (for /bulk)”** 영역이 기본 노출됩니다. ([tr-dashboard-ten.vercel.app][1])

* **기본 대시보드(Live/History/Approval/Compare)에서 완전 제거**
* 대안(필요 시): 엔지니어/관리자 전용 **Ops Tools Drawer**로 이동

  * 접근: Command bar에 `/tools` 같은 내부 커맨드
  * 기본 UI에서는 **노출 0**

### 2.2 개선된 3-Column SSOT 흐름(ASCII)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Global Control Bar                                                         │
│  Trip[v1..v7]  TR[TR1..TR7]  DateCursor  ViewMode[Live|History|Approval|Compare] │
│  RiskOverlay[None|Weather|Resource|Permit|All]  Export[Trip|Project]         │
└────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┬───────────────────────────────┬───────────────────────┐
│ WHERE (Map Panel)      │ WHEN/WHAT (Timeline/Gantt)     │ EVIDENCE/HISTORY/WHY  │
│ - TR 위치/상태         │ - Activity bars + deps         │ Tabs:                 │
│ - 경로/구간 표시       │ - 충돌/슬랙/제약 아이콘         │ ① Detail              │
│ - 선택 상호하이라이트  │ - Date shift → Reflow preview   │ ② Evidence (입력+링크)│
│                       │ - Compare: baseline ghost       │ ③ History (입력+로그) │
│                       │                                 │ ④ Compare Diff        │
│                       │                                 │ ⑤ Trip Closeout/Report│
└───────────────────────┴───────────────────────────────┴───────────────────────┘
```

---

## 3) 데이터 (Contract v0.8.0 확장: “바로 구현 가능한 option_c.json 키/값”)

아래는 **요구사항 2~4(History/Evidence 입력·저장, Plan 비교, Trip Report)**를 만족시키기 위해 `option_c.json`에 추가/정리해야 하는 **정확한 키(필드) 계약**입니다.

> 이미 repo에서 SSOT/리플로우/프리뷰/컴포넌트 레이어 분리가 명시되어 있으므로(예: `lib/ssot`, `lib/utils/schedule-reflow.ts`, `components/*`) ([GitHub][2]), 계약만 고정하면 UI/엔진은 안정적으로 확장 가능합니다.

---

### 3.1 Top-level (SSOT 루트)

```json
{
  "contract_version": "0.8.0",
  "meta": {
    "project_id": "agi-hvdc-tr-transport",
    "timezone": "Asia/Dubai",
    "generated_at": "2026-02-02T00:00:00+04:00"
  },

  "entities": {
    "trips": {},
    "trs": {},
    "activities": {},
    "resources": {},
    "locations": {}
  },

  "baselines": {
    "current_baseline_id": "BASELINE_ORIG",
    "items": {}
  },

  "history_events": [],
  "evidence_items": {},

  "trip_closeouts": { "items": {} },
  "reports": { "trip_reports": {}, "project_reports": {} },

  "collisions": {},
  "reflow_runs": []
}
```

---

### 3.2 Activity = SSOT (핵심: plan/actual/calc + state machine + evidence gate + compare 지원)

**필수 필드(요청하신 예시 키 포함):** `state`, `lock_level`, `blocker_code`, `evidence_required[]`, `reflow_pins[]`

```json
{
  "A1060": {
    "activity_id": "A1060",
    "name": "Load-out of TR Unit 1; stool down",
    "trip_id": "V001",
    "tr_id": "TR01",

    "type": "loadout",
    "anchor_type": "LOADOUT",

    "state": "ready",
    "lock_level": "none",
    "blocker_code": "none",

    "plan": {
      "start_ts": "2026-01-29T08:00:00+04:00",
      "end_ts": "2026-01-29T10:00:00+04:00",
      "duration_minutes": 120,
      "resources": [
        { "resource_id": "CRANE_200T", "qty": 1 },
        { "resource_id": "FORKLIFT_5T", "qty": 1 }
      ],
      "constraints": [
        { "kind": "ptw_required", "param": "PTW_LOADOUT", "mode": "hard" },
        { "kind": "wx_window", "param": "WX_LOADOUT", "mode": "soft" }
      ]
    },

    "actual": {
      "start_ts": null,
      "end_ts": null,
      "resources_used": [],
      "notes_md": null
    },

    "calc": {
      "es_ts": "2026-01-29T08:00:00+04:00",
      "ef_ts": "2026-01-29T10:00:00+04:00",
      "ls_ts": "2026-01-29T08:00:00+04:00",
      "lf_ts": "2026-01-29T10:00:00+04:00",

      "slack_minutes": 0,
      "is_critical": true,

      "delta_vs_baseline_minutes": 0,
      "changed_fields_vs_baseline": [],

      "collision_ids": [],
      "constraint_flags": ["PTW", "W"]
    },

    "evidence_required": [
      { "evidence_type": "ptw_approval", "stage": "before_start", "min_count": 1 },
      { "evidence_type": "lift_plan", "stage": "before_start", "min_count": 1 },
      { "evidence_type": "photo", "stage": "after_end", "min_count": 2 }
    ],

    "evidence_linked_ids": [],

    "reflow_pins": [
      { "kind": "pin_start", "ts": null },
      { "kind": "pin_end", "ts": null }
    ],

    "deps": [
      { "pred_activity_id": "A1040", "type": "FS", "lag_minutes": 0 }
    ]
  }
}
```

#### 권고 enum (고정)

* `state`: `draft | planned | ready | in_progress | paused | blocked | done | cancelled`
* `lock_level`: `none | soft | hard | baseline | actual`
* `blocker_code`: `none | PTW_MISSING | CERT_MISSING | WX_NO_WINDOW | LINKSPAN_LIMIT | BARGE_LIMIT | RESOURCE_CONFLICT | MANUAL_HOLD`

---

### 3.3 Trip (항차) 엔티티: “종료 입력(Closeout) + 항차별 baseline + 리포트 소스”

```json
{
  "V001": {
    "trip_id": "V001",
    "name": "Voyage 1",
    "tr_id": "TR01",

    "status": "active",
    "baseline_id_at_start": "BASELINE_V001_START",

    "milestones": {
      "loadout_activity_id": "A1060",
      "sailaway_activity_id": "A1081",
      "loadin_activity_id": "A1110",
      "turning_activity_id": "A1141",
      "jackdown_activity_id": "A1150"
    },

    "activity_ids": ["A1040", "A1060", "A1070", "A1081", "A1110", "A1141", "A1150"],

    "closeout": {
      "status": "not_started",
      "closeout_id": null
    },

    "calc": {
      "planned_start_ts": "2026-01-29T08:00:00+04:00",
      "planned_end_ts": "2026-02-07T18:00:00+04:00",
      "actual_start_ts": null,
      "actual_end_ts": null,

      "delay_minutes": 0,
      "delay_reason_codes": []
    }
  }
}
```

---

### 3.4 Baseline (Original Plan + “항차 시작 시점 Plan” 스냅샷)

**요구사항 3(Original vs 변경 Plan 비교)**를 “데이터 구조로 강제”하려면:

* **프로젝트 원본 승인 baseline** 1개 (`BASELINE_ORIG`)
* **각 항차 시작 시점 baseline** 1개 (`BASELINE_V001_START` …)

```json
{
  "baselines": {
    "current_baseline_id": "BASELINE_ORIG",
    "items": {
      "BASELINE_ORIG": {
        "baseline_id": "BASELINE_ORIG",
        "kind": "approval",
        "created_at": "2026-01-01T12:00:00+04:00",
        "created_by": "planner",
        "freeze_policy": {
          "lock_level_on_apply": "baseline",
          "frozen_fields": ["plan.start_ts", "plan.end_ts", "plan.duration_minutes"]
        },
        "snapshot": {
          "entities": {
            "activities": {
              "A1060": { "plan": { "start_ts": "2026-01-29T08:00:00+04:00", "end_ts": "2026-01-29T10:00:00+04:00" } }
            }
          }
        }
      },

      "BASELINE_V001_START": {
        "baseline_id": "BASELINE_V001_START",
        "kind": "trip_start",
        "scope": { "trip_id": "V001" },
        "created_at": "2026-01-28T18:00:00+04:00",
        "created_by": "ops_lead",
        "freeze_policy": {
          "lock_level_on_apply": "baseline",
          "frozen_fields": ["plan.start_ts", "plan.end_ts"]
        },
        "snapshot": {
          "entities": {
            "activities": {
              "A1060": { "plan": { "start_ts": "2026-01-29T08:00:00+04:00", "end_ts": "2026-01-29T10:00:00+04:00" } }
            }
          }
        }
      }
    }
  }
}
```

> Compare 모드에서 “원본(승인) vs 현재(진행 중 변경)” 비교는 `BASELINE_ORIG` 기준.
> 항차 종료 보고서는 “항차 시작 baseline vs actual” 기준이 가장 운영 친화적입니다(그 항차의 ‘당시 계획 대비 실제’가 핵심).

---

### 3.5 Evidence (사용자 입력/첨부의 SSOT 저장 구조)

```json
{
  "evidence_items": {
    "EV_0001": {
      "evidence_id": "EV_0001",
      "evidence_type": "photo",
      "title": "TR01 Load-out completed",
      "uri": "https://files.example.com/agi/v001/loadout/photo1.jpg",
      "captured_at": "2026-01-29T10:05:00+04:00",
      "uploaded_at": "2026-01-29T11:00:00+04:00",
      "uploaded_by": "ops_user_1",
      "tags": ["V001", "TR01", "loadout"],

      "linked_to": {
        "trip_id": "V001",
        "tr_id": "TR01",
        "activity_id": "A1060"
      }
    }
  }
}
```

---

### 3.6 History (사용자 직접 입력 + “항차 종료 때 전체 저장”)

#### (A) 일반 로그(상태 변경/입력/증빙 등록)

```json
{
  "history_events": [
    {
      "event_id": "HE_0001",
      "ts": "2026-01-29T11:02:00+04:00",
      "kind": "evidence_added",
      "actor": "ops_user_1",
      "target": { "type": "activity", "id": "A1060" },
      "payload": { "evidence_id": "EV_0001" }
    }
  ]
}
```

#### (B) Trip Closeout(항차 종료 입력) = 보고서 소스의 핵심

```json
{
  "trip_closeouts": {
    "items": {
      "TC_V001": {
        "closeout_id": "TC_V001",
        "trip_id": "V001",
        "tr_id": "TR01",

        "status": "finalized",
        "entered_at": "2026-02-07T19:00:00+04:00",
        "entered_by": "ops_lead",

        "summary_md": "### Voyage 1 Summary\n- Load-out completed as planned.\n- 1-day delay due to WX...\n",
        "delay_reason_codes": ["WX_WIND"],
        "delay_details": [
          { "code": "WX_WIND", "minutes": 1440, "notes_md": "Wind exceeded limit at MZP..." }
        ],

        "evidence_ids": ["EV_0001"],

        "snapshot_refs": {
          "baseline_id_at_start": "BASELINE_V001_START",
          "baseline_id_original": "BASELINE_ORIG"
        }
      }
    }
  }
}
```

---

### 3.7 Reports (항차별/전체 합본 “보고서 작성 소스”)

```json
{
  "reports": {
    "trip_reports": {
      "RPT_V001": {
        "report_id": "RPT_V001",
        "trip_id": "V001",
        "tr_id": "TR01",
        "generated_at": "2026-02-07T19:05:00+04:00",

        "baseline_id": "BASELINE_V001_START",

        "milestones": [
          { "name": "loadout", "planned_ts": "2026-01-29T08:00:00+04:00", "actual_ts": "2026-01-29T08:05:00+04:00", "delta_minutes": 5 },
          { "name": "jackdown", "planned_ts": "2026-02-07T18:00:00+04:00", "actual_ts": "2026-02-08T18:00:00+04:00", "delta_minutes": 1440 }
        ],

        "delay_minutes": 1440,
        "delay_reason_codes": ["WX_WIND"],

        "evidence_completeness": {
          "required_total": 12,
          "provided_total": 10,
          "missing": [
            { "activity_id": "A1150", "evidence_type": "as_built_record", "stage": "after_end", "min_count": 1 }
          ]
        },

        "narrative_closeout_id": "TC_V001"
      }
    },

    "project_reports": {
      "RPT_PROJECT": {
        "report_id": "RPT_PROJECT",
        "generated_at": "2026-03-22T18:00:00+04:00",
        "trip_report_ids": ["RPT_V001", "RPT_V002", "RPT_V003", "RPT_V004", "RPT_V005", "RPT_V006", "RPT_V007"]
      }
    }
  }
}
```

---

## 4) 시각화/UX (요구사항 3,5 강화)

### 4.1 Plan 비교(Original vs Current) — “변경된 날짜/Activity 2클릭”

이미 repo에 Compare Mode(ghost bar) 개념이 존재합니다. ([GitHub][2])
여기에 **Diff 패널(표)**만 추가하면 운영 요구가 충족됩니다.

**Compare Diff 패널(우측 탭) 컬럼(권장)**

* Activity ID / Name
* Baseline(start/end) → Current(start/end)
* Δminutes (start/end 각각)
* Changed fields: `["plan.start_ts","plan.resources",...]`
* Why(클릭): collision_id / constraint_flag / manual_reason 링크

**Gantt 표기**

* baseline bar = thin ghost
* current bar = solid
* 변경 Activity = 좌측 점(●) + 색상 강조
* Δdays badge (예: `+1d`)는 이미 UI에 표기되는 것으로 보임 ([tr-dashboard-ten.vercel.app][1])

---

### 4.2 Next Trip Readiness (요구사항 5)

현재 “Daily pulse(48h 크리티컬 태스크)” 요약이 있으므로 ([tr-dashboard-ten.vercel.app][1]), 아래 3개를 추가하면 “다음 항차 준비”가 됩니다.

**Readiness 카드(운영 체크리스트)**

* 다음 항차(Voyage N+1) 핵심 마일스톤(Load-out/Sail-away/Load-in/Turning/Jack-down) 계획일
* **D-2 ~ D0 필수 증빙 누락**(PTW/CERT/INSPECTION) 자동 체크
* 제약(Weather window, LINKSPAN/BARGE limit) 충족 여부 “예/아니오”
* 자원 캘린더 충돌 위험(RES collision) 요약 + “해결 추천 액션” 연결

---

## 5) 기록 규칙 (요구사항 2,4: “항차 종료 입력→전체 저장→보고서 소스”)

### 5.1 Plan / History / Evidence 이벤트 트리거 표

| 트리거                                 | SSOT 변경                                                                         | 저장 위치                 | UI 반영                        |
| ----------------------------------- | ------------------------------------------------------------------------------- | --------------------- | ---------------------------- |
| Activity 상태 변경(ready→in_progress 등) | `entities.activities[A].state` 업데이트                                             | activity SSOT         | Map/Gantt 색상, Detail 갱신      |
| Actual 입력(실제 시작/종료)                 | `entities.activities[A].actual.*` 업데이트                                          | activity SSOT         | Plan vs Actual 비교, Delay 계산  |
| Evidence 추가                         | `evidence_items[EV]` 추가 + `activities[A].evidence_linked_ids += EV`             | evidence SSOT         | Evidence 탭에 즉시 표시            |
| Plan 변경(Reflow Apply)               | `entities.activities[*].plan.*` 변경 + `reflow_runs[]` 기록                         | SSOT + reflow history | Compare/Diff, Preview 기록     |
| 항차 종료 조건 충족(예: jackdown done)       | `trips[V].closeout.status = required`                                           | trip SSOT             | “Closeout required” 배너 표시    |
| Closeout 저장(운영자 입력)                 | `trip_closeouts.items[TC]` 생성 + `history_events` 추가 + `reports.trip_reports` 생성 | closeout/report SSOT  | History 탭·Report 탭에서 다운로드/조회 |

### 5.2 Closeout 자동 전환 규칙(핵심)

* **Trip 종료 판정**: Trip의 `milestones.jackdown_activity_id`가 `state=done` AND `actual.end_ts != null`
* 종료되면 시스템은:

  1. `trips[V].closeout.status = "required"`
  2. Evidence gate 누락이 있으면 **Closeout 저장 전 경고(허용은 하되, 미비 목록을 보고서에 남김)**
* 운영자가 Closeout를 저장하면:

  * `trip_closeouts.items[TC_Vxxx].status = "finalized"`
  * `reports.trip_reports[RPT_Vxxx]` 자동 생성(마일스톤 actual/plan, delay, evidence completeness 포함)
  * **다음 항차 Readiness 카드**에 “이전 항차 Lessons learned” 1~3줄 요약 노출

---

## 6) 추가 아이디어 (우선순위)

### P0 (바로 운영 효용)

1. **Trip Closeout 워크플로(필수 입력 템플릿화)**

   * 지연 여부/원인코드/자유서술/첨부증빙/서명(입력자) 고정 포맷
2. **Trip Report Export (MD + JSON)**

   * 항차 종료 시 “Export Trip Report” 버튼 → 보고서 초안 자동 생성
3. **Compare Diff 패널(변경 Activity 목록)**

   * “변경된 날짜/Activity를 최종적으로 확인” 요구를 2클릭으로 충족

### P1 (감사/승인/관리 강화)

4. **Approval(Read-only) View 고도화**

   * frozen_fields 기반으로 “수정 불가” 시각화
5. **Evidence Completeness Score**

   * 항차/Activity별 필수 증빙 충족률(%) + 미비 항목 자동 리스팅

### P2 (현장/확장)

6. **TR Digital Passport**

   * TR별 Weight/COG, 크레인/리깅, PTW/CERT, 검사/사진 히스토리
7. **Mobile Field Mode(최소 UI)**

   * “현재 작업 1개 + 체크리스트 + 사진 업로드 + 서명”만
8. **Scenario Compare (Plan A/B/C Overlay)**

   * WX window/자원 교체 등 가정치로 reflow 여러 번 돌려 비교

---

## 구현 관점에서의 “수정 포인트” (repo 구조 기준)

* BulkAnchors 제거/숨김: **DashboardLayout 또는 CommandBar(/bulk)** 쪽에서 기본 렌더링 제거

  * 현재 화면에 `/bulk` 안내 + Bulk Anchors 섹션이 기본 노출됨 ([tr-dashboard-ten.vercel.app][1])
* History/Evidence 입력 강화: `HistoryEvidencePanel`, `EvidenceTab/HistoryTab`에

  * **Trip Closeout 입력 폼**(trip_id 기준) + 저장(SSOT 반영)
* Compare Diff 패널 추가: Compare 모드에서 baseline snapshot과 현재 plan의 diff를 계산해 표로 노출

  * Compare 모드 자체는 이미 기능 목록에 명시 ([GitHub][2])
* Trip Report 생성: closeout 저장 시 `reports.trip_reports`를 자동 생성(또는 calc로 생성 후 export)
* 데이터 계약 반영: SSOT 타입 정의/로더/매퍼 계층이 repo에 이미 명시되어 있어 ([GitHub][2]), `entities.*`/`baselines`/`history_events`/`evidence_items` 추가가 “정석적인 확장 경로”입니다.

---

### 마지막 체크(요구사항과의 매핑)

* **1) 제외**: BulkAnchors(/bulk) 기본 화면 제거 ✅
* **2) 입력공간 + 저장**: Evidence/History에 입력/링크/저장 + Trip Closeout ✅
* **3) 원본 vs 변경 비교**: baseline(승인) + 항차 시작 baseline + Diff 패널 ✅
* **4) 항차 종료 요약/보고서 소스**: Trip Report(MD/JSON) 자동 생성 + Project 합본 ✅
* **5) 다음 항차 준비**: Readiness 카드(48~72h, 증빙/제약/자원) ✅
* **6) 추가 아이디어**: P0~P2 우선순위 제안 ✅

[1]: https://tr-dashboard-ten.vercel.app/ "HVDC TR Transport Dashboard - AGI Site"
[2]: https://github.com/macho715/tr_dashboard "GitHub - macho715/tr_dashboard"
