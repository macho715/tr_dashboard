---
doc_id: patch
refs: [AGENTS.md, docs/LAYOUT.md, docs/SYSTEM_ARCHITECTURE.md]
updated: 2026-02-03
---

## 1) 요약

**목표(SSOT 관점):** “TR 하나 = 하나의 이동 스토리”를 **한 화면에서** 운영·엔지니어·관리자가 동일하게 읽도록 재구성합니다.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

* **단일 시선 흐름(Where → When/What → Evidence)**

  * **Where(공간)**: Map에서 “지금 TR이 어디에 있고 어디로 가는지”
  * **When/What(시간/의존성)**: Timeline/Gantt에서 “언제 무엇을 하고, 무엇에 막히는지(Dependency/Constraint/Collision)”
  * **Evidence(기록)**: History/Evidence에서 “무엇으로 증명되는지(로그/증빙/미비 경고)”
* **SSOT 데이터 원칙**

  * **Activity의 단일 진실원은 `option_c.json` 유지** (정의/상태/Actual/증빙 링크 포함)
  * Trip/TR은 Activity를 **참조(ref)** 하며, 화면은 **SSOT API(또는 Aggregated JSON)** 로 한 번에 렌더링
* **핵심 UX**

  * TR 선택 즉시: **현재 위치 + 다음 일정 + 핵심 리스크 + 증빙 상태**가 상단 “스토리 헤더”에서 3초 내 파악
  * **충돌/지연 원인**은: (1) 타임라인의 “원인 배지” 클릭 → (2) Detail의 “Why 패널” 클릭 **2회 이내**로 원인/근거 도달
* **필수 제약 충족**

  * 날짜 변경 시 **Dependency 기반 Reflow** (Preview→Apply)
  * **Live / History 분리**
  * **Read-only Approval 모드** 제공(승인용 스냅샷/증빙 상태 확인)

---

## 2) 레이아웃

### 2.1 단일 시선 흐름(권장) — 3열 + Evidence 탭

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Global Control Bar                                                               │
│ Trip ▾  TR ▾  Date Cursor ◄───●───►  View: Live | History | Approval | Compare    │
│ Risk Overlay: Weather | Permit | Resource | Route  Filters/Search  Export         │
└──────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Story Header (TR 하나 = 하나의 스토리)                                             │
│ WHERE: Now @ Location + ETA(next node) | WHEN/WHAT: Next activity + blockers      │
│ EVIDENCE: Last update + Missing evidence count + PTW/Cert status                  │
└──────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────┬───────────────────────────────────┬───────────────┐
│ WHERE (Map)                   │ WHEN/WHAT (Timeline/Gantt)        │ DETAIL         │
│ - Current position marker     │ - Activity rows (Plan/Actual)     │ - Status        │
│ - Route + segments status     │ - Dependencies (FS/SS)            │ - Risk/Constraints│
│ - Nodes: Yard/Linkspan/Berth  │ - Constraints & collisions         │ - “Why delayed?”│
│ - Risk overlay layer          │ - Critical path highlight          │                 │
├──────────────────────────────┼───────────────────────────────────┼───────────────┤
│ Map↔Timeline hover/selection highlight                            │ HISTORY/EVIDENCE│
│                                                                    │ (tab/drawer)   │
│                                                                    │ - Auto log     │
│                                                                    │ - Evidence     │
└──────────────────────────────┴───────────────────────────────────┴───────────────┘
```

**읽는 순서(시선 흐름):**

1. 상단 **Story Header**에서 3문항을 요약으로 답함
2. 왼쪽 **Map**에서 공간 확인(“어디”)
3. 중앙 **Gantt**에서 시간/의존성 확인(“언제/무엇”)
4. 오른쪽 **Detail + History/Evidence**에서 상태/리스크/증빙으로 결론(“무엇으로 증명”)

---

### 2.2 View Mode 정의(필수 제약 반영)

* **Live**

  * “현재(now)” 기준: 위치는 최신, Timeline은 Plan+Actual 혼합, 지연 예측 포함
  * 입력 가능 범위(권한 기반): Actual 입력/상태 업데이트/증빙 첨부
* **History**

  * **As-of(시점)** 기준: 해당 시점의 상태/증빙/로그 재현(읽기 전용)
  * 타임라인은 실제 진행 기록 중심(Plan은 참고로 점선/오버레이)
* **Approval (Read-only)**

  * 승인용 스냅샷(Plan 기반) + 필수 증빙 충족 여부 + 리스크 요약
  * 수정/재계산/시나리오 편집 불가(Export/Sign-off만)
* **Compare (Plan A/B/C Overlay)**

  * `option_c.json`(기준) 위에 **Delta Overlay** 방식으로 A/B를 겹쳐 표시
  * 기준(SSOT)은 C만 유지(제약 충족)

---

## 3) 데이터 — SSOT 모델(JSON)

### 3.1 모델 원칙(SSOT/제약 정리)

* **Activity의 원본(Source of Truth)**: `option_c.json`

  * Activity의 **정의(타입/기간/의존성/제약)**, **상태**, **Actual**, **증빙 링크**는 `option_c.json`에서만 수정/확정
* Trip/TR은 Activity를 **참조(ref)** 하며, Dashboard는 다음 중 하나로 소비:

  1. **SSOT API 응답(JSON)**: Trip/TR + option_c Activity를 한 번에 병합해 제공(권장)
  2. 또는 FE에서 Trip/TR JSON + option_c.json을 병합(단, 동기화 규칙 엄격 필요)

---

### 3.2 SSOT API 응답 예시(JSON)

> 아래는 “대시보드가 한 번에 렌더링”하기 위한 **단일 응답 형태**입니다.
> `activities[]`는 **실제 저장소가 `option_c.json`** 이며, 여기서는 “조회 결과”로 나타납니다.

```json
{
  "ssot_version": "1.0",
  "generated_at": "2026-02-01T00:00:00+04:00",
  "mode": "live",
  "trip": {
    "trip_id": "TRIP-2026-001",
    "name": "Transformer Move - Batch 1",
    "timezone": "Asia/Dubai",
    "status": "in_progress",
    "risk_summary": {
      "risk_level": "medium",
      "top_drivers": ["weather_window", "ptw_pending"]
    },
    "trs": ["TR-001", "TR-002"],
    "resources": {
      "spmt_sets": ["SPMT-01"],
      "barges": ["BARGE-ALPHA"],
      "crews": ["CREW-DAY", "CREW-NIGHT"]
    }
  },
  "trs": [
    {
      "tr_id": "TR-001",
      "label": "TR#001",
      "weight_t": 210.5,
      "cog_mm": { "x": 120, "y": -35, "z": 1850 },
      "dimensions_mm": { "l": 7800, "w": 3200, "h": 4100 },
      "current_location": {
        "site_id": "YARD-A",
        "lat": 25.2048,
        "lon": 55.2708,
        "source": "gps",
        "timestamp": "2026-02-01T09:12:00+04:00"
      },
      "status": "in_progress",
      "active_activity_id": "ACT-TR001-020",
      "activity_ids": ["ACT-TR001-010", "ACT-TR001-020", "ACT-TR001-030"]
    }
  ],
  "activities": [
    {
      "activity_id": "ACT-TR001-020",
      "tr_id": "TR-001",
      "name": "SPMT load & secure",
      "type": "spmt_load",
      "location": {
        "site_id": "YARD-A",
        "lat": 25.2048,
        "lon": 55.2708,
        "geofence_id": "GF-YARD-A"
      },

      "plan": {
        "start": "2026-02-01T08:00:00+04:00",
        "finish": "2026-02-01T12:00:00+04:00",
        "duration_min": 240
      },
      "actual": {
        "start": "2026-02-01T08:25:00+04:00",
        "finish": null
      },

      "status": "in_progress",

      "dependencies": [
        { "pred": "ACT-TR001-010", "type": "FS", "lag_min": 0 }
      ],

      "constraints": {
        "weather_window": {
          "required": true,
          "start": "2026-02-01T06:00:00+04:00",
          "end": "2026-02-01T18:00:00+04:00",
          "min_visibility_m": 2000,
          "max_wind_mps": 12
        },
        "ptw": {
          "required": true,
          "status": "pending",
          "ptw_id": "PTW-88921"
        },
        "certificates": [
          { "type": "lifting_cert", "required": true, "status": "valid", "ref": "DOC-123" }
        ],
        "linkspan": null,
        "barge": null
      },

      "resources": {
        "spmt_set_id": "SPMT-01",
        "barge_id": null,
        "crew_id": "CREW-DAY"
      },

      "risk": {
        "risk_level": "medium",
        "drivers": ["ptw_pending"],
        "notes": "PTW pending; cannot start final securing step without approval."
      },

      "evidence": {
        "required_types": ["photo", "ptw_document"],
        "items": [
          {
            "evidence_id": "EV-TR001-020-001",
            "type": "photo",
            "uri": "s3://evidence/tr001/act020/img001.jpg",
            "captured_at": "2026-02-01T08:40:00+04:00",
            "captured_by": "user:field-01",
            "hash_sha256": "0000000000000000000000000000000000000000000000000000000000000000"
          }
        ],
        "missing_required": ["ptw_document"]
      },

      "history": [
        {
          "event_id": "H-0001",
          "timestamp": "2026-02-01T08:25:00+04:00",
          "actor": "user:field-01",
          "action": "actual_start_set",
          "summary": "Actual start recorded."
        },
        {
          "event_id": "H-0002",
          "timestamp": "2026-02-01T08:41:00+04:00",
          "actor": "user:field-01",
          "action": "evidence_added",
          "summary": "Photo evidence attached.",
          "evidence_id": "EV-TR001-020-001"
        }
      ],

      "source": {
        "system": "option_c.json",
        "revision": 17,
        "last_updated": "2026-02-01T08:41:10+04:00"
      }
    }
  ]
}
```

---

### 3.3 필수 메타데이터(요구사항 매핑)

| 요구 메타데이터     | 위치(권장)                                                                  | 사용처(화면/로직)                                                   |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Weight / COG        | `trs[].weight_t`, `trs[].cog_mm`                                        | SPMT/바지(barge)/링크스팬 제한 검증, 리스크 계산, 승인뷰 체크리스트 |
| SPMT                | `trip.resources.spmt_sets`, `activities[].resources.spmt_set_id`        | 자원 충돌(같은 SPMT 중복), 이동 가능 경로/속도, 일정 Reflow         |
| Linkspan/Barge 제한 | `activities[].constraints.linkspan`, `activities[].constraints.barge`   | 지도 위험 오버레이, 타임라인 제약 아이콘, 승인 조건                 |
| Weather Window      | `activities[].constraints.weather_window`                                 | 일정 가능 창 계산, 리스크 오버레이, 지연 원인 자동 라벨             |
| PTW / Certificate   | `activities[].constraints.ptw`, `activities[].constraints.certificates` | 시작 조건(Blocking), Evidence 미비 경고, 승인뷰 필수 항목           |

---

## 4) 시각적 표현(이해관계자 친화)

### 4.1 Map(Where) — 위치·경로·상태 색상/표현 규칙

**1) TR 마커(현재 위치)**

* 마커 내부: `TR-001` 라벨 + 상태 점(●)
* 클릭 시: 해당 TR의 **active activity**로 자동 스크롤/하이라이트(타임라인)

**2) Route/Segment 상태 색상(기본)**

* **Planned(미시작)**: 회색
* **In progress**: 파랑
* **Completed**: 초록
* **Blocked / Cannot proceed**: 빨강
* **Delayed / High risk**: 주황(상태는 진행 중이라도 “지연 위험”이면 주황 테두리)

**3) Node(핵심 거점) 표현**

* Yard / Linkspan / Berth / Barge Lane 같은 주요 노드에 **고정 아이콘 + 지오펜스(반투명 영역)**
* 지오펜스 진입/이탈 이벤트는 History 자동 트리거로 사용 가능(선택)

**4) Risk Overlay (토글)**

* Weather: 활동의 weather window 대비 “현재/예측” 불일치 시 지도에 **경고 배지**
* Permit/PTW: PTW pending인 활동이 임박/진행이면 노드/구간에 **[PTW] 경고**
* Resource: SPMT/Barge가 동시에 요구되는 구간 중첩이면 **[RES] 충돌 표시**
* Route restrictions: Linkspan/Barge 제한 위반 가능 구간을 **해칭(패턴)** 으로 표시

---

### 4.2 Timeline/Gantt(When/What) — Activity/Dependency/Constraint/Collision

**1) Row 구조**

* TR 기준 그룹 → 그 아래 Activity rows
* Activity bar는 기본적으로 **Plan bar** (실선), **Actual overlay** (상단 얇은 바)

  * History 모드에서는 Actual이 주, Plan은 점선 오버레이로 전환

**2) Dependency 표기**

* 선/화살표 + 타입 라벨:

  * `FS`: pred Finish → succ Start
  * `SS`: pred Start → succ Start
* 선이 교차/복잡해질 경우: “Dependency Inspector”에서 리스트로도 제공

**3) Constraint 아이콘(텍스트 배지)**

* `[W]` Weather window
* `[PTW]` Permit to Work
* `[CERT]` Certificate
* `[LNK]` Linkspan 제한
* `[BRG]` Barge 제한
* `[RES]` Resource(장비/크루) 제약

**4) Collision 표시(핵심)**

* **리소스 충돌**: 같은 SPMT/Barge/crew가 겹치면 충돌 Activity bar에 빨간 테두리 + `[COL]`
* **공간 충돌**: 같은 Linkspan/berth 점유가 시간 중첩이면 `[COL-LOC]`
* **의존성 충돌**: FS인데 succ가 pred보다 먼저 시작하도록 드래그되면 `[COL-DEP]`
* 클릭 1회: 충돌 요약 팝오버
* 클릭 2회: Detail의 “Why” 패널에서 **원인 트리 + 근거(로그/증빙)** 로 이동

---

### 4.3 인터랙션(요구사항 그대로)

**Map ↔ Timeline 상호 하이라이트**

* Map에서 TR/노드/구간 선택 → Timeline에서 해당 Activity/구간 관련 행 강조
* Timeline에서 Activity 선택 → Map에서 해당 지오펜스/구간 강조 + 관련 리스크 오버레이 자동 토글(옵션)

**날짜 변경 시 의존성 기반 Reflow(필수)**

* Global Date Cursor 이동 시:

  1. **Preview**: 새 시작점(anchor) 적용 → topological order 기반 forward pass로 조정
  2. Constraint 적용(Weather/PTW/Linkspan/Barge window) → 불가능 구간은 “Hold activity” 자동 삽입 또는 시작시간 스냅
  3. Resource 충돌 탐지 → 충돌 표시 + 해결 옵션(우선순위/대기/리소스 교체)
  4. **Apply**(권한 필요): 적용 시 `option_c.json`의 Plan 업데이트 + History 로그 생성

---

## 5) Trip별 Plan / History / Evidence 규칙

### 5.1 Plan ↔ Actual 자동 전환 규칙(권장)

| 항목                                         | 규칙                        | 화면 표시                                     |
| -------------------------------------------- | --------------------------- | --------------------------------------------- |
| Activity가 Actual.start 없음                 | Plan만 유효                 | Plan bar 실선                                 |
| Actual.start 존재, Actual.finish 없음        | 진행 중                     | Plan bar + Actual overlay(진행)               |
| Actual.finish 존재                           | 완료                        | Actual overlay 완료 + Plan 대비 편차(±) 표시 |
| Plan 대비 지연(예: now > plan.start + grace) | Delay 상태 부여(파생)       | Activity bar 주황 테두리 + “Why” 배지       |
| History 모드(as-of 시점)                     | 그 시점까지의 Actual을 기준 | Actual 중심, Plan 점선                        |

> “Plan 상태를 임의로 지우지 않고”, Actual이 들어오는 순간부터 **시각적으로 Actual이 우선**되게 설계합니다(운영/감사 관점).

---

### 5.2 History 로그 자동 생성 트리거(필수)

| 트리거                          | 이벤트(action)                            | 최소 기록 필드                             |
| ------------------------------- | ----------------------------------------- | ------------------------------------------ |
| Actual.start 입력               | `actual_start_set`                      | timestamp, actor, activity_id              |
| Actual.finish 입력              | `actual_finish_set`                     | timestamp, actor, activity_id              |
| status 변경                     | `status_changed`                        | from/to, reason(선택)                      |
| dependency 변경                 | `dependency_changed`                    | diff(전/후), 영향 범위                     |
| constraint 변경(PTW/Weather 등) | `constraint_changed`                    | constraint_key, diff                       |
| evidence 추가/삭제              | `evidence_added` / `evidence_removed` | evidence_id, type                          |
| reflow 적용(Plan 변경)          | `plan_reflow_applied`                   | anchor, 변경된 activity_ids, 충돌 해결내역 |

**감사/보고용 최소 요건**

* History는 **append-only** 성격(삭제 금지, 정정은 별도 이벤트로)
* Evidence는 `hash_sha256`(또는 동등)로 무결성 검증(선택이지만 강권)

---

### 5.3 Evidence 연결 및 “미존재 경고” 규칙(필수)

| 항목                               | 규칙                                                     | 경고/표시                                           |
| ---------------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| Evidence 필수 유형 정의            | Activity에 `required_types`로 선언                     | Approval/Live 모두 표시                             |
| Evidence 미존재                    | `missing_required` 자동 계산                           | Story Header에 “Missing n” + Activity에 빨간 배지 |
| PTW/Cert 미첨부                    | PTW/CERT가 required인데 문서 증빙 없으면 Block           | Timeline에서 `[PTW]`/`[CERT]` 빨강              |
| Evidence가 있으나 시간/위치 불일치 | captured_at, geotag가 Activity window/geofence와 충돌 시 | “검증 필요” 경고(엔지니어/관리자용)               |

---

### 5.4 Live / History / Approval 모드 권한 규칙(요약)

| 모드     |                     수정 |         Reflow Apply |          Evidence 첨부 |                 Export |
| -------- | -----------------------: | -------------------: | ---------------------: | ---------------------: |
| Live     | 역할 기반(운영/엔지니어) | 제한(승인 필요 가능) |                   가능 |                   가능 |
| History  |                     불가 |                 불가 |           불가(조회만) |                   가능 |
| Approval |                     불가 |                 불가 | 조회만(필수 충족 확인) | 가능(서명/승인 리포트) |

---

## 6) 추가 아이디어(우선순위)

### P0 (즉시 가치 + 제약과 충돌 없음)

1. **TR Digital Passport**

   * TR 단위 “한 페이지” 출력: 스펙(Weight/COG), 현재 위치, 전체 일정, PTW/Cert 상태, 핵심 증빙 링크, 변경 이력
2. **Read-only Approval View (정식)**

   * 승인 체크리스트 자동 생성: “필수 증빙 누락 0개” + “제약 위반 0개” + “리스크 사유”
3. **2-click Root Cause UX**

   * 각 Activity bar에 “Why 배지” 자동 부착(예: `[PTW pending]`, `[Weather window miss]`, `[RES collision]`)
   * 클릭→Detail의 원인 트리→Evidence/로그로 바로 점프

### P1 (운영 효율 크게 개선, 구현 난이도 중)

4. **Scenario Compare (Plan A/B/C Overlay)**

   * **C는 SSOT 유지**, A/B는 “delta overlay”로만 저장/표시
   * 충돌/리스크 차이를 자동 요약(“A는 barge window 2회 위반” 등)
5. **Mobile Field Mode (최소 UI)**

   * 3개 카드만: Now/Next/Evidence + “사진 첨부/Actual start/finish” 버튼
   * 오프라인 큐잉(네트워크 복구 시 동기화)
6. **Geofence 기반 자동 Check-in/Check-out (선택)**

   * 지오펜스 진입/이탈을 History 이벤트로 기록(증빙 보조)

### P2 (고도화/통합 영역)

7. **Weather 자동 연동 & “실행 가능 창” 추천**

   * 활동별 weather window와 예보를 비교해 “가능한 재배치 후보 슬롯” 제안
8. **Permit/PTW 시스템 연동**

   * PTW 상태 자동 갱신 + 증빙 자동 첨부(문서/승인 로그)
9. **Audit Pack 자동 생성**

   * Trip 종료 시: “전체 History + 증빙 링크 + 변경 이유 요약”을 PDF/패키지로 Export

---

### 체크: 요구 Deliverables 포함 여부

* ✅ 레이아웃 다이어그램(ASCII)
* ✅ SSOT 데이터 모델(JSON) (Trip/TR/Activity + Evidence/History 연결 포함, Activity는 option_c 기반)
* ✅ 주요 컴포넌트 목록 + 인터랙션(레이아웃/인터랙션 섹션에 포함)
* ✅ Plan/History/Evidence 기록 규칙 표
* ✅ 추가 아이디어 목록(우선순위 포함)

## 1) 요약

아래는 **TR 이동 대시보드(SSOT 기반)** 운영을 위해, (a) Activity 상태 머신, (b) 날짜/커서 변경 시 Reflow(재배치) 계산 규칙, (c) Collision(충돌) 분류·해결 정책을 **“운영 룰북(runbook)” 형태**로 구체화한 것입니다.

핵심 불변 조건(요청 반영):

* **Activity 단일 진실원(SSOT) = `option_c.json`**
* **날짜 변경(커서 이동 포함) 시 의존성 기반 Reflow 필수**
* **Live / History 모드 분리** (History는 “재현/감사” 목적의 불변 뷰)
* **Read‑only Approval 모드 제공** (승인자는 변경 불가)

---

## 2) (a) Activity 상태 머신 운영 룰북

### A.1 용어(운영 관점)

* **Activity**: Trip/TR 스토리를 구성하는 최소 실행 단위(예: SPMT 이동, 바지선 적재, 링크스팬 통과, PTW 승인, Weather Wait 등).
* **상태(State)**: Activity의 “계획/준비/실행/완료/검증” 단계.
* **전이(Transition)**: 상태 변경 이벤트. **모든 전이는 `option_c.json` Activity 레코드의 변경으로만 발생**.
* **Evidence Gate**: 특정 전이(특히 Start/Complete/Verify)에 필요한 증빙(사진/영상/문서/서명/센서로그 등) 조건.
* **Lock Level**: 계획 잠금 수준(변경 허용 범위). *Reflow 룰 및 Collision 해결 우선순위에 직접 영향*.

---

### A.2 표준 상태(권장 SSOT 값)

> 상태는 지나치게 세분화하면 현장 운영에서 무너집니다. 아래 10개 상태를 “표준”으로 하고, Activity type별 세부는 `flags`/`checks`로 다룹니다.

| State (SSOT)           | 의미(운영 정의)                                      | 불변/고정 규칙                                      |
| ---------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `DRAFT`              | 작업 정의 중(스코프/리소스/의존성 미완)              | Reflow 대상(자유)                                   |
| `PLANNED`            | 계획 반영 완료(일정 계산 가능)                       | Reflow 대상                                         |
| `COMMITTED`          | Baseline(승인/합의) 잠금                             | **임계 변경 시 승인 필요**                    |
| `READY`              | 시작 전 마지막 관문 통과(PTW/자원/날씨/현장 준비 OK) | 시작 시간은 Reflow로 이동 가능하나*근접 시 제한*  |
| `IN_PROGRESS`        | 실제 실행 중                                         | **`actual_start` 이후 시각은 고정(Freeze)** |
| `PAUSED`             | 일시중지(현장 통제/대기)                             | `actual_start` 유지                               |
| `BLOCKED`            | 외부 요인으로 진행 불가(PTW 미승인, 장비고장 등)     | 원인코드 필수                                       |
| `COMPLETED`          | 작업 완료(현장 결과 입력됨)                          | `actual_end` 고정                                 |
| `VERIFIED`           | 증빙/검증 완료(감사/보고용 확정)                     | **불변(원칙적으로 재오픈 금지)**              |
| `CANCELLED`          | 실행 전 취소(대체 시나리오로 대체)                   | 불변(대체 Activity로 처리)                          |
| `ABORTED` *(선택)* | 실행 시작 후 중단/종료(사고/중대 이슈)               | 불변 + Incident 연결                                |

> `ABORTED`는 안전/중대 이슈가 있는 조직에서 권장(사후 분석이 명확해짐). 그렇지 않으면 `BLOCKED`+별도 Incident Activity로도 운영 가능.

---

### A.3 전이 다이어그램(ASCII)

```
DRAFT → PLANNED → COMMITTED → READY → IN_PROGRESS → COMPLETED → VERIFIED
  |        |          |         |         |   |          |
  |        |          |         |         |   └→ ABORTED |
  |        |          |         |         └→ PAUSED ↔ IN_PROGRESS
  |        |          |         └→ BLOCKED ↔ READY (or ↔ IN_PROGRESS)
  |        |          └→ CANCELLED
  |        └→ CANCELLED
  └→ CANCELLED
```

---

### A.4 Allowed Transitions(허용 전이) + Gate(필수 조건)

#### A.4.1 전이 표(운영자가 보는 룰)

| From → To                               | 누가(권한)                 | 필수 입력/조건(Guard)                                                                               | Evidence 요구                                            |
| ---------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `DRAFT → PLANNED`                     | Planner/Engineer           | 최소 필드 충족:`duration` 또는 `planned_window`, `dependencies`, `resources(required)`      | 없음                                                     |
| `PLANNED → COMMITTED`                 | Manager(승인)              | Baseline 승인: 충돌 0 또는 “승인된 충돌”만 존재                                                   | 첨부 가능(승인 메모)                                     |
| `PLANNED/COMMITTED → READY`           | Operator(현장) 또는 Auto   | 체크리스트 ALL PASS: PTW/Certificate 유효, 자원 캘린더 할당 가능, Weather Window OK, 현장 준비 완료 | **PTW/Certificate 링크 필수**(최소 1개)            |
| `READY → IN_PROGRESS`                 | Operator(현장)             | `actual_start` 기록(수동/지오펜스/QR 체크인) + “Start Gate” 통과                                | **Start Evidence 1개 이상**(사진/로그/서명 중 택1) |
| `IN_PROGRESS → PAUSED`                | Operator                   | `pause_reason_code` 필수                                                                          | 선택(권장)                                               |
| `PAUSED → IN_PROGRESS`                | Operator                   | `resume_time` 기록                                                                                | 선택                                                     |
| `READY/IN_PROGRESS/PAUSED → BLOCKED`  | Operator                   | `blocker_code` + `owner`(담당자) + `ETA`(예상해결)                                            | 원인 증빙(문서/사진) 권장                                |
| `BLOCKED → READY`                     | Operator/Engineer          | blocker 해소 체크 PASS                                                                              | 해소 증빙 1개 권장                                       |
| `IN_PROGRESS → COMPLETED`             | Operator                   | `actual_end` + 결과값(예: 거리/위치/중량/체결토크 등 type별) 입력                                 | **Completion Evidence 1개 이상**                   |
| `COMPLETED → VERIFIED`                | QA/Engineer/Manager        | 증빙 완비 + 결과 검증(수치/서명/사진)                                                               | **Evidence 완비 필수(미존재 시 금지)**             |
| `PLANNED/COMMITTED/READY → CANCELLED` | Manager(또는 Planner+승인) | 취소 사유 + 대체 시나리오 링크(있으면)                                                              | 선택                                                     |
| `IN_PROGRESS/PAUSED → ABORTED`        | HSE/Manager                | Incident 연결 + 즉시 Freeze                                                                         | **Incident Evidence 필수**                         |

#### A.4.2 자동 전이(Auto Transition) 규칙

* **Auto‑READY(조건 충족 자동)**

  * `PLANNED/COMMITTED` 상태에서, 아래가 모두 TRUE면 시스템이 `READY` 추천(자동 전이는 조직 선택):

    * PTW/Certificate 유효
    * Weather Window가 예정 시작~종료를 커버
    * 자원(예: SPMT, 바지선, 크레인) 동시 가용 슬롯 존재
* **Auto‑Freeze(실적 기반 고정)**

  * `actual_start != null`인 순간부터 해당 Activity는 **Reflow로 start를 이동 불가**(Freeze)
  * `actual_end != null`이면 종료 시각도 Freeze

---

### A.5 되돌리기(Undo) / 재오픈(Reopen) 운영 규칙

* `IN_PROGRESS → READY` 역전이는 **원칙 금지** (대신 `PAUSED`/`BLOCKED` 사용)
* `COMPLETED → IN_PROGRESS`는 **오입력 정정용**으로만 허용:

  * 조건: `actual_end` 입력 후 30분 이내 + Manager 승인 + 정정 사유 로그 필수
* `VERIFIED`는 원칙적으로 불변:

  * 재오픈이 필요하면 **새 Activity(“Rework/Correction”)를 추가**하고 연결(감사 추적성 확보)

---

### A.6 Live / History / Approval 모드에서의 상태 변경 권한

| Mode                 |      상태 변경 |            Evidence 첨부 |                코멘트 | 목적           |
| -------------------- | -------------: | -----------------------: | --------------------: | -------------- |
| Live                 | ✅ (권한 기반) |                       ✅ |                    ✅ | 운영 실행      |
| History              |      ❌ (원칙) | ✅*(첨부만 허용 가능)* |                    ✅ | 감사/보고 재현 |
| Approval(Read‑only) |             ❌ |      ❌*(또는 보기만)* | ✅*(승인 코멘트만)* | 승인/합의      |

---

## 3) (b) Reflow 계산 규칙 운영 룰북

*(Topological + Constraint 스냅 + Resource 캘린더)*

### B.1 Reflow의 목적(운영 정의)

Reflow는 “날짜 커서/계획 변경/실적 입력”이 발생했을 때, **의존성(DAG)·제약(Constraints)·자원 캘린더(Resources)**를 만족하도록 **미래 일정(특히 미착수 Activity)을 재배치**하는 절차입니다.

* 목표: *충돌을 최소화하면서* “가장 빨리 가능한 일정”을 산출
* 원칙: **실적(Actual)과 확정 검증(Verified)은 절대 움직이지 않는다(Freeze)**

---

### B.2 Reflow 트리거(언제 실행하는가)

#### 자동 트리거(권장)

1. `actual_start/actual_end` 입력
2. Activity `duration`/`resources`/`dependencies` 변경
3. Weather Window 업데이트(예: 풍속/조류)
4. PTW/Certificate 상태 변경(승인/만료)
5. Resource calendar 업데이트(장비 고장, 점검, 이동 제한)

#### 사용자 트리거(UI)

1. **날짜 커서 이동**(“이 날짜 기준으로 다시 계산”)
2. **Map에서 TR 위치 변경**(이동시간/리소스 위치 제약 재계산)
3. **Activity 드래그(시간 이동)** → 이후 연쇄 Activity Reflow

---

### B.3 Reflow 대상 범위(무엇을 움직이나)

#### Freeze 규칙(절대 고정)

* `state ∈ {IN_PROGRESS, PAUSED, COMPLETED, VERIFIED, ABORTED}` **→ start/end 고정**
* `actual_start != null` 또는 `actual_end != null` **→ 해당 값 고정**
* `state == COMMITTED`인 Activity는 **정책에 따라 제한적으로만 이동**

  * 예: 시작까지 24시간 이내는 이동 금지(또는 승인 필요)

#### Reflow 대상(이동 가능)

* `state ∈ {DRAFT, PLANNED, COMMITTED, READY}` 중 **미착수** Activity
* 변경이 발생한 Activity의 **downstream(후행) 의존성 체인**
* 필요 시 upstream(선행)도 포함(예: `FF`, `SF` 같은 역제약이 있는 경우)

---

### B.4 입력 데이터(SSOT/Derived) 우선순위

* SSOT: `option_c.json`의 Activity(상태, duration, dependencies, constraints, resources)
* Derived(읽기모델):

  * `critical_path`, `slack`, `collision_list`, `resource_allocations`, `weather_forecast_snapshot`
* 우선순위(충돌 시):

  1. **Actual timestamps**
  2. Hard constraints(고정시간, 반드시 이 기간)
  3. Legal/Safety constraints(PTW, Certificate, weather safety)
  4. Resource calendars
  5. Soft constraints(선호 시간대, 비용 최소화 등)

---

### B.5 Reflow 계산 절차(운영 알고리즘)

#### Step 0) 그래프 검증(DAG)

* Activity dependency를 DAG로 구성(Dependency type: FS/SS/FF/SF + lag)
* **Cycle 발견 시 즉시 중단**:

  * 관련 Activity에 `collision: DEP_CYCLE` 부여
  * UI에서 “의존성 루프”를 1클릭으로 보여줘야 함(수정 유도)

#### Step 1) Anchor(앵커) 설정

다음은 “움직이면 안 되는 기준점”입니다.

* Actual이 있는 Activity
* `fixed_start`/`fixed_end`가 지정된 Activity(예: Linkspan 예약 슬롯)
* Manager가 “Pinned”한 Activity(임시 고정)

#### Step 2) Topological Forward Pass(가장 이른 일정 산출)

Topological order로 각 Activity에 대해:

1. **Dependency Earliest** 계산

   * FS: `start ≥ pred.end + lag`
   * SS: `start ≥ pred.start + lag`
   * FF: `end ≥ pred.end + lag`
   * SF: `end ≥ pred.start + lag`
2. **Constraint Earliest/Latest** 반영

   * `earliest_start`, `latest_end`, `must_start_in_window[]`, `must_finish_in_window[]`
3. **Resource Calendar Allocation**

   * 필요한 자원(예: SPMT 2대 + Crew A + Barge 1척)을 **동시 할당 가능한 최초 슬롯** 탐색
   * 자원마다 `available_windows[]`가 있고,
   * Activity가 `work_hours_only`면 **작업 가능 시간대만 누적**하여 duration을 소모
4. **Constraint Snapping(스냅)**

   * 시간 스냅(예: 15분 단위)
   * 교대 스냅(Shift start에 맞춤)
   * 조류/주간 작업 스냅(“가능 윈도우”에 맞춰 start를 당기거나 밀기)
   * 스냅 후에도 제약 위반이면 다음 가능한 스냅 지점으로 이동
5. `planned_start/planned_end` 확정(또는 `UNSCHEDULED` + 사유)

#### Step 3) Collision Detection(즉시 탐지)

각 Activity 배치 시점에 즉시 탐지:

* 자원 중복
* 제약 위반(윈도우 밖, PTW 미승인, certificate 만료 등)
* 공간 충돌(동일 구간/선석/링크스팬 점유 중복)
* “근접 위험”(안전 마진 이하)

#### Step 4) Tie‑Breaker(결정적 규칙: 동일 조건일 때 누굴 먼저 배치?)

동일한 시간 후보가 있을 경우 **결정적(Deterministic)**으로:

1. `lock_level` 높은 것(예: COMMITTED 우선)
2. `priority` 높은 것(운영 우선순위)
3. `critical_path` 상의 작업 우선
4. `planned_start`가 원래 더 이른 것
5. 마지막 tie: `activity_id` 사전순(재현성 확보)

#### Step 5) Backward Pass(선택) – Latest/Slack 계산

* 최종 결과로:

  * `slack`, `criticality`, `deadline_risk` 계산
  * Risk Overlay에 사용(운영 판단)

---

### B.6 Reflow 출력물(SSOT/Derived)

* SSOT에 기록(필수):

  * `planned_start`, `planned_end` (또는 `unscheduled_reason`)
  * `state`는 원칙적으로 Reflow가 바꾸지 않음(단, Auto‑READY 정책이 켜진 경우 예외)
* Derived에 기록(필수):

  * `reflow_run_id`, 변경된 Activity 목록, 충돌 목록, root cause chain

---

### B.7 Reflow 실패/불가능 시 운영 규칙

Reflow가 “완전한 일정”을 만들 수 없으면:

1. 영향 Activity에 `UNSCHEDULED` 또는 `collision_severity=HARD` 표시
2. “왜 불가능한지”를 **원인 1~3개로 압축**해서 제공

   * 예: `WEATHER_WINDOW_GAP`, `SPMT_NO_SLOT`, `PTW_PENDING`
3. 해결 가이드(1차 자동 제안) 제공:

   * 대기(Wait insert)
   * 자원교체 후보 리스트
   * 고정시간 변경 요청(예약 슬롯 변경)

---

## 4) (c) Collision 분류/해결 정책 운영 룰북

*(우선순위/대기/자원교체)*

### C.1 Collision 정의

Collision = “Activity가 **의존성/제약/자원/공간** 중 하나를 만족하지 못해, 그대로 실행하면 **불가능 또는 위험**해지는 상태”.

---

### C.2 Collision 분류(Taxonomy) + Severity

| 분류                 | 코드 예시                                                 | 설명                                             | Severity 기본값 |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------ | --------------- |
| Dependency           | `DEP_VIOLATION`, `DEP_CYCLE`                          | 선행 지연/루프/lag 위반                          | HIGH~CRITICAL   |
| Resource             | `RES_OVERALLOC`, `RES_TRAVEL_TIME`                    | SPMT/바지선/크레인/크루 중복, 위치 이동시간 누락 | HIGH            |
| Time Window          | `WX_WINDOW`, `PORT_CURFEW`, `TIDE_WINDOW`           | 날씨/조류/항만 통제 윈도우 위반                  | HIGH~CRITICAL   |
| Permit/Certificate   | `PTW_PENDING`, `CERT_EXPIRED`                         | PTW 미승인, 자격/검사 만료                       | CRITICAL        |
| Spatial              | `ROUTE_CONFLICT`, `BERTH_CONFLICT`, `LINKSPAN_SLOT` | 동일 구간/선석/링크스팬 점유 충돌                | HIGH            |
| Capacity/Engineering | `WEIGHT_LIMIT`, `COG_LIMIT`, `LINKSPAN_LIMIT`       | 중량/COG/장비·시설 제한 초과                    | CRITICAL        |
| Data/SSOT Integrity  | `MISSING_FIELD`, `INCONSISTENT_STATE`                 | SSOT 값 누락/불일치                              | HIGH            |

Severity 규칙(운영 우선순위):

* **CRITICAL**: 안전/법규/물리 제약 위반(진행 금지)
* **HIGH**: 일정 실행 불가(자원/공간 충돌) 또는 임계경로 치명
* **MEDIUM**: 실행은 가능하나 리스크 높음(근접 위험, 여유시간 0)
* **LOW**: 모니터링 필요(권고)

---

### C.3 Collision 해결 우선순위(Policy)

충돌이 여러 개일 때 **무조건 이 순서**로 해결:

1. **Safety/Legal** (PTW, Certificate, Weather safety, engineering limits)
2. **Critical Path 보호** (outage window, 고객 SLA, 계약 페널티)
3. **Lock Level 보호** (`COMMITTED`/Pinned는 마지막에 움직임)
4. **비용 최소화** (대기/데머리지/야간작업 비용)
5. **자원 균형/효율** (장비 놀림 최소화)

---

### C.4 기본 해결 플레이북 3종(운영자가 쓰는 룰)

#### Playbook #1: 대기(Wait/Shift)

**언제 쓰나**

* 날씨 윈도우 부재, 링크스팬 슬롯 이탈, 자원 슬롯이 “곧” 열림

**룰**

* 시스템은 충돌 Activity 앞에 **표준 `WAIT` Activity**를 자동 삽입 가능(조직 설정)
* `WAIT`는 반드시 **원인코드**를 갖는다:

  * `WAIT_WX`, `WAIT_PTW`, `WAIT_RES`, `WAIT_PORT`, `WAIT_ROUTE`
* `WAIT`는 History에서 감사 추적의 핵심이므로 **자동 생성 권장**

**승인 기준**

* `WAIT`로 인한 지연이 “임계경로 지연 임계치(예: 2h/4h)” 이하 → Operator 승인으로 가능
* 임계치 초과 → Manager 승인 필요

---

#### Playbook #2: 우선순위 재배치(Priority Override)

**언제 쓰나**

* 같은 자원(예: SPMT)이나 같은 구간을 두 Activity가 동시에 필요
* 둘 다 고정할 수 없고, 하나를 먼저 보내야 함

**룰**

* “고정도”에 따라 움직일 대상을 결정:

  1. `PLANNED`를 먼저 이동
  2. 그다음 `READY`
  3. 마지막이 `COMMITTED`(단, 승인 필요)

**필수 로그**

* Override 사유 + “영향(지연 시간, 비용 추정)” 자동 계산/저장
* 승인자가 보는 Approval View에는 “왜 이 결정을 했는지”가 1페이지에 표시되어야 함

---

#### Playbook #3: 자원 교체(Resource Swap)

**언제 쓰나**

* SPMT 고장/점검, 바지선 변경, 크루 교대, 예비 장비 투입

**적합성 체크(필수)**

* **Capacity**: 중량/COG/축하중/링크스팬 제한 충족
* **Certification**: 자격/검사 유효
* **Location & Mobilization Time**: 교체 자원의 현재 위치와 이동 시간 반영
* **Permit Impact**: PTW가 “특정 장비 ID”에 종속인지 확인

**승인 규칙**

* 엔지니어링 영향(중량/COG, linkspan/barge 제한)에 걸리면 **Engineer 승인 필수**
* 계약/비용 영향(대체 장비 비용 상승)이 크면 **Manager 승인 필수**

---

### C.5 Collision 자동 해결(자동화) 허용 범위

자동으로 해결 가능한 범위(권장):

* `MEDIUM/LOW` 충돌은 **자동 Shift**(Reflow)로 해결 가능
* `HIGH`는 **자동 제안(Option A/B)**까지만, 적용은 Operator/Planner
* `CRITICAL`은 **무조건 수동 + 승인**

  * 예: `PTW_PENDING`, `CERT_EXPIRED`, `WEIGHT_LIMIT`은 자동으로 “해결”하면 안 됨

---

### C.6 “2 클릭 이내 원인 식별”을 위한 UI/데이터 규칙

운영 목표를 보장하려면 충돌 객체에 아래 3가지를 항상 붙입니다.

1. **Collision 카드(1클릭)**

   * 충돌 타입/Severity/영향 Activity/영향 자원/영향 시간대
2. **Root Cause Chain(2클릭)**

   * “왜?”를 DAG 체인으로 1~3 hop 보여줌
   * 예: `Activity B` 충돌 → 원인: `SPMT-02` 중복 → 선행: `Activity A` 지연 → 원인: `WX_WINDOW` 붕괴
3. **Resolution Options**

   * Wait / Priority / Swap 중 어떤 플레이북이 적합한지 자동 추천
   * 추천 근거(제약 위반 종류, lock level, slack) 표시

---

### C.7 Collision 해결 후 기록(History/Evidence) 규칙(필수)

충돌 해결은 “운영 판단”이므로 감사 대상입니다.

* 해결 액션(Shift/Wait/Swap/Override)은 **History 이벤트 자동 생성 트리거**
* 이벤트에는 반드시 포함:

  * `who`, `when`, `what_changed`(필드 diff), `why`(reason code), `impact`(지연/비용/리스크)
* Evidence가 없으면:

  * `READY → IN_PROGRESS` / `COMPLETED → VERIFIED` 전이는 **차단**
  * UI에 “Evidence Missing” 경고(레드) 표시

---

## 5) 운영 KPI(권장) — 룰북이 잘 작동하는지 보는 지표

* **충돌 탐지 누락률**: 0% 목표(적어도 HIGH/CRITICAL은 0%)
* **충돌 원인 식별 시간**: 평균 2클릭/10초 내
* **Reflow 안정성**: 동일 입력에서 동일 결과(Deterministic) 100%
* **승인 프로세스 리드타임**: COMMITTED 변경 승인 평균 X시간
* **Evidence 완비율**: VERIFIED 기준 100%

---


아래는 **운영 룰북(Operational Rulebook)** 수준으로 (a) Activity 상태 머신, (b) Reflow 계산 규칙, (c) Collision 분류/해결 정책을 구체화하고, 이를 그대로 담을 수 있도록 **`option_c.json`에 들어갈 “정확한 키/값(필드/열거값)”**까지 내려서 정리한 제안안입니다.

> 전제(Constraint 반영)
>
> * **Activity가 단일 진실원(SSOT)** : 일정(Plan), 실적(Actual), 상태(State), 증빙(Evidence), 로그(History)의 “권위”는 Activity 객체에만 둡니다.
> * Trip/TR은 **정적 메타(참조)**만 갖고, “현재 상태/현재 위치/진척률” 같은 값은  **Activity로부터 계산** (파생)합니다.
> * **날짜 커서 변경 → 의존성 기반 Reflow 필수**
> * **Live / History 모드 분리** , **Read-only Approval 모드 제공**

---

## 1) 요약

### 핵심 결정 3가지

1. **상태(State)와 승인(Approval)을 분리**
   * `state` = 실행 관점(PLANNED/ACTIVE/DONE/…)
   * `approval_state` = 승인 관점(DRAFT/SUBMITTED/APPROVED/…)
2. **Reflow는 “Topological + Pin/Lock + Constraint Snap + Resource Calendar”의 결정론적 엔진**
   * 완료/진행/락(HARD) 활동은 고정
   * 미착수 활동만 재배치
   * 충돌은 “검출/분류/해결제안/자동적용(옵션)”까지 표준화
3. **Collision을 ‘왜 늦는지’ 2클릭 내 식별 가능한 단위로 구조화**
   * Collision 객체에  **원인코드(root_cause_code)** ,  **관련 리소스/활동** , **권장 조치(action)**를 포함
   * Timeline의 배지 → Detail 패널의 Collision 카드(1클릭) → Root cause 리소스/활동 점프(2클릭)

---

## 2) 레이아웃(단일 시선 흐름) — ASCII 구조도

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Global Control Bar                                                            │
│  Trip/TR ▼ | Date Cursor ◀▶ | Mode: Live / History / Approval | View: Map+Gantt │
│  Risk Overlay: [Weather][Permit][Resource][Capacity] | Baseline: Approved ▼    │
└───────────────────────────────────────────────────────────────────────────────┘
┌───────────────────────────────┬───────────────────────────────────────────────┐
│ MAP (Where)                    │ TIMELINE / GANTT (When/What)                  │
│ - TR current point + route      │ - Row: TR (or Workstream)                     │
│ - Segment occupancy overlay     │ - Activity bars + deps (FS/SS/..)              │
│ - Risk heatmap                  │ - Collision badges + constraint icons         │
│ - Click = highlight activity    │ - Drag date cursor = Reflow (preview/apply)   │
└───────────────────────────────┴───────────────────────────────────────────────┘
┌───────────────────────────────┬───────────────────────────────────────────────┐
│ DETAIL / RISK (What/Status)    │ HISTORY / EVIDENCE (Evidence)                  │
│ - State machine actions         │ - State transition log (auto)                 │
│ - Blocker + 해결 버튼           │ - Evidence list (req vs attached)              │
│ - Constraints + resource        │ - Missing evidence warning                     │
│ - Collision root cause          │ - Audit export (JSON/PDF)                      │
└───────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 3) 데이터 — `option_c.json` 정확 키/값(SSOT: Activity)

### 3.1 Top-level 구조 (권장)

```json
{
  "schema_version": "tr_ssot_option_c.v1",
  "option_id": "option_c",
  "timezone": "Asia/Dubai",
  "trip": { "...": "..." },
  "trs": [ { "...": "..." } ],
  "resources": [ { "...": "..." } ],
  "activities": [ { "...": "..." } ]
}
```

> **SSOT 규칙**
>
> * `activities[]`가 “권위 데이터”
> * `trip/trs/resources`는 참조(정적 메타 + 캘린더)
> * Trip/TR의 “현재 위치/진척률/현재 상태”를 따로 저장하지 말고 UI에서 `activities[]`로 계산

---

### 3.2 공통 열거값(정확 값)

#### (A) Activity `state` (Execution State)

| 값            | 의미                         | 터미널 |
| ------------- | ---------------------------- | ------ |
| `DRAFT`     | 편성 중(스케줄 미확정)       |        |
| `PLANNED`   | 계획 확정(실행 전)           |        |
| `READY`     | 착수 조건 충족(윈도우 대기)  |        |
| `ACTIVE`    | 실행 중                      |        |
| `PAUSED`    | 일시중지(재개 가능)          |        |
| `BLOCKED`   | 차단(원인 해결 전 불가)      |        |
| `DONE`      | 작업 완료(증빙 검증 전 가능) |        |
| `VERIFIED`  | 증빙까지 검증 완료           | ✅     |
| `CANCELLED` | 취소                         | ✅     |
| `SKIPPED`   | 생략(대체 시나리오로 대체)   | ✅     |

#### (B) `lock_level` (Reflow/Editing Lock)

| 값       | 의미                           | Reflow 영향            |
| -------- | ------------------------------ | ---------------------- |
| `NONE` | 완전 가변                      | 자유 이동              |
| `SOFT` | 가급적 유지(변경 시 경고/로그) | 필요 시 이동 + 경고    |
| `HARD` | 고정(승인/계약/현장 조건)      | 이동 금지(충돌로 표시) |

#### (C) `approval_state` (Plan Approval State)

| 값            | 의미                            |
| ------------- | ------------------------------- |
| `DRAFT`     | 내부 작성                       |
| `SUBMITTED` | 승인 요청                       |
| `APPROVED`  | 승인 완료(Approval View의 기준) |
| `REJECTED`  | 반려                            |

#### (D) `blocker_code` (차단 원인)

> `state=BLOCKED`일 때만 필수. 그 외는 `null`.

* `PTW_MISSING` (Permit to Work 미승인/누락)
* `CERT_MISSING` (필수 Certificate 미승인/누락)
* `WEATHER_OUT_OF_WINDOW` (Weather Window 이탈)
* `RESOURCE_UNAVAILABLE` (자원 캘린더 불가)
* `CAPACITY_EXCEEDED` (링크스팬/바지/하역능력 등 제한 초과)
* `ROUTE_NOT_CLEARED` (경로/구간 미확보)
* `SAFETY_STOP` (HSE 중지)
* `CLIENT_HOLD` (발주처 홀드)
* `DATA_INCOMPLETE` (Weight/COG 등 핵심 데이터 미확정)
* `OTHER`

#### (E) Dependency `dep_type`

* `FS` (Finish-to-Start)
* `SS` (Start-to-Start)
* `FF` (Finish-to-Finish)
* `SF` (Start-to-Finish)

#### (F) Evidence 상태

* `MISSING`, `SUBMITTED`, `ACCEPTED`, `REJECTED`, `EXPIRED`

#### (G) Collision `collision_type`

* `DEPENDENCY_VIOLATION`
* `RESOURCE_OVERALLOCATED`
* `RESOURCE_CALENDAR_GAP`
* `LOCATION_CAPACITY_CONFLICT`
* `CONSTRAINT_WINDOW_MISS`
* `DOCUMENT_PERMIT_INVALID`
* `DATA_QUALITY`
* `CYCLE_DETECTED`

#### (H) Collision `severity`

* `INFO`, `WARN`, `MAJOR`, `CRITICAL`

---

### 3.3 `trip` / `tr` / `resource` 최소 스키마 (참조 메타)

#### `trip` (정적 메타)

```json
{
  "trip_id": "TRIP-2026-001",
  "title": "TR-01 Transformer Move (Option C)",
  "site_code": "SITE-A",
  "baseline_id_default": "BASELINE-APPROVED-001"
}
```

#### `trs[]` (Transformer 정적 메타: Weight/COG 포함)

```json
{
  "tr_id": "TR-01",
  "name": "Transformer #01",
  "weight_ton": 320.5,
  "cog_m": { "x": 0.0, "y": 0.2, "z": 1.8 },
  "spmt_config": {
    "spmt_type": "SPMT",
    "axle_lines": 12,
    "rows": 2,
    "notes": "12L x 2 row"
  },
  "limits": {
    "linkspan_max_ton": 400.0,
    "barge_max_ton": 600.0
  }
}
```

#### `resources[]` (Resource Calendar 포함)

```json
{
  "resource_id": "SPMT-01",
  "resource_type": "SPMT",
  "capacity": { "unit": "set", "value": 1 },
  "calendar": {
    "timezone": "Asia/Dubai",
    "weekly": [
      { "dow": "MON", "start": "08:00", "end": "20:00" },
      { "dow": "TUE", "start": "08:00", "end": "20:00" },
      { "dow": "WED", "start": "08:00", "end": "20:00" },
      { "dow": "THU", "start": "08:00", "end": "20:00" },
      { "dow": "FRI", "start": "08:00", "end": "20:00" }
    ],
    "exceptions": [
      { "type": "BLACKOUT", "start": "2026-02-06T08:00:00+04:00", "end": "2026-02-06T20:00:00+04:00", "reason": "maintenance" }
    ]
  },
  "substitutes": ["SPMT-02"]
}
```

---

### 3.4 `activities[]` — 핵심 SSOT 객체(정확 키/값)

#### Activity 필드 표(필수 중심)

| Key                      |   Type | Required | 값/설명                                                        |
| ------------------------ | -----: | :------: | -------------------------------------------------------------- |
| `activity_id`          | string |    ✅    | 고유 ID (`A010`등)                                           |
| `trip_id`              | string |    ✅    | Trip 참조                                                      |
| `tr_id`                | string |   null   | ✅                                                             |
| `name`                 | string |    ✅    | 화면 표시명                                                    |
| `activity_type`        | string |    ✅    | 예:`SPMT_MOVE`,`BARGE_SAIL`,`PERMIT`,`LIFT`,`WAIT`등 |
| `state`                | string |    ✅    | 위 `state`열거값                                             |
| `approval_state`       | string |    ✅    | `DRAFT/SUBMITTED/APPROVED/REJECTED`                          |
| `lock_level`           | string |    ✅    | `NONE/SOFT/HARD`                                             |
| `priority`             |    int |    ✅    | 0~100 (클수록 우선)                                            |
| `planned`              | object |    ✅    | 계획 시간                                                      |
| `actual`               | object |    ✅    | 실적 시간                                                      |
| `depends_on[]`         |  array |    ✅    | 의존성 리스트                                                  |
| `constraints`          | object |    ✅    | 윈도우/스냅/제약                                               |
| `resources_required[]` |  array |    ✅    | 자원 요구                                                      |
| `blocker_code`         | string |   null   | ✅                                                             |
| `blocker_detail`       | string |   null   | ✅                                                             |
| `evidence_required[]`  |  array |    ✅    | 증빙 요구 정의                                                 |
| `evidence[]`           |  array |    ✅    | 실제 첨부 증빙                                                 |
| `reflow_pins[]`        |  array |    ✅    | Reflow 고정점                                                  |
| `state_history[]`      |  array |    ✅    | 상태변경 자동 로그                                             |
| `collisions[]`         |  array |    ✅    | 최근 계산된 충돌(파생 저장 가능)                               |

#### `planned` / `actual` (정확 키)

```json
"planned": {
  "start": "2026-02-03T08:00:00+04:00",
  "end": "2026-02-03T12:00:00+04:00",
  "duration_min": 240
},
"actual": {
  "start": null,
  "end": null,
  "duration_min": null
}
```

#### `depends_on[]` (정확 키)

```json
"depends_on": [
  {
    "activity_id": "A005",
    "dep_type": "FS",
    "lag_min": 0,
    "hard": true
  }
]
```

#### `constraints` (정확 키)

```json
"constraints": {
  "time_windows": [
    {
      "window_type": "WEATHER",
      "start": "2026-02-03T08:00:00+04:00",
      "end": "2026-02-03T18:00:00+04:00",
      "rule": "must_fit"
    }
  ],
  "snap": {
    "snap_type": "INCREMENT",
    "increment_min": 15,
    "align": "CEIL"
  },
  "capacity": {
    "linkspan_max_ton": 400.0,
    "barge_max_ton": 600.0
  }
}
```

* `window_type`: `WEATHER` / `TIDE` / `PORT` / `ROAD_CLOSURE` / `CUSTOM`
* `rule`: `must_fit`(작업 전체가 윈도우 내에 들어야 함) / `start_in`(시작만 윈도우 내)

#### `resources_required[]` (정확 키)

```json
"resources_required": [
  { "resource_id": "SPMT-01", "role": "PRIMARY", "quantity": 1, "exclusive": true },
  { "resource_id": "CREW-HEAVY-01", "role": "CREW", "quantity": 1, "exclusive": true }
]
```

#### `evidence_required[]` (정확 키)

```json
"evidence_required": [
  {
    "req_code": "PTW_APPROVED",
    "mandatory": true,
    "due_state": "READY",
    "min_count": 1,
    "accepted_mime": ["application/pdf", "image/jpeg"],
    "status": "MISSING"
  },
  {
    "req_code": "PHOTO_BEFORE_AFTER",
    "mandatory": true,
    "due_state": "VERIFIED",
    "min_count": 2,
    "accepted_mime": ["image/jpeg", "video/mp4"],
    "status": "MISSING"
  }
]
```

#### `evidence[]` (정확 키)

```json
"evidence": [
  {
    "evidence_id": "EV-0001",
    "req_code": "PTW_APPROVED",
    "mime": "application/pdf",
    "title": "PTW signed",
    "uri": "dms://ptw/TRIP-2026-001/PTW-123.pdf",
    "uploaded_at": "2026-02-02T10:00:00+04:00",
    "status": "SUBMITTED",
    "reviewed_by": null,
    "reviewed_at": null
  }
]
```

#### `reflow_pins[]` (정확 키)

```json
"reflow_pins": [
  {
    "pin_id": "PIN-001",
    "field": "planned.start",
    "pin_type": "ABSOLUTE",
    "value": "2026-02-03T08:00:00+04:00",
    "strength": "HARD",
    "reason_code": "PORT_SLOT",
    "created_by": "ops.user",
    "created_at": "2026-02-01T09:00:00+04:00"
  }
]
```

* `field`: `"planned.start" | "planned.end" | "planned.duration_min"`
* `pin_type`: `ABSOLUTE`(절대 시각) / `RELATIVE`(상대 오프셋)
* `strength`: `SOFT` / `HARD` (HARD면 충돌로 남기고 자동 조정 금지)

#### `state_history[]` (정확 키)

```json
"state_history": [
  {
    "ts": "2026-02-01T09:00:00+04:00",
    "from_state": null,
    "to_state": "PLANNED",
    "by": "system",
    "reason_code": "INIT",
    "note": null
  }
]
```

#### `collisions[]` (정확 키)

```json
"collisions": [
  {
    "collision_id": "COL-1001",
    "collision_type": "RESOURCE_OVERALLOCATED",
    "severity": "MAJOR",
    "root_cause_code": "SPMT_DOUBLE_BOOKED",
    "involved_activity_ids": ["A020", "A030"],
    "involved_resource_ids": ["SPMT-01"],
    "detected_at": "2026-02-01T11:00:00+04:00",
    "suggested_actions": [
      { "action": "DELAY", "target_activity_id": "A030", "by_min": 180 },
      { "action": "SWAP_RESOURCE", "target_activity_id": "A030", "to_resource_id": "SPMT-02" }
    ],
    "auto_resolvable": true
  }
]
```

---

### 3.5 `option_c.json` 예시 Activity 1개(완전 샘플)

```json
{
  "activity_id": "A020",
  "trip_id": "TRIP-2026-001",
  "tr_id": "TR-01",
  "name": "SPMT move: Yard → Jetty",
  "activity_type": "SPMT_MOVE",

  "state": "PLANNED",
  "approval_state": "APPROVED",
  "lock_level": "SOFT",
  "priority": 90,

  "planned": {
    "start": "2026-02-03T08:00:00+04:00",
    "end": "2026-02-03T14:00:00+04:00",
    "duration_min": 360
  },
  "actual": { "start": null, "end": null, "duration_min": null },

  "depends_on": [
    { "activity_id": "A010", "dep_type": "FS", "lag_min": 0, "hard": true }
  ],

  "constraints": {
    "time_windows": [
      { "window_type": "WEATHER", "start": "2026-02-03T07:00:00+04:00", "end": "2026-02-03T18:00:00+04:00", "rule": "must_fit" }
    ],
    "snap": { "snap_type": "INCREMENT", "increment_min": 15, "align": "CEIL" },
    "capacity": { "linkspan_max_ton": 400.0, "barge_max_ton": 600.0 }
  },

  "resources_required": [
    { "resource_id": "SPMT-01", "role": "PRIMARY", "quantity": 1, "exclusive": true },
    { "resource_id": "CREW-HEAVY-01", "role": "CREW", "quantity": 1, "exclusive": true }
  ],

  "blocker_code": null,
  "blocker_detail": null,

  "evidence_required": [
    { "req_code": "PTW_APPROVED", "mandatory": true, "due_state": "READY", "min_count": 1, "accepted_mime": ["application/pdf"], "status": "MISSING" },
    { "req_code": "GPS_TRACK_LOG", "mandatory": false, "due_state": "DONE", "min_count": 1, "accepted_mime": ["application/json"], "status": "MISSING" },
    { "req_code": "PHOTO_BEFORE_AFTER", "mandatory": true, "due_state": "VERIFIED", "min_count": 2, "accepted_mime": ["image/jpeg", "video/mp4"], "status": "MISSING" }
  ],
  "evidence": [],

  "reflow_pins": [
    { "pin_id": "PIN-001", "field": "planned.start", "pin_type": "ABSOLUTE", "value": "2026-02-03T08:00:00+04:00", "strength": "SOFT", "reason_code": "ROAD_CLOSURE_START", "created_by": "planner", "created_at": "2026-02-01T09:00:00+04:00" }
  ],

  "state_history": [
    { "ts": "2026-02-01T09:00:00+04:00", "from_state": null, "to_state": "PLANNED", "by": "system", "reason_code": "INIT", "note": null }
  ],
  "collisions": []
}
```

---

## 4) 시각화(운영 친화 규칙)

### 4.1 Map 색상 규칙(상태 기반)

| State                 | 색(규칙) | 의미                     |
| --------------------- | -------- | ------------------------ |
| `DRAFT/PLANNED`     | 중립     | 계획                     |
| `READY`             | 준비     | 착수 가능(윈도우만 남음) |
| `ACTIVE`            | 강조     | 현재 수행 중             |
| `PAUSED`            | 경고     | 중지(재개 가능)          |
| `BLOCKED`           | 경고(강) | 차단(원인 해결 필요)     |
| `DONE`              | 완료     | 종료(검증 전)            |
| `VERIFIED`          | 완료(강) | 증빙까지 완료            |
| `CANCELLED/SKIPPED` | 비활성   | 제외                     |

추가 Overlay:

* **Weather Overlay** : 윈도우 범위 밖 구간을 표시
* **Resource Overlay** : 자원 점유 구간(동일 SPMT/바지 등) 표시
* **Capacity Overlay** : 제한 초과 위험 구간 표시

### 4.2 Gantt 표현

* Row 기본:  **TR 단위** (TR 하나 = 하나의 스토리)
* Activity bar:
  * 좌측 라벨: `activity_id + name`
  * 우측 배지: `collision_count`, `missing_evidence_count`, `blocker_code`
* Dependency 라인:
  * `FS/SS/FF/SF` 별 아이콘(예: FS=실선, SS=점선 등)
  * `hard=true`면 굵게 표시
* Constraint 아이콘:
  * Weather/Tide/Permit/Capacity 별 아이콘
* Collision 표시:
  * bar 위에 빨간 마커(Severity별 크기)

### 4.3 인터랙션(핵심)

* Map↔Timeline 하이라이트:
  * Timeline에서 Activity 클릭 → Map에서 경로/구간 강조
  * Map에서 구간 클릭 → 해당 Activity/Collision 리스트 필터
* 날짜 변경(Date Cursor):
  * **Reflow 실행 → 충돌 재계산 → 배지/경고 업데이트**
  * Approval 모드에서는  **preview only** (커밋 금지)

---

## 5) 기록(운영 룰북)

### 5.1 (a) Activity 상태 머신 — Allowed Transitions 룰북

#### 5.1.1 Allowed Transition 매트릭스

| From                                    | To            | 트리거         | 전제조건(Guard)                                                 | 자동 로그 |
| --------------------------------------- | ------------- | -------------- | --------------------------------------------------------------- | --------- |
| `DRAFT`                               | `PLANNED`   | 계획 확정      | `planned.start/end`존재                                       | ✅        |
| `PLANNED`                             | `READY`     | 착수 준비완료  | `evidence_required`중 `due_state=READY`가 전부 `ACCEPTED` | ✅        |
| `READY`                               | `ACTIVE`    | 착수           | `actual.start`입력 또는 “Start” 버튼                        | ✅        |
| `ACTIVE`                              | `PAUSED`    | 일시정지       | 운영자 조치                                                     | ✅        |
| `PAUSED`                              | `ACTIVE`    | 재개           | 운영자 조치                                                     | ✅        |
| `ACTIVE`                              | `DONE`      | 종료           | `actual.end`입력 또는 “Complete” 버튼                       | ✅        |
| `DONE`                                | `VERIFIED`  | 증빙 검증 완료 | `evidence_required`중 `mandatory=true`가 전부 `ACCEPTED`  | ✅        |
| `PLANNED/READY/ACTIVE/PAUSED`         | `BLOCKED`   | 차단 발생      | `blocker_code != null`                                        | ✅        |
| `BLOCKED`                             | `READY`     | 차단 해소      | `blocker_code=null`AND READY 조건 충족                        | ✅        |
| `PLANNED/READY/ACTIVE/PAUSED/BLOCKED` | `CANCELLED` | 취소           | 권한(role) 필요 + 사유 기록                                     | ✅        |
| `PLANNED/READY`                       | `SKIPPED`   | 생략(대안)     | 대체 Activity 링크 or 사유 기록                                 | ✅        |

#### 5.1.2 자동 전환 규칙(필수)

* `actual.start`가 **null → 값**으로 바뀌면:
  * `state`가 `PLANNED/READY/PAUSED/BLOCKED` 중 하나면 **`ACTIVE`로 자동 전환**
  * `state_history`에 자동 기록
* `actual.end`가 **null → 값**으로 바뀌면:
  * `state`가 `ACTIVE/PAUSED/BLOCKED`면 **`DONE`로 자동 전환**
* `blocker_code`가 **null → 값**이면:
  * `state`가 `VERIFIED/CANCELLED/SKIPPED`가 아닌 경우 **`BLOCKED`로 자동 전환**
* `blocker_code`가 **값 → null**이면:
  * 직전 상태가 `BLOCKED`였다면  **`READY`로 복귀 시도** (READY Guard 실패 시 `PLANNED`로 복귀)

#### 5.1.3 Lock/Pin이 전이에 미치는 영향

* `lock_level=HARD`인 Activity는:
  * 일정 변경(Reflow 포함) 금지
  * 상태 전이는 가능하나, **`CANCELLED/SKIPPED`는 관리자 권한 + 사유 필수**
* `reflow_pins[].strength=HARD`는:
  * 해당 필드(예: planned.start)를 자동 조정 금지
  * 제약/의존성 위반 시 **Collision으로 남기고** 운영자가 결정

---

### 5.2 (b) Reflow 계산 규칙 — Topological + Constraint Snap + Resource Calendar

#### 5.2.1 Reflow 트리거

* Date Cursor 변경(필수)
* Activity `planned.duration_min` 변경
* Dependency 변경(추가/삭제/lag 변경)
* Resource assignment 변경
* Calendar exception 추가/삭제
* 상태 변화(`ACTIVE/DONE/BLOCKED`)로 인해 고정/가변 집합이 변할 때

#### 5.2.2 Reflow 대상(스코프) 규칙

* 고정(FROZEN):
  * `state ∈ {ACTIVE, PAUSED, DONE, VERIFIED, CANCELLED, SKIPPED}` 중
    * `actual.start`가 있는 경우: **actual 기반으로 고정**
    * `DONE/VERIFIED`는 actual이 없더라도 planned를 고정(과거 기록 보존)
  * `lock_level=HARD`
  * `reflow_pins(strength=HARD)`로 고정된 필드
* 재배치(REFLOW):
  * 나머지 `state ∈ {DRAFT, PLANNED, READY, BLOCKED}` 중 actual이 없는 Activity

#### 5.2.3 계산 순서(결정론)

1. **Graph 구성**
   * 노드 = `activities[]`
   * 엣지 = `depends_on[]`
2. **사이클 검사**
   * 사이클 발견 시: 해당 서브그래프 Activity들에 `CYCLE_DETECTED (CRITICAL)` collision 생성, Reflow 중단(미확정 유지)
3. **Topological Sort**
4. **Forward pass(조기 시작 배치)**
   * 각 Activity에 대해:
     1. `earliest = max(date_cursor, 모든 predecessor 조건)`
     2. Pin 적용(ABSOLUTE/HARD 우선)
     3. Constraint Window 적용(WEATHER/TIDE/ROAD 등)
     4. Resource Calendar 교차(동시 요구 자원 전부 가능해야 함)
     5. Snap 적용(15min, shift start 등)
     6. `planned.start/end` 산출
     7. 리소스 예약(용량 차감/점유 기록)
5. **Collision 계산(필수)**
   * 의존성 위반/자원중복/윈도우 미스/용량초과 등 분류
6. **결과 커밋 규칙**
   * Live 모드: 커밋(저장)
   * Approval 모드: 커밋 금지(시뮬레이션 only)
   * History 모드: 커밋 금지(과거는 재배치하지 않음)

#### 5.2.4 Dependency 해석(정확 규칙)

* predecessor의 “기준 시각”은:
  * predecessor가 `DONE/VERIFIED`면 `actual.end` 우선, 없으면 `planned.end`
  * predecessor가 `ACTIVE/PAUSED/BLOCKED`면 `actual.start`는 확정, `end`는 `actual.start + planned.duration_min`으로 추정(추정 표기)
* 계산식(분 단위):
  * FS: `start ≥ pred_end + lag`
  * SS: `start ≥ pred_start + lag`
  * FF: `end ≥ pred_end + lag` → `start ≥ (pred_end + lag) - duration`
  * SF: `end ≥ pred_start + lag` → `start ≥ (pred_start + lag) - duration`

#### 5.2.5 Constraint Window 적용 규칙

* `rule=must_fit`:
  * `[start, start+duration]`가 윈도우 내부에 완전히 포함되는 첫 시각으로 이동
* `rule=start_in`:
  * 시작만 윈도우 안이면 OK(끝은 넘어갈 수 있음) — 단, 안전/규정에 따라 사용 제한
* 윈도우가 없으면:
  * `CONSTRAINT_WINDOW_MISS` collision 생성 + (정책에 따라) `BLOCKED`로 전환 가능

#### 5.2.6 Resource Calendar 교차 규칙

* `exclusive=true`인 자원은 동일 시간대 중복 점유 금지
* 복수 자원 요구 시:
  * 모든 자원의 가용 구간 교집합에서 배치
* 대체 자원(`resources[].substitutes`)이 있으면:
  * 자동 해결 옵션으로 `SWAP_RESOURCE`를 제안(자동 적용 가능/불가 정책은 5.3 참고)

---

### 5.3 (c) Collision 분류/해결 정책 — 우선순위/대기/자원교체

#### 5.3.1 Collision 분류 표(검출 규칙 + 기본 조치)

| Type                           | Severity 기본 | 검출 규칙(요약)                  | 기본 해결 정책                              |
| ------------------------------ | ------------- | -------------------------------- | ------------------------------------------- |
| `DEPENDENCY_VIOLATION`       | `CRITICAL`  | topo 규칙 위반                   | 재배치(Delay) 또는 Pin 해제(수동)           |
| `RESOURCE_OVERALLOCATED`     | `MAJOR`     | 동일 exclusive 자원 중복         | 우선순위로 1개 유지 + 나머지 Delay / Swap   |
| `RESOURCE_CALENDAR_GAP`      | `MAJOR`     | 가용시간에 duration이 안 들어감  | 다음 가용 윈도우로 Delay / Swap             |
| `LOCATION_CAPACITY_CONFLICT` | `MAJOR`     | 동일 구역/선석/구간 용량 초과    | Delay / Reroute(있다면) / Split             |
| `CONSTRAINT_WINDOW_MISS`     | `CRITICAL`  | Weather/Tide/Closure 윈도우 미스 | Delay to next window / Block                |
| `DOCUMENT_PERMIT_INVALID`    | `CRITICAL`  | due_state 전 evidence 미충족     | state=BLOCKED + blocker_code=PTW_MISSING 등 |
| `CAPACITY_EXCEEDED`          | `CRITICAL`  | weight/limit 초과                | Block + 설계/방법 변경(수동)                |
| `DATA_QUALITY`               | `MAJOR`     | Weight/COG/route 등 핵심 결측    | Block + blocker_code=DATA_INCOMPLETE        |
| `CYCLE_DETECTED`             | `CRITICAL`  | dependency cycle                 | Reflow 중단, 수동 수정                      |

#### 5.3.2 해결 우선순위(결정 규칙)

충돌 그룹에서 “누가 유지되고 누가 밀리는가”를 다음 순서로 결정:

1. **안전/규정 위반 포함 충돌**은 자동 해결 금지(수동+승인 필요)
2. `lock_level=HARD` 유지(절대 이동 금지)
3. `reflow_pins(strength=HARD)` 유지
4. 그 외는 `priority` 높은 Activity 유지
5. 동점이면 **Critical Path(슬랙=0) 우선 유지**
6. 여전히 동점이면 `planned.start`가 빠른 것 유지(안정성)

#### 5.3.3 해결 액션(정확 값)

`suggested_actions[].action`은 아래 중 하나:

* `DELAY` : 대상 Activity를 `by_min` 만큼 뒤로 민다
* `SWAP_RESOURCE` : 대체 자원으로 변경한다(`to_resource_id`)
* `INSERT_WAIT` : “대기(Wait)” Activity를 자동 삽입(정책 허용 시)
* `SPLIT_ACTIVITY` : 하나의 Activity를 둘로 분할
* `MANUAL_REVIEW` : 자동 불가(승인/공학 검토 필요)

#### 5.3.4 자동 적용(옵션) 기준

* `auto_resolvable=true`인 경우에만 자동 적용 후보
* 자동 적용 허용 조건(권장):
  * `severity != CRITICAL`
  * `lock_level != HARD`
  * 증빙/규정 관련 충돌이 아님(`DOCUMENT_PERMIT_INVALID` 제외)

---

### 5.4 Plan / History / Evidence 기록 규칙 표

| 이벤트               | 자동 전환/로그                                | 저장 위치(SSOT) | UI 경고                     |
| -------------------- | --------------------------------------------- | --------------- | --------------------------- |
| `planned.*`변경    | `state_history`에 `reason_code=PLAN_EDIT` | Activity        | Approval 모드에서 Diff 표시 |
| `actual.start`입력 | `state→ACTIVE`자동                         | Activity        |                             |
| `actual.end`입력   | `state→DONE`자동                           | Activity        |                             |
| `blocker_code`설정 | `state→BLOCKED`자동                        | Activity        | Blocker 배지                |
| Evidence 업로드      | `evidence[]`추가, req 상태 갱신             | Activity        | 누락 시 빨간 카운트         |
| Evidence 승인        | `status→ACCEPTED`                          | Activity        | VERIFIED 전 필수            |
| `DONE→VERIFIED`   | 검증 조건 충족 시만 허용                      | Activity        | 누락 시 차단                |

---

## 6) 추가 아이디어(우선순위)

### P0 (즉시 가치)

1. **TR Digital Passport**
   * TR 정적 메타(Weight/COG/도면/인증서) + “현재 Activity” + Evidence 상태를 한 페이지로
2. **Approval(Read-only) View**
   * `approval_state=APPROVED` baseline 고정, Live 대비 Diff(지연/자원변경/윈도우 변경)만 표시

### P1 (운영 효율)

3. **Scenario Compare (Plan A/B/C Overlay)**
   * 동일 Trip에서 option별 `activities[].planned.*`를 겹쳐서 리스크/기간 비교
4. **Collision Triage Queue**
   * Severity/Root cause 기준으로 “오늘 해결해야 할 충돌” 우선순위 큐 제공

### P2 (현장성)

5. **Mobile Field Mode(최소 UI)**
   * “현재 Activity 1개 + Start/Pause/End + Evidence 업로드”만 제공(오프라인 캐시 포함)

---


## 1) 요약

아래는 **TR(Transformer) 이동 Activity를 SSOT(option_c.json)로 고정**하고, 날짜/의존성 변경 시 **Topological + Constraint Snap + Resource Calendar 기반 Reflow**를 강제하며, **충돌(Collision) 2클릭 이내 식별/해결**이 가능한 형태로 “운영 룰북 + 구현 계약(Contract)”를 내려쓴 것입니다.

포함 범위:

* (a)  **Activity 상태 머신** : 상태 정의 + **allowed transitions(허용 전이)** + 전이 조건(증빙/승인/락)
* (b)  **Reflow 계산 규칙** : DAG 검증 → Topological 정렬 → 제약 스냅 → 자원 캘린더 배치 → Slack/Collision 산출
* (c)  **Collision 분류/해결 정책** : 유형/심각도/우선순위/대기/자원교체/승인 에스컬레이션
* (d)  **option_c.json “정확한 키/값 계약”** :
  * `state`, `lock_level`, `blocker_code`, `evidence_required[]`, `reflow_pins[]` 등 필드까지 **정확히**
  * **Activity Type 표준 템플릿(기본 evidence/constraints/resources)**
  * **Reflow 결과(UI 노출용 Collision/Slack 계산 필드)**
  * **승인 베이스라인(baseline) 스냅샷 포맷**

---

## 2) 레이아웃

### 2.1 단일 시선(SSOT) 흐름 레이아웃 (ASCII)

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ Global Control Bar                                                                     │
│  Trip▾  TR▾  Date Cursor◄ ►  View: [Live | History | Approval]  Risk Overlay▾  Search  │
└───────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────┬───────────────────────────────────────┬───────────────┐
│ Map (Where)                   │ Timeline / Gantt (When/What)          │ Detail/Risk    │
│ - TR current location          │ - Activity rows by TR/Workstream      │ - State        │
│ - Route / segments             │ - Dependencies (FS/SS + lag)          │ - Blockers     │
│ - Status color                 │ - Constraints icons                   │ - Constraints  │
│ - Collision overlay            │ - Collision markers + slack bands     │ - Resources    │
└──────────────────────────────┴───────────────────────────────────────┴───────────────┘
┌───────────────────────────────────────────────────────────────────────────────────────┐
│ History / Evidence (Record)                                                             │
│ - Auto log timeline (state change / actual 입력 / reflow run / approval snapshot)      │
│ - Evidence attachments (photo/video/doc/sign) + “missing evidence” warnings            │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 “2클릭” 충돌 원인 식별 UX 규칙

* **클릭 1** : Gantt의 충돌 마커(🔴) 또는 Map의 충돌 오버레이 선택 → 오른쪽 Detail에 **Collision 카드** 표시
* **클릭 2** : Collision 카드의 “해결 옵션” 중 하나 선택(대기/자원교체/순서변경/제약완화 요청) → 즉시 Reflow 재실행(자동)

---

## 3) 데이터

아래는 **option_c.json에 “그대로 넣을 수 있는” 계약**입니다.
(구현 언어/DB와 무관하게 이 JSON이 **Activity 단일 진실원(SSOT)** 입니다.)

---

# 3.A 운영 룰북 (a) Activity 상태 머신

## 3.A.1 상태 정의 (Activity.state)

| state           | 의미                                                  | 운영상 허용 편집                      |
| --------------- | ----------------------------------------------------- | ------------------------------------- |
| `draft`       | 작성 중(아직 계획 확정 전)                            | 자유 편집                             |
| `planned`     | 계획에 포함(일정/자원/제약이 최소 충족)               | 일정/자원 편집 가능(락 없을 때)       |
| `ready`       | 시작 가능(필수 선행조건 충족)                         | 시작만 가능                           |
| `in_progress` | 실제 수행 중                                          | 일정 편집 제한(Actual 중심)           |
| `paused`      | 작업자 판단/현장 사정으로 일시정지                    | 재개/사유 수정                        |
| `blocked`     | 외부 조건(PTW/Weather/Certificate 등) 미충족으로 정지 | 조건 해결 전까지 시작/완료 금지       |
| `done`        | 작업 완료(Actual end 확정)                            | 증빙 검증 전까지 일부 수정 가능(정책) |
| `verified`    | 증빙/서명 검증 완료(감사 가능)                        | 원칙적으로 불변(변경은 CR 필요)       |
| `cancelled`   | 계획/진행 취소                                        | 불변(사유/증빙만 추가)                |

> “blocked vs paused” 분리 이유:
>
> * `paused`: **운영 의사결정(현장)**
> * `blocked`: **요건 미충족(시스템/규정/기상)** → 해결 전까지 자동으로 다음 작업도 “ready” 못 하게 만드는 강한 신호.

---

## 3.A.2 Allowed Transitions (허용 전이) 룰북

전이는 **항상 history log 생성**이 기본이며, 전이 시 **증빙 체크 + 잠금 체크 + 의존성 체크**가 실행됩니다.

| From → To                                        | Trigger(누가/어떻게)                        | 필수 조건(Preconditions)                                                                                                                          | 자동 동작(Auto)                                              |
| ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `draft`→`planned`                            | Engineer/Planner 수동                       | `plan.duration_min`존재,`resources.required[]`최소 1개,`constraints[]`유효                                                                  | `blocker_code`자동 평가                                    |
| `planned`→`ready`                            | 시스템 자동(권장) 또는 Ops 수동             | (1) 모든 선행 activity가 `done/verified`조건 충족 (의존성 규칙) (2) 필수 PTW/Certificate “OK” (3)`evidence_required`중 `before_start`충족 | `blocker_code=null`또는 `blockers=[]`                    |
| `ready`→`in_progress`                        | Field/Ops 수동 + Actual start 입력          | `lock_level`이 `baseline`이더라도 Actual은 입력 가능(단, Plan 변경은 별도) +`before_start`evidence 충족                                     | `actual.start_ts`자동 채움(없으면)                         |
| `in_progress`→`paused`                       | Field/Ops 수동                              | pause_reason 필수                                                                                                                                 | `history`에 pause reason 기록                              |
| `paused`→`in_progress`                       | Field/Ops 수동                              | blocker 없어야 함(있으면 `blocked`로)                                                                                                           | resume_ts 기록                                               |
| `planned/ready/in_progress/paused`→`blocked` | 시스템 자동(조건 불충족 감지) 또는 Ops 수동 | blocker 생성(PTW 만료/Weather red/Resource unavailable 등)                                                                                        | `blocker_code`세팅 + 영향 activity에 “잠재 blocked” 표시 |
| `blocked`→`ready`                            | 시스템 자동                                 | blocker 해소 + 선행조건 만족                                                                                                                      | `blocker_code=null`                                        |
| `in_progress`→`done`                         | Field/Ops 수동 + Actual end 입력            | `evidence_required`중 `before_complete`모두 충족                                                                                              | `actual.end_ts`확정                                        |
| `done`→`verified`                            | QA/Manager 수동(Approval Role)              | `evidence_required`중 `after_complete`및 서명/검증 충족                                                                                       | `lock_level`을 `baseline`로 올릴 수도 있음(정책)         |
| `planned/ready`→`cancelled`                  | Manager 수동                                | cancel_reason 필수 + (권장) 승인/서명 evidence                                                                                                    | 후속 의존성 재평가(Reflow)                                   |
| `in_progress/paused/blocked`→`cancelled`     | Manager 수동 + “중단 승인”                | 안전/규정상 중단 사유 + 증빙                                                                                                                      | 영향도 평가 기록                                             |

### 3.A.3 전이 금지(하드 룰)

* `verified`에서  **역전이 금지** (예: verified → in_progress).
  * 예외는 “감사/안전상 정정” 케이스로 **Change Request(CR) + 신규 baseline**로 처리.
* `blocked` 상태에서 `done`으로 직접 전이 금지.
* `lock_level=baseline`인 Activity의 `plan.*` 변경은  **Approval CR 없이 금지** .

---

# 3.B 운영 룰북 (b) Reflow 계산 규칙

## 3.B.1 Reflow 트리거(언제 자동 실행해야 하는가)

아래 이벤트 발생 시  **Reflow MUST 실행** :

1. `date_cursor` 변경 (Global Control Bar)
2. Activity의 `plan.start_ts`, `plan.duration_min`, `dependencies`, `constraints`, `resources` 변경
3. Resource calendar 변경(가용시간/정비/blackout)
4. Activity state가 `done/verified/cancelled`로 바뀜(후속 작업 ready 판단이 바뀜)
5. Weather window 업데이트(새로운 “green window” 생성/삭제)
6. Approval baseline 생성/승인/적용(잠금 정책 변경)

Reflow 결과는 **항상** `reflow_runs[]`에 기록되고, 각 Activity에 `calc.*`가 갱신됩니다.

---

## 3.B.2 Reflow 입력/출력

### 입력(SSOT)

* `entities.activities[*]`의 `plan.*`, `dependencies[]`, `constraints[]`, `resources.*`, `lock_level`, `reflow_pins[]`
* `catalog.resources[*].calendar`
* `catalog.constraint_rules`(weather/PTW/linkspan/barge 등)
* (선택) `policy.reflow` (우선순위, tie-break)

### 출력(SSOT에 저장)

* Activity별 `calc`:
  * ES/EF/LS/LF
  * Slack(total/free)
  * Collision 리스트/요약
  * Reflow shift(이전 대비 얼마나 밀렸는지)
* 전역 `reflow_runs[]` (감사용)

---

## 3.B.3 알고리즘(정확한 룰)

### Step 0) 정합성 검사(FAIL FAST)

1. **필수 필드 검사** : duration, dependency target 존재 여부 등
2. **의존성 DAG 검사** :

* cycle 발견 시 `collision_kind=dependency_cycle` 생성 후 **Reflow 중단(또는 부분 결과만)**

1. **락/핀 규칙 검사** :

* `lock_level=baseline`인데 plan 변경이 들어오면 `collision_kind=baseline_conflict` 생성

---

### Step 1) Topological 정렬

* 그래프 노드: activities
* 엣지: dependencies (FS/SS/FF/SF + lag_min)
* Topological order는 **결정론적(deterministic)** 이어야 함
  * tie-break: `(activity.plan.priority, activity.plan.start_ts, activity_id)` 순으로 고정 정렬

---

### Step 2) Forward pass (Earliest schedule)

각 activity를 topological 순서로 배치:

1. 후보 시작 시간 `t0` 계산
   * 모든 predecessor의 제약 반영
   * dependency 종류별 계산:
     * FS: `t0 >= pred.plan.end_ts + lag`
     * SS: `t0 >= pred.plan.start_ts + lag`
     * FF: `end >= pred.end + lag` ⇒ `start = end - duration`
     * SF: `end >= pred.start + lag` ⇒ `start = end - duration`
2. `reflow_pins`/`lock_level` 반영
   * `lock_level`:
     * `none`: 자유 이동
     * `soft`: 시스템이 이동 가능하되 “이동폭 경고” 발생 가능
     * `hard`: start/end 중 pin된 항목은 절대 이동 금지
     * `baseline`: 계획 변경 금지(approval 필요)
   * `reflow_pins`:
     * `"start"`: start_ts 고정
     * `"end"`: end_ts 고정
     * `"window"`: 특정 time window 안에서만 이동 가능
     * `"resource"`: 특정 resource 고정(교체 불가)
3. **Constraint Snap(제약 스냅)**
   * 계산된 `t0`가 제약을 위반하면  **가장 가까운 “가능 슬롯”으로 스냅** (기본은 forward snap)
   * 스냅 순서(권장, 고정):
     1. `time_window`/`permit_window` 같은 “절대 창”
     2. `weather_window`
     3. `resource_calendar`(working hours/blackout)
     4. `location_access`(접근 제한)
4. **Resource Calendar 배치(자원 충돌 방지)**
   * activity가 요구하는 resource set이 동시에 가용한 **최초 연속 구간**을 찾음
   * capacity(대수/인원/버스 수 등)를 초과하면 collision 생성 및 대안 탐색
5. 결과로 `calc.es_ts`, `calc.ef_ts`를 기록

---

### Step 3) Backward pass (Latest schedule + Slack)

* 기준 anchor는 아래 중 하나(정책으로 선택):
  * `trip.due_ts`(마감)
  * 또는 “final milestone activity”의 fixed end
* 역방향으로 LS/LF 계산(제약/캘린더가 있으므로 “이론적”이 아니라 **가능 슬롯 기반**으로 계산)
* Slack:
  * `total_float_min = (LS - ES)`
  * `free_float_min = min(successor.ES) - EF`

> 캘린더/윈도우가 있는 경우 float은 “연속 시간”이 아니라 **가용 시간(min)** 기준으로 산정합니다(운영이 이해하기 쉬움).

---

### Step 4) Collision 산출(분류 + 심각도)

* 아래 Collision Taxonomy(3.C)로 분류
* activity별 `calc.collision_ids[]`와 전역 `collisions{}` 등록
* collision이 `blocking`이면 activity는 UI에서 “🔴” 표시, 필요 시 `state=blocked`로 전환 권고(자동 전환은 정책)

---

# 3.C 운영 룰북 (c) Collision 분류/해결 정책

## 3.C.1 Collision 분류(코드 체계)

`collision.kind`는 아래 중 하나여야 합니다.

| kind                            | 의미                                           | blocking 기준(기본)       |
| ------------------------------- | ---------------------------------------------- | ------------------------- |
| `dependency_cycle`            | DAG에 사이클 존재                              | 항상 blocking             |
| `dependency_violation`        | 의존성 위반(선행 완료 전 시작 등)              | 항상 blocking             |
| `constraint_window_violation` | time/weather/permit window 밖                  | 보통 blocking             |
| `resource_overallocated`      | 동일 resource 용량 초과/중복                   | 보통 blocking             |
| `resource_unavailable`        | 캘린더상 자원 불가                             | blocking                  |
| `spatial_conflict`            | 동일 공간/구간 충돌(링크스팬/경로 세그먼트 등) | 정책                      |
| `baseline_conflict`           | 승인 베이스라인 잠금 위반                      | blocking                  |
| `data_incomplete`             | duration/resource/constraint 등 필수 누락      | blocking                  |
| `risk_hold`                   | 리스크 오버레이 규칙에 의해 hold 필요          | blocking(승인으로만 해제) |

심각도(`severity`):

* `blocking`: 수행 불가(계획/실행 모두 정지 신호)
* `major`: 수행 가능하나 심각한 지연/비용(즉시 조치 필요)
* `minor`: 경고(모니터링, 조정 권고)

---

## 3.C.2 해결 정책(우선순위/대기/자원교체)

### 기본 해결 우선순위(시스템 제안 순서)

1. **대기(Delay / Wait)** : 후행 activity를 slack 내에서 밀어 충돌 제거
2. **자원교체(Resource Swap)** : 동일 타입의 대체 자원으로 재배치(가능하면)
3. **분할(Split Activity)** : 하나의 activity를 구간 분할하여 창/자원에 맞춤
4. **순서변경(Dependency Change)** : SS/FS 변경, lag 조정(엔지니어 승인 필요)
5. **제약완화(Constraint Relax)** : weather window/permit window/working hour 완화 요청(관리자 승인 필요)
6. **베이스라인 변경(CR + Baseline Update)** : 승인 모드에서만

### 우선순위 룰(누가 밀리나)

* Trip/Activity에 `priority`(1=최우선 … 5=최하)를 둡니다.
* 충돌 시 기본 규칙:
  * 더 낮은 priority(숫자 큰 것) 활동이 먼저 밀림
  * 동일 priority면:
    1. slack이 큰 것부터 밀림
    2. 그래도 같으면 activity_id 정렬(결정론)

### 해결 액션별 권한(운영 룰)

| Action            | 권한                                   | 데이터 변경                                |
| ----------------- | -------------------------------------- | ------------------------------------------ |
| wait(일정 밀기)   | Ops                                    | plan.start_ts/plan.end_ts 변경(락 없을 때) |
| resource_swap     | Ops(soft) / Manager(hard/resource pin) | resources.assignment 변경                  |
| split_activity    | Engineer/Planner                       | activity 추가 생성 + dependency 재연결     |
| dependency_change | Engineer 승인                          | dependencies 수정                          |
| relax_constraint  | Manager 승인                           | constraint params 수정                     |
| baseline_update   | Manager + Approver                     | baselines에 신규 스냅샷 생성/적용          |

---

# 3.D option_c.json 계약 (정확한 키/값)

아래는 “키 이름/값(enum)”을 고정한 Contract입니다.

## 3.D.1 Top-level 구조

```json
{
  "schema": {
    "name": "tr_movement_ssot",
    "version": "0.8.0",
    "scenario_id": "option_c",
    "timezone": "Asia/Dubai"
  },
  "policy": {
    "view_modes": ["live", "history", "approval"],
    "reflow": {
      "snap_direction": "forward",
      "tie_break": ["priority", "plan.start_ts", "activity_id"],
      "calendar_granularity_min": 5
    }
  },
  "catalog": {
    "enums": {
      "activity_state": ["draft", "planned", "ready", "in_progress", "paused", "blocked", "done", "verified", "cancelled"],
      "lock_level": ["none", "soft", "hard", "baseline"],
      "dependency_type": ["FS", "SS", "FF", "SF"],
      "evidence_stage": ["before_start", "before_complete", "after_complete"],
      "collision_severity": ["minor", "major", "blocking"],
      "collision_kind": [
        "dependency_cycle",
        "dependency_violation",
        "constraint_window_violation",
        "resource_overallocated",
        "resource_unavailable",
        "spatial_conflict",
        "baseline_conflict",
        "data_incomplete",
        "risk_hold"
      ]
    },

    "blocker_codes": {
      "NONE": {"severity": "minor", "label": "No blocker"},
      "PTW_MISSING": {"severity": "blocking", "label": "PTW missing"},
      "PTW_EXPIRED": {"severity": "blocking", "label": "PTW expired"},
      "CERT_MISSING": {"severity": "blocking", "label": "Certificate missing"},
      "CERT_EXPIRED": {"severity": "blocking", "label": "Certificate expired"},
      "WX_RED": {"severity": "blocking", "label": "Weather red window"},
      "RESOURCE_UNAVAILABLE": {"severity": "blocking", "label": "Resource unavailable"},
      "DEPENDENCY_DELAY": {"severity": "major", "label": "Dependency delayed"},
      "RISK_HOLD": {"severity": "blocking", "label": "Risk hold"}
    },

    "evidence_types": {
      "PHOTO": {"label": "Photo"},
      "VIDEO": {"label": "Video"},
      "DOC_PDF": {"label": "Document(PDF)"},
      "SIGN_OFF": {"label": "Sign-off"},
      "GPS_TRACK": {"label": "GPS track"},
      "SENSOR_LOG": {"label": "Sensor log"}
    },

    "activity_types": {
      "ROUTE_SURVEY": {
        "label": "Route survey",
        "default_duration_min": 240,
        "default_priority": 2,
        "default_resources": [
          {"resource_type": "ENGINEERING_TEAM", "qty": 1, "must_be_continuous": true}
        ],
        "default_constraints": [
          {"kind": "working_hours", "params": {"start_hhmm": "08:00", "end_hhmm": "18:00"}},
          {"kind": "location_access", "params": {"access_ref": "ROUTE_ACCESS"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "DOC_PDF", "stage": "after_complete", "min_count": 1, "label": "Survey report"},
          {"evidence_type": "PHOTO", "stage": "after_complete", "min_count": 5, "label": "Route photos"}
        ]
      },

      "PTW_ISSUE": {
        "label": "PTW issuance",
        "default_duration_min": 60,
        "default_priority": 1,
        "default_resources": [
          {"resource_type": "HSE_OFFICER", "qty": 1, "must_be_continuous": true}
        ],
        "default_constraints": [
          {"kind": "working_hours", "params": {"start_hhmm": "07:00", "end_hhmm": "19:00"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "DOC_PDF", "stage": "before_start", "min_count": 1, "label": "Approved PTW PDF"}
        ]
      },

      "SPMT_MOBILIZE": {
        "label": "SPMT mobilization",
        "default_duration_min": 180,
        "default_priority": 1,
        "default_resources": [
          {"resource_type": "SPMT", "qty": 1, "must_be_continuous": true},
          {"resource_type": "SPMT_OPERATOR_TEAM", "qty": 1, "must_be_continuous": true}
        ],
        "default_constraints": [
          {"kind": "permit_required", "params": {"permit_ref": "PTW"}},
          {"kind": "working_hours", "params": {"start_hhmm": "06:00", "end_hhmm": "22:00"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "PHOTO", "stage": "before_start", "min_count": 2, "label": "SPMT readiness photos"}
        ]
      },

      "LOADOUT_TO_SPMT": {
        "label": "Loadout (TR to SPMT)",
        "default_duration_min": 300,
        "default_priority": 1,
        "default_resources": [
          {"resource_type": "SPMT", "qty": 1, "must_be_continuous": true},
          {"resource_type": "RIGGING_TEAM", "qty": 1, "must_be_continuous": true},
          {"resource_type": "HSE_OFFICER", "qty": 1, "must_be_continuous": false}
        ],
        "default_constraints": [
          {"kind": "permit_required", "params": {"permit_ref": "PTW"}},
          {"kind": "weather_rule", "params": {"rule_ref": "WX_GREEN"}},
          {"kind": "location_access", "params": {"access_ref": "YARD_ACCESS"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "SIGN_OFF", "stage": "before_start", "min_count": 1, "label": "Lift plan sign-off"},
          {"evidence_type": "PHOTO", "stage": "after_complete", "min_count": 3, "label": "Loadout completion photos"}
        ]
      },

      "TRANSPORT_ON_SPMT": {
        "label": "Transport on SPMT",
        "default_duration_min": 480,
        "default_priority": 1,
        "default_resources": [
          {"resource_type": "SPMT", "qty": 1, "must_be_continuous": true},
          {"resource_type": "ESCORT_TEAM", "qty": 1, "must_be_continuous": true}
        ],
        "default_constraints": [
          {"kind": "weather_rule", "params": {"rule_ref": "WX_GREEN"}},
          {"kind": "route_capacity", "params": {"capacity_ref": "ROUTE_CAPACITY"}},
          {"kind": "working_hours", "params": {"start_hhmm": "00:00", "end_hhmm": "23:59"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "GPS_TRACK", "stage": "after_complete", "min_count": 1, "label": "GPS track file"}
        ]
      },

      "LINKSPAN_CROSS": {
        "label": "Linkspan crossing",
        "default_duration_min": 90,
        "default_priority": 1,
        "default_resources": [
          {"resource_type": "LINKSPAN", "qty": 1, "must_be_continuous": true},
          {"resource_type": "SPMT", "qty": 1, "must_be_continuous": true}
        ],
        "default_constraints": [
          {"kind": "time_window_ref", "params": {"window_ref": "LINKSPAN_WINDOW"}},
          {"kind": "capacity_limit", "params": {"limit_ref": "LINKSPAN_LIMIT"}},
          {"kind": "weather_rule", "params": {"rule_ref": "WX_GREEN"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "VIDEO", "stage": "after_complete", "min_count": 1, "label": "Crossing video"}
        ]
      },

      "OFFLOAD_POSITION": {
        "label": "Offload & positioning",
        "default_duration_min": 240,
        "default_priority": 1,
        "default_resources": [
          {"resource_type": "SPMT", "qty": 1, "must_be_continuous": true},
          {"resource_type": "RIGGING_TEAM", "qty": 1, "must_be_continuous": true}
        ],
        "default_constraints": [
          {"kind": "permit_required", "params": {"permit_ref": "PTW"}},
          {"kind": "weather_rule", "params": {"rule_ref": "WX_GREEN"}},
          {"kind": "location_access", "params": {"access_ref": "SITE_ACCESS"}}
        ],
        "default_evidence_required": [
          {"evidence_type": "PHOTO", "stage": "after_complete", "min_count": 3, "label": "Offload photos"},
          {"evidence_type": "SIGN_OFF", "stage": "after_complete", "min_count": 1, "label": "Site acceptance sign-off"}
        ]
      }
    },

    "constraint_rules": {
      "WX_GREEN": {
        "label": "Weather green",
        "wind_max_mps": 10.0,
        "wave_max_m": 0.5,
        "rain_max_mmph": 5.0
      }
    },

    "resources": {
      "SPMT_01": {
        "resource_id": "SPMT_01",
        "resource_type": "SPMT",
        "label": "SPMT #01",
        "capacity": {"qty": 1},
        "calendar": {
          "timezone": "Asia/Dubai",
          "weekly": [
            {"dow": 1, "start_hhmm": "00:00", "end_hhmm": "23:59"},
            {"dow": 2, "start_hhmm": "00:00", "end_hhmm": "23:59"},
            {"dow": 3, "start_hhmm": "00:00", "end_hhmm": "23:59"},
            {"dow": 4, "start_hhmm": "00:00", "end_hhmm": "23:59"},
            {"dow": 5, "start_hhmm": "00:00", "end_hhmm": "23:59"},
            {"dow": 6, "start_hhmm": "00:00", "end_hhmm": "23:59"},
            {"dow": 7, "start_hhmm": "00:00", "end_hhmm": "23:59"}
          ],
          "blackouts": [
            {"start_ts": "2026-02-03T08:00:00+04:00", "end_ts": "2026-02-03T14:00:00+04:00", "reason": "Maintenance"}
          ]
        }
      }
    }
  },

  "entities": {
    "trips": {
      "TRIP_2026_02_A": {
        "trip_id": "TRIP_2026_02_A",
        "label": "Trip Feb A",
        "timezone": "Asia/Dubai",
        "date_cursor_ts": "2026-02-01T00:00:00+04:00",
        "due_ts": "2026-02-07T18:00:00+04:00",
        "tr_ids": ["TR_001"],
        "view_mode": "live"
      }
    },

    "trs": {
      "TR_001": {
        "tr_id": "TR_001",
        "trip_id": "TRIP_2026_02_A",
        "label": "Transformer #001",
        "weight_t": 210.5,
        "cog_mm": {"x": 0, "y": 0, "z": 2200},
        "dims_mm": {"l": 8200, "w": 3200, "h": 4100},
        "movement_class": "HEAVY",
        "linkspan_limit_ref": "LINKSPAN_LIMIT",
        "barge_limit_ref": "BARGE_LIMIT",
        "certificate_refs": ["CERT_LIFT_PLAN", "CERT_SPMT_INSPECTION"]
      }
    },

    "activities": {
      "A100": {
        "activity_id": "A100",
        "trip_id": "TRIP_2026_02_A",
        "tr_id": "TR_001",
        "type": "PTW_ISSUE",
        "title": "PTW issuance",
        "state": "planned",

        "lock_level": "none",
        "reflow_pins": [],

        "blocker_code": "NONE",
        "blockers": [],

        "location": {
          "site_id": "YARD",
          "geo": {"lat": 25.2048, "lon": 55.2708}
        },

        "plan": {
          "start_ts": "2026-02-01T07:00:00+04:00",
          "duration_min": 60,
          "end_ts": "2026-02-01T08:00:00+04:00",
          "priority": 1
        },

        "actual": {
          "start_ts": null,
          "end_ts": null,
          "progress_pct": 0
        },

        "dependencies": [],

        "constraints": [
          {"kind": "working_hours", "params": {"start_hhmm": "07:00", "end_hhmm": "19:00"}}
        ],

        "resources": {
          "required": [
            {"resource_type": "HSE_OFFICER", "qty": 1, "must_be_continuous": true}
          ],
          "assigned": []
        },

        "evidence_required": [
          {"evidence_type": "DOC_PDF", "stage": "before_start", "min_count": 1, "label": "Approved PTW PDF"}
        ],
        "evidence": [],

        "calc": {
          "es_ts": null,
          "ef_ts": null,
          "ls_ts": null,
          "lf_ts": null,
          "total_float_min": null,
          "free_float_min": null,
          "is_critical_path": null,

          "reflow_shift_min": 0,
          "collision_ids": [],
          "collision_count": 0,
          "slack_bucket": "unknown"
        }
      },

      "A200": {
        "activity_id": "A200",
        "trip_id": "TRIP_2026_02_A",
        "tr_id": "TR_001",
        "type": "SPMT_MOBILIZE",
        "title": "SPMT mobilization",
        "state": "planned",

        "lock_level": "soft",
        "reflow_pins": ["window"],

        "blocker_code": "PTW_MISSING",
        "blockers": [
          {"code": "PTW_MISSING", "severity": "blocking", "owner_role": "HSE", "note": "PTW not attached"}
        ],

        "location": {
          "site_id": "YARD",
          "geo": {"lat": 25.2048, "lon": 55.2708}
        },

        "plan": {
          "start_ts": "2026-02-01T08:30:00+04:00",
          "duration_min": 180,
          "end_ts": "2026-02-01T11:30:00+04:00",
          "priority": 1
        },

        "actual": {"start_ts": null, "end_ts": null, "progress_pct": 0},

        "dependencies": [
          {"type": "FS", "from_activity_id": "A100", "lag_min": 0}
        ],

        "constraints": [
          {"kind": "permit_required", "params": {"permit_ref": "PTW"}},
          {"kind": "working_hours", "params": {"start_hhmm": "06:00", "end_hhmm": "22:00"}}
        ],

        "resources": {
          "required": [
            {"resource_type": "SPMT", "qty": 1, "must_be_continuous": true},
            {"resource_type": "SPMT_OPERATOR_TEAM", "qty": 1, "must_be_continuous": true}
          ],
          "assigned": [
            {"resource_id": "SPMT_01", "resource_type": "SPMT", "qty": 1}
          ]
        },

        "evidence_required": [
          {"evidence_type": "PHOTO", "stage": "before_start", "min_count": 2, "label": "SPMT readiness photos"}
        ],
        "evidence": [],

        "calc": {
          "es_ts": null, "ef_ts": null, "ls_ts": null, "lf_ts": null,
          "total_float_min": null, "free_float_min": null, "is_critical_path": null,
          "reflow_shift_min": 0,
          "collision_ids": [],
          "collision_count": 0,
          "slack_bucket": "unknown"
        }
      }
    }
  },

  "collisions": {},

  "reflow_runs": [],

  "baselines": {
    "current_baseline_id": null,
    "items": {}
  },

  "history_events": []
}
```

---

## 3.D.2 Activity 필드 스키마(핵심: 요청한 키 포함)

Activity는 **반드시** 아래 키를 가져야 합니다(SSOT):

* 식별/연결:
  * `activity_id`, `trip_id`, `tr_id`, `type`, `title`
* 상태/통제:
  * `state` (enum)
  * `lock_level` (enum)
  * `reflow_pins` (string[])
  * `blocker_code` (catalog.blocker_codes key)
  * `blockers` (상세 목록)
* 계획/실적:
  * `plan.start_ts`, `plan.duration_min`, `plan.end_ts`, `plan.priority`
  * `actual.start_ts`, `actual.end_ts`, `actual.progress_pct`
* 의존/제약/자원:
  * `dependencies[]` (FS/SS/FF/SF + lag)
  * `constraints[]` (kind + params)
  * `resources.required[]`, `resources.assigned[]`
* 증빙:
  * `evidence_required[]` (stage/min_count/type/label)
  * `evidence[]` (실제 첨부)
* 계산(=UI 노출 필드):
  * `calc.es_ts/ef_ts/ls_ts/lf_ts`
  * `calc.total_float_min/free_float_min`
  * `calc.collision_ids/collision_count`
  * `calc.reflow_shift_min`
  * `calc.slack_bucket`
  * `calc.is_critical_path`

---

# 3.E 승인 베이스라인(baseline) 스냅샷 포맷 (option_c.json 포함)

## 3.E.1 baseline 구조(Contract)

```json
{
  "baselines": {
    "current_baseline_id": "BL_2026_02_01_001",
    "items": {
      "BL_2026_02_01_001": {
        "baseline_id": "BL_2026_02_01_001",
        "trip_id": "TRIP_2026_02_A",
        "label": "Approval baseline #1",
        "status": "approved",
        "created_at_ts": "2026-02-01T12:00:00+04:00",
        "created_by": {"role": "PLANNER", "user_id": "u123"},
        "approved_at_ts": "2026-02-01T13:00:00+04:00",
        "approvers": [
          {"role": "MANAGER", "user_id": "m001", "decision": "approve", "decided_at_ts": "2026-02-01T13:00:00+04:00"}
        ],

        "freeze_policy": {
          "lock_level_on_apply": "baseline",
          "frozen_fields": [
            "plan.start_ts",
            "plan.end_ts",
            "plan.duration_min",
            "dependencies",
            "constraints",
            "resources.assigned"
          ]
        },

        "snapshot": {
          "trs": {
            "TR_001": {
              "weight_t": 210.5,
              "cog_mm": {"x": 0, "y": 0, "z": 2200},
              "certificate_refs": ["CERT_LIFT_PLAN", "CERT_SPMT_INSPECTION"]
            }
          },
          "activities": {
            "A100": {
              "type": "PTW_ISSUE",
              "plan": {"start_ts": "2026-02-01T07:00:00+04:00", "end_ts": "2026-02-01T08:00:00+04:00", "duration_min": 60},
              "resources": {"assigned": []},
              "constraints": [{"kind": "working_hours", "params": {"start_hhmm": "07:00", "end_hhmm": "19:00"}}]
            },
            "A200": {
              "type": "SPMT_MOBILIZE",
              "plan": {"start_ts": "2026-02-01T08:30:00+04:00", "end_ts": "2026-02-01T11:30:00+04:00", "duration_min": 180},
              "resources": {"assigned": [{"resource_id": "SPMT_01", "resource_type": "SPMT", "qty": 1}]},
              "constraints": [{"kind": "permit_required", "params": {"permit_ref": "PTW"}}]
            }
          }
        },

        "snapshot_hash_sha256": "TODO_SHA256"
      }
    }
  }
}
```

## 3.E.2 Approval(Read-only) 모드 규칙

* UI가 `view_mode=approval`일 때:
  * **Plan 편집 버튼 비활성**
  * baseline의 `freeze_policy.frozen_fields`에 해당하는 현재 Activity 필드 변경 시도는 **항상 collision(baseline_conflict)** 로 처리
  * 변경이 필요하면 “Change Request”를 별도 이벤트로 남기고 **신규 baseline 생성 흐름**으로만 진행

---

## 3.F Collision/Slack UI 노출 필드(계산 결과 계약)

### 3.F.1 Activity.calc (필드 의미)

| 필드                 | 의미                    | UI 사용               |
| -------------------- | ----------------------- | --------------------- |
| `es_ts/ef_ts`      | Earliest Start/Finish   | 기본 바(예상)         |
| `ls_ts/lf_ts`      | Latest Start/Finish     | slack band(여유 구간) |
| `total_float_min`  | 총 여유(분)             | “지연 허용치”       |
| `free_float_min`   | 자유 여유(분)           | 후속 영향 여부        |
| `is_critical_path` | CP 여부                 | 빨간 테두리 등        |
| `reflow_shift_min` | 직전 reflow 대비 이동량 | “이번 변경 영향”    |
| `collision_ids[]`  | 관련 충돌 ID            | 2클릭 접근            |
| `collision_count`  | 충돌 개수               | 뱃지                  |
| `slack_bucket`     | `none/low/ok/unknown` | 색/아이콘 간소화      |

### 3.F.2 collisions 전역 레지스트리(권장)

```json
{
  "collisions": {
    "C001": {
      "collision_id": "C001",
      "kind": "resource_overallocated",
      "severity": "blocking",
      "message": "SPMT_01 is double-booked",
      "time_range": {
        "start_ts": "2026-02-01T10:00:00+04:00",
        "end_ts": "2026-02-01T12:00:00+04:00"
      },
      "resource_ids": ["SPMT_01"],
      "activity_ids": ["A200", "A250"],
      "suggested_actions": [
        {"action": "wait", "target_activity_id": "A250", "delta_min": 120},
        {"action": "resource_swap", "target_activity_id": "A250", "candidate_resource_ids": ["SPMT_02"]},
        {"action": "split_activity", "target_activity_id": "A250", "note": "split by segment"}
      ]
    }
  }
}
```

---

## 3.G History/Evidence 기록 규칙(SSOT 반영)

### 3.G.1 Plan ↔ Actual 자동 전환 규칙(테이블)

| 이벤트                  | 규칙                                                                                        | 결과                             |
| ----------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `actual.start_ts`입력 | 해당 Activity `state`가 `ready/planned`면 `in_progress`로 전환                        | history log 생성                 |
| `actual.end_ts`입력   | `state=in_progress/paused/blocked`면 `done`전환(단, before_complete evidence 충족 필수) | history log 생성                 |
| evidence 업로드         | stage 조건 만족 여부 재평가                                                                 | blocker 해제/유지                |
| date_cursor 변경        | Reflow MUST                                                                                 | reflow_runs 기록                 |
| baseline 승인           | freeze_policy 적용                                                                          | lock_level=baseline로 승격(정책) |

### 3.G.2 History log 자동 생성 트리거(권장 최소)

`history_events[]`에 반드시 남기는 이벤트:

* `ACTIVITY_STATE_CHANGED`
* `ACTUAL_TIME_UPDATED`
* `EVIDENCE_ADDED`
* `REFLOW_RUN_COMPLETED`
* `COLLISION_CREATED/RESOLVED`
* `BASELINE_CREATED/APPROVED/APPLIED`

이벤트 포맷(예시):

```json
{
  "event_id": "E0001",
  "ts": "2026-02-01T08:31:00+04:00",
  "kind": "ACTIVITY_STATE_CHANGED",
  "trip_id": "TRIP_2026_02_A",
  "tr_id": "TR_001",
  "activity_id": "A200",
  "actor": {"role": "OPS", "user_id": "ops01"},
  "before": {"state": "planned"},
  "after": {"state": "blocked"},
  "note": "PTW missing"
}
```

### 3.G.3 Evidence 미존재 경고 규칙

* `evidence_required[]`에서 `min_count` 충족 실패 시:
  * 해당 stage에서 전이 금지(예: before_start 미충족이면 ready→in_progress 금지)
  * UI: Detail/Evidence 탭에 **“Missing Evidence” 경고(🔶/🔴)** 표시
  * `blocker_code`를 `PTW_MISSING` 등으로 자동 세팅 가능(정책)

---

## 4) 시각화

### 4.1 Map 규칙(Where)

* TR 상태 색상(권장):
  * `in_progress`: 파랑
  * `ready`: 초록
  * `blocked`: 빨강
  * `paused`: 주황
  * `done/verified`: 회색
* 경로(segments):
  * 정상: 실선
  * 제약 구간(링크스팬/바지/협소 구간): 점선 + 아이콘(⚓/⛴️/🚧)
* 충돌 오버레이:
  * `spatial_conflict`: 지도 위 “시간 슬라이스” 표시(해당 시간대에 겹치는 점/구간 강조)

### 4.2 Gantt 규칙(When/What)

* Row = Activity, 그룹은 TR 기준(접기/펴기)
* 의존성 표현:
  * FS/SS/FF/SF 선 + lag 표시
* 제약 아이콘(예시):
  * Weather: ☁️
  * PTW/Certificate: 📄
  * Linkspan/Barge: ⚓/⛴️
  * Hard lock/baseline: 🔒
* Slack band:
  * ES~LS를 연한 밴드로 표시
  * `total_float_min=0`이면 critical 강조

### 4.3 Map ↔ Timeline 상호 하이라이트

* Map에서 TR 클릭 → 해당 TR의 Activity rows 자동 스크롤/하이라이트
* Timeline에서 Activity 클릭 → 지도에서 해당 Activity의 위치/구간/자원(링크스팬 등) 하이라이트
* 날짜 커서 변경 → Reflow 실행 후 변화량(reflow_shift_min) 큰 Activity부터 “변경 요약” 토스트/패널 제공

---

## 5) 기록

* **Live 모드** : `state`, `actual.*`, 최신 `calc.*`, 최신 `collisions` 중심
* **History 모드** : `history_events` 타임라인 + `reflow_runs` 재생(“그 시점에 왜 밀렸나” 감사 대응)
* **Approval 모드** : `baselines.current_baseline_id`의 스냅샷 대비 현재 Plan/Actual 차이만 표시(편집 불가)

---

## 6) 추가 아이디어 (우선순위)

### P0 (바로 가치/리스크 감소)

1. **TR Digital Passport** : TR별 “증빙/인증서/리프트플랜/검사”를 TR 카드로 집약(만료/미첨부 경고)
2. **Scenario Compare(A/B/C Overlay)** : option_a/b/c의 `calc.slack_bucket`, `collision_count`를 한 화면에 비교

### P1 (운영 효율)

3. **Approval(Read-only) View 고정 링크** : 공유 가능한 read-only URL(리포트/감사)
4. **Mobile Field Mode(최소 UI)** : “다음 3개 Activity + 증빙 업로드 + start/stop”만 제공

### P2 (고도화)

5. **Collision Auto-Playbook** : 충돌 kind별로 “추천 해결”을 템플릿화(대기/자원교체/분할의 우선순위 자동 제안)
6. **Evidence OCR/자동 분류** : 업로드된 문서/사진을 evidence_type에 자동 태깅(단, 승인 전 human check 유지)

---

원하면, 위 계약을 기준으로  **(1) activity_types를 귀사 실제 작업분류로 1:1 매핑** , (2) `constraint_rules`(WX/LINKSPAN/BARGE/PTW) 파라미터를 운영 기준치로 구체화(수치/창)까지 내려서 **완전한 option_c.json 샘플(여러 TR/여러 trip 포함)** 형태로 확장해 드릴 수 있습니다.

---

## Refs

- [AGENTS.md](AGENTS.md)
- [docs/LAYOUT.md](docs/LAYOUT.md)
- [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)
- [docs/WORK_LOG_20260202.md](docs/WORK_LOG_20260202.md), [docs/BUGFIX_APPLIED_20260202.md](docs/BUGFIX_APPLIED_20260202.md) — 최신 작업 반영 (Phase 6 #1~5,#7, Phase 7/10/11)
