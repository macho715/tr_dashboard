## 1) 요약

Contract v0.8.0의 핵심은 **“Activity가 유일한 SSOT”**가 되도록 `option_c.json`을 **권위 분리(Plan/Actual/Calc)**, **Reflow/Collision 영속 레지스트리**, **Baseline/Approval(Freeze)**, **상태 머신 + Evidence Gate**까지 “바로 구현 가능한 계약(Contract)”으로 고정하는 것입니다.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

이번 답변은 아래를 포함합니다.

* **단일 화면 레이아웃(SSOT 관점)**: Map · Timeline(Gantt) · Detail(Risk/State) · History/Evidence + Global Control Bar
* **option_c.json Contract v0.8.0**

  * `entities.activities` 중심 설계 (Trip/TR은 참조만)
  * Activity 필드: `state`, `lock_level`, `blocker_code`, `evidence_required[]`, `reflow_pins[]`, `plan/actual/calc`
  * `activity_types`(표준 템플릿), `constraint_rules`(WX/LINKSPAN/BARGE/PTW 수치 포함)
  * `collisions` 레지스트리, `reflow_runs[]`, `baselines{}`(승인 스냅샷 포맷), `history_events[]`
* **운영 룰북 형태 구체화**

  * (a) Activity 상태 머신(allowed transitions + gate)
  * (b) Reflow 규칙(Topological + Constraint Snap + Resource Calendar)
  * (c) Collision 분류/해결 정책(우선순위/대기/자원교체)
* **여러 TR/여러 Trip 포함한 완전한 샘플 option_c.json** (즉시 구현/검증용)

---

## 2) 레이아웃

### 2.1 단일 시선 흐름(SSOT) 레이아웃(ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Global Control Bar                                                          │
│ Trip/TR: [Trip ▼] [TR ▼]   Date Cursor: [2026-02-04 10:00 +04]  View: Live/History/Approval │
│ Reflow: [Preview] [Apply]   Risk Overlay: [None/All/WX/Resource/Permit]      │
│ Filters: [State] [Collision] [Resource] [Route Segment]   Search [____]     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬───────────────────────────────────────────────┐
│ Map (Where)                   │ Timeline/Gantt (When/What)                   │
│ - TR position (live/plan)     │ - Rows: TR → Activities                       │
│ - Route segments              │ - Dependencies (FS/SS/FF/SF)                  │
│ - Risk overlay (WX/permit)    │ - Constraints icons + collision badges        │
│ - Click TR/segment → highlight│ - Drag date cursor / activity → Reflow preview│
└──────────────────────────────┴───────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Detail / Inspector (State/Risk) + Collision Tray                             │
│ Selected: Activity A1120 (road_move)                                         │
│ - State: ready  Lock: hard  Blocker: none                                    │
│ - Plan vs Actual vs Calc (slack, critical path, predicted end)               │
│ - Resources (assigned/alt pools)                                             │
│ - Constraints evaluation (WX/LINKSPAN/BARGE/PTW)                              │
│ - Collisions: COL_001 (blocking) → suggested actions                          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ History / Evidence (Evidence)                                                │
│ - History events timeline (auto)                                              │
│ - Evidence required checklist + attachments (photo/video/doc)                 │
│ - Missing evidence warnings + gate reason                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 인터랙션(요약)

* **Map ↔ Timeline 상호 하이라이트**:

  * Map에서 TR/route segment 클릭 → Gantt에서 해당 TR/activity row 강조
  * Gantt activity 클릭 → Map에서 해당 activity의 공간 범위(From/To/Route) 강조
* **Date Cursor 변경 → Reflow Preview 자동 갱신(필수)**

  * Cursor를 “새 기준 시간”으로 두고, 의존성/자원/제약 기반으로 **Preview Run 생성**
* **Live / History / Approval 모드 분리**

  * Live: plan/actual/calc 동시
  * History: reflow_runs / history_events / baseline 스냅샷 탐색
  * Approval: baseline_id 고정 + frozen_fields에 대한 편집 차단(읽기 전용)

---

## 3) 데이터

아래는 **option_c.json Contract v0.8.0**의 “키/값 수준” 계약입니다.

### 3.1 전역 규칙(Contract Rules)

#### ID 규칙

* 모든 엔티티는 string ID
* 추천 프리픽스:

  * Trip: `TRIP_...`
  * TR: `TR_...`
  * Activity: `A...`
  * Collision: `COL_...`
  * Reflow Run: `RUN_...`
  * Baseline: `BASELINE_...`
  * Evidence: `EVI_...`

#### 시간 규칙

* `*_ts`는 **ISO 8601 + TZ offset 필수**
  예: `"2026-02-04T10:00:00+04:00"`
* duration은 정밀도/리플로우 안정성을 위해:

  * `duration_min`: **int minutes**
* timezone SSOT:

  * `contract.timezone`에 명시(예: `"Asia/Dubai"`)

#### SSOT 규칙(강제)

* **권위 원본**

  * 계획: `entities.activities[...].plan`
  * 실제: `entities.activities[...].actual`
* **파생(읽기전용)**

  * `entities.activities[...].calc` (UI/리포트 편의용 캐시, 언제든 재생성 가능)
* Trip/TR은 Activity를 “소유”하지 않고 **참조만**

  * Trip/TR 내 스케줄 필드 금지(= 이중 SSOT 금지)

---

### 3.2 핵심 Enum(정확한 값)

#### Activity State (`state`)

* `"draft"`: 초안(타입/리소스/제약 미완)
* `"planned"`: 계획 확정(시간 존재)
* `"ready"`: 시작 준비 완료(필수 gate 충족)
* `"in_progress"`: 진행중(실제 시작 입력됨)
* `"paused"`: 일시중지(운영자가 의도적으로 멈춤)
* `"blocked"`: 진행 불가(명시적 blocker 존재)
* `"completed"`: 완료(실제 종료 입력됨)
* `"canceled"`: 시작 전 취소
* `"aborted"`: 시작 후 중단(사고/중대 리스크 등)

#### Lock Level (`lock_level`)

* `"none"`: 자유(리플로우 이동 가능)
* `"soft"`: 가급적 유지(리플로우가 이동은 가능하나 페널티 부여)
* `"hard"`: 고정(리플로우가 이동 금지)
* `"baseline"`: 승인 동결(Approval 모드에서 편집 금지)

#### Dependency Type

* `"fs"`: Finish→Start
* `"ss"`: Start→Start
* `"ff"`: Finish→Finish
* `"sf"`: Start→Finish (드문 케이스지만 계약에 포함)

#### Constraint Hardness (`hardness`)

* `"hard"`: 위반 시 blocking collision
* `"soft"`: 위반 시 warning collision (가능하면 만족하도록 스냅)

#### Evidence Stage (`stage`)

* `"before_ready"`: ready 진입 전
* `"before_start"`: in_progress 진입 전
* `"during"`: 진행 중 주기적으로
* `"after_end"`: completed 진입 전/후

#### Collision Severity

* `"info" | "warning" | "blocking"`

---

### 3.3 Activity(SSOT) 스키마(필수 키/값)

아래 경로들은 **option_c.json에서 “실제 존재해야 하는 키”**입니다.

#### `entities.activities.{activity_id}`

| Key                 | Type          | Required | Notes                         |
| ------------------- | ------------- | -------: | ----------------------------- |
| `activity_id`       | string        |        ✅ | 객체 key와 동일 권장                 |
| `type_id`           | string        |        ✅ | `activity_types.{type_id}` 참조 |
| `trip_id`           | string        |        ✅ | `entities.trips` 참조           |
| `tr_ids`            | string[]      |        ✅ | TR 단위/공유 활동 모두 지원(공유=복수)      |
| `title`             | string        |        ✅ | UI 표시                         |
| `state`             | enum          |        ✅ | 위 enum                        |
| `lock_level`        | enum          |        ✅ | 위 enum                        |
| `blocker_code`      | string | null |        ✅ | `blocked`면 non-null 권장        |
| `blocker_detail`    | object        |        ⭕ | 운영자가 읽을 상세(원인/owner/ETA)      |
| `evidence_required` | array         |        ✅ | gate 정의(템플릿+오버라이드)            |
| `evidence_ids`      | string[]      |        ✅ | 실제 첨부 증빙 참조                   |
| `reflow_pins`       | array         |        ✅ | 리플로우 고정점(시간/자원/필드)            |
| `plan`              | object        |        ✅ | 권위 있는 계획                      |
| `actual`            | object        |        ✅ | 권위 있는 실제                      |
| `calc`              | object        |        ✅ | 파생(읽기전용)                      |

#### Activity.plan

| Key             | Type                 | Required | Notes                   |
| --------------- | -------------------- | -------: | ----------------------- |
| `start_ts`      | string | null        |        ✅ | 계획 시작                   |
| `end_ts`        | string | null        |        ✅ | 계획 종료                   |
| `duration_min`  | int | null           |        ✅ | `end_ts`가 없을 때 필수       |
| `duration_mode` | `"elapsed"`|`"work"` |        ✅ | work=근무시간 캘린더 반영        |
| `location`      | object               |        ✅ | from/to/route           |
| `dependencies`  | array                |        ✅ | 선행 활동                   |
| `resources`     | array                |        ✅ | 요구 자원(풀/고정 지정)          |
| `constraints`   | array                |        ✅ | WX/LINKSPAN/BARGE/PTW 등 |
| `notes`         | string               |        ✅ | 운영 메모                   |

`plan.location` 최소:

* `from_location_id` (string)
* `to_location_id` (string)
* `route_id` (string|null)
* `geo_fence_ids` (string[])

#### Activity.actual

| Key                    | Type          | Required | Notes        |
| ---------------------- | ------------- | -------: | ------------ |
| `start_ts`             | string | null |        ✅ | 실제 시작        |
| `end_ts`               | string | null |        ✅ | 실제 종료        |
| `progress_pct`         | int           |        ✅ | 0~100        |
| `location_override`    | object | null |        ✅ | 실제 경로/위치 차이  |
| `resource_assignments` | array         |        ✅ | 실제 투입 자원(확정) |
| `notes`                | string        |        ✅ | 현장 메모        |

#### Activity.calc (UI 노출용 핵심)

| Key                      | Type          | Required | Notes                 |
| ------------------------ | ------------- | -------: | --------------------- |
| `es_ts` / `ef_ts`        | string | null |        ✅ | earliest start/finish |
| `ls_ts` / `lf_ts`        | string | null |        ✅ | latest start/finish   |
| `slack_min`              | int | null    |        ✅ | **UI Slack 표시 필드**    |
| `critical_path`          | bool          |        ✅ | **UI 강조**             |
| `collision_ids`          | string[]      |        ✅ | **2-click 원인 파악**     |
| `collision_severity_max` | enum|null     |        ✅ | info/warning/blocking |
| `risk_score`             | number        |        ✅ | 0~1                   |
| `predicted_end_ts`       | string|null   |        ✅ | 지연 예측                 |
| `reflow`                 | object        |        ✅ | 마지막 preview/apply 추적  |

---

### 3.4 evidence_required[] 스키마(정확한 키)

`entities.activities.{id}.evidence_required[]` 항목:

| Key             | Type         | Required | Example               |
| --------------- | ------------ | -------: | --------------------- |
| `evidence_type` | enum(string) |        ✅ | `"ptw_approval"`      |
| `stage`         | enum         |        ✅ | `"before_start"`      |
| `min_count`     | int          |        ✅ | `1`                   |
| `required`      | bool         |        ✅ | `true`                |
| `validity_min`  | int | null   |        ✅ | `1440` (24h)          |
| `tags`          | string[]     |        ✅ | `["permit","safety"]` |

---

### 3.5 reflow_pins[] 스키마(정확한 키)

`entities.activities.{id}.reflow_pins[]` 항목:

| Key           | Type                      | Required | Example                       |
| ------------- | ------------------------- | -------: | ----------------------------- |
| `path`        | string                    |        ✅ | `"plan.start_ts"`             |
| `pin_kind`    | enum(string)              |        ✅ | `"fixed"`                     |
| `value`       | string|number|bool|object |        ✅ | `"2026-02-05T02:00:00+04:00"` |
| `hardness`    | `"hard"`|`"soft"`         |        ✅ | `"hard"`                      |
| `reason_code` | string                    |        ✅ | `"tide_window"`               |

---

### 3.6 Activity Type 표준 템플릿(`activity_types`)

`activity_types.{type_id}`가 **기본 evidence/constraints/resources**를 제공합니다.
Activity 인스턴스는 필요 시 **추가/오버라이드**합니다(= 템플릿은 기본값).

각 템플릿 필수 키:

| Key                         | Type   | Required |
| --------------------------- | ------ | -------: |
| `type_id`                   | string |        ✅ |
| `display_name`              | string |        ✅ |
| `category`                  | string |        ✅ |
| `default_duration_min`      | int    |        ✅ |
| `default_resources`         | array  |        ✅ |
| `default_constraints`       | array  |        ✅ |
| `default_evidence_required` | array  |        ✅ |

---

### 3.7 constraint_rules(운영 기준치: 수치/창)

`constraint_rules`는 “룰 엔진의 파라미터 SSOT”입니다.
아래 값들은 **샘플 운영 기준치**이며, 현장 표준에 맞춰 조정 가능하도록 설계했습니다(그러나 JSON상 “수치”로 내려갑니다).

* `constraint_rules.wx`: 풍속/파고/시정 등 → activity_type별 profile로 참조
* `constraint_rules.linkspan`: 하중/기울기/조류/슬롯
* `constraint_rules.barge`: 적재/흘수/동요/계류
* `constraint_rules.ptw`: PTW/Certificate lead time, validity, required types

---

### 3.8 Collision 레지스트리(`collisions`) + UI 노출 필드

`collisions.{collision_id}` 필수 키:

| Key                 | Type                              | Required | Notes                         |
| ------------------- | --------------------------------- | -------: | ----------------------------- |
| `collision_id`      | string                            |        ✅ | dict key와 동일                  |
| `kind`              | string                            |        ✅ | 예: `"resource_overallocated"` |
| `severity`          | enum                              |        ✅ | info/warning/blocking         |
| `status`            | `"open"`|`"resolved"`|`"ignored"` |        ✅ | 운영 처리 상태                      |
| `trip_id`           | string                            |        ✅ |                               |
| `activity_ids`      | string[]                          |        ✅ | 영향 Activity                   |
| `resource_ids`      | string[]                          |        ✅ | 자원 충돌일 때                      |
| `rule_refs`         | string[]                          |        ✅ | 제약 위반일 때                      |
| `message`           | string                            |        ✅ | UI 1줄                         |
| `details`           | object                            |        ✅ | 진단 상세                         |
| `suggested_actions` | array                             |        ✅ | 해결 옵션(shift/swap/wait 등)      |

---

### 3.9 Reflow Run(`reflow_runs[]`) – Preview→Apply 추적

각 run 필수 키:

| Key                 | Type                  | Required | Notes               |
| ------------------- | --------------------- | -------: | ------------------- |
| `run_id`            | string                |        ✅ |                     |
| `mode`              | `"preview"`|`"apply"` |        ✅ | Preview/Apply 분리    |
| `requested_at`      | string                |        ✅ |                     |
| `requested_by`      | string                |        ✅ |                     |
| `seed`              | object                |        ✅ | 무엇이 바뀌어서 reflow 되었나 |
| `proposed_changes`  | array                 |        ✅ | (preview/apply 공통)  |
| `applied_changes`   | array                 |        ✅ | apply일 때만           |
| `collision_summary` | object                |        ✅ | UI 요약               |
| `baseline_id`       | string|null           |        ✅ | Approval 연계         |

---

### 3.10 Baseline(Approval) 스냅샷 포맷(`baselines`)

`baselines`는 Approval 모드의 근거이며 “어느 필드가 frozen인가”를 구조적으로 판단 가능해야 합니다.

* `baselines.current_baseline_id`: 현재 활성 baseline
* `baselines.items.{baseline_id}`:

  * `freeze_policy`: `frozen_fields[]`, `lock_level_on_apply`
  * `snapshot`: 승인 시점의 plan 중심 스냅샷(+ 해시)

---

## 4) 시각화

### 4.1 Map 색상 규칙(상태 기반)

권장: “색상 자체”가 아니라 **semantic token**으로 구현(테마 변경 용이).

| state            | token            | 의미        |
| ---------------- | ---------------- | --------- |
| draft/planned    | `status.planned` | 계획        |
| ready            | `status.ready`   | 시작 가능     |
| in_progress      | `status.active`  | 진행        |
| paused           | `status.paused`  | 운영 중지     |
| blocked          | `status.blocked` | 조건 미충족/위험 |
| completed        | `status.done`    | 완료        |
| canceled/aborted | `status.ended`   | 종료(취소/중단) |

추가 오버레이:

* `collision_severity_max == blocking`이면 **TR/route outline을 강조**
* `risk_score`로 투명도/해치 패턴

### 4.2 Gantt 표현 규칙(의존/제약/충돌/Slack)

* Row 구조:

  * Trip → TR → Activity
* Dependency 라인:

  * FS/SS는 선 스타일로 구분, `lag_min`이 있으면 라벨 표시
* Constraint 아이콘:

  * WX: 🌬 (또는 아이콘) / LINKSPAN: ⛴ / BARGE: 🚢 / PTW: 🧾
* Collision 배지:

  * `calc.collision_ids.length` > 0이면 배지 숫자 표시
  * blocking이면 빨간 테두리(토큰)
* Slack 표기:

  * `calc.slack_min`을 막대 끝에 “+120m” 같이 표시
  * `critical_path=true`면 굵게(토큰)

### 4.3 Map↔Timeline 상호 작동(정확 규칙)

* 선택 동기화:

  * `selected_activity_id` 변경 → Map highlight + Inspector update
  * Map에서 TR 클릭 → 그 TR의 “현재 활동(calc.current_activity_id)” 선택
* 날짜 변경:

  * Cursor 변경 → `reflow_runs`에 **preview run** 생성(자동)
  * Preview 결과는 “임시 표시(ghost bars)”로 Gantt에 노출
  * Apply 시에만 `plan.start_ts/end_ts`가 갱신되고 history 이벤트가 누적

---

## 5) 기록(Plan/History/Evidence) + 운영 룰북

### 5.1 Plan ↔ Actual 자동 전환 규칙(명시)

**Activity 렌더링 기준(우선순위)**

1. `actual.start_ts == null` → “Plan 기준”
2. `actual.start_ts != null && actual.end_ts == null` → “Live(Actual 진행중)”
3. `actual.end_ts != null` → “Actual 완료”

**상태 자동 정합성 규칙**

* `actual.start_ts != null`이면 `state`는 최소 `in_progress` 이상이어야 함
  (단, `canceled` 예외는 금지 → 데이터 오류 collision)
* `actual.end_ts != null`이면 `state=completed`로 수렴(운영자가 `aborted`로 변경한 경우 제외)

---

### 5.2 History 로그 자동 생성 트리거(정확)

`history_events[]` 자동 생성(append-only):

| Trigger                       | event_type                   | 대상                   |
| ----------------------------- | ---------------------------- | -------------------- |
| plan 변경(시간/자원/제약)             | `plan_changed`               | activity             |
| actual 입력(start/end/progress) | `actual_changed`             | activity             |
| state 전이                      | `state_transition`           | activity             |
| blocker 추가/해제                 | `blocker_changed`            | activity             |
| evidence 추가/삭제                | `evidence_changed`           | activity             |
| reflow preview 생성             | `reflow_previewed`           | run                  |
| reflow apply                  | `reflow_applied`             | run + activity batch |
| collision 생성/해제               | `collision_opened/resolved`  | collision            |
| baseline 생성/활성화               | `baseline_created/activated` | baseline             |

---

### 5.3 Evidence 연결 + 미존재 경고 규칙

* `evidence_required[].required == true`이고 `stage` 조건이 현재 전이 gate에 해당하는데

  * `evidence_ids`에 매칭 타입이 `min_count` 미만이면
  * **state 전이 차단 + blocker_code 설정**

    * 예: `PTW_MISSING`, `CERT_EXPIRED`

---

## 5.4 (a) Activity 상태 머신 운영 룰북

### 상태 정의(운영 관점)

* `planned`: 일정은 있으나 **ready gate 미충족**
* `ready`: **시작 가능**(필수 evidence/제약/자원 확인 완료)
* `blocked`: **시작/진행 불가**(blocker_code로 원인 명시)
* `paused`: **운영자가 멈춤**(원인은 notes/상위 collision)
* `aborted`: **사고/중대 사유로 종료**(후속 조치/보고 필요)

### Allowed transitions (Adjacency)

아래 표를 “allowed transitions”로 강제합니다.

| from → to                                  | 허용 | 기본 Trigger         | Guard(차단 조건)                                   |
| ------------------------------------------ | -: | ------------------ | ---------------------------------------------- |
| draft → planned                            |  ✅ | plan 시간/자원 최소 입력   | 없음                                             |
| planned → ready                            |  ✅ | 운영자 “Ready”        | before_ready evidence 부족 / 제약 hard 위반 / 자원 미확보 |
| ready → in_progress                        |  ✅ | actual.start_ts 입력 | before_start evidence 부족 / hard 제약 위반          |
| in_progress → paused                       |  ✅ | 운영자 Pause          | 없음                                             |
| paused → in_progress                       |  ✅ | 운영자 Resume         | hard 제약 위반(재개 시점 기준)                           |
| planned/ready/in_progress/paused → blocked |  ✅ | blocker 발생(자동/수동)  | blocker_code 필수                                |
| blocked → ready                            |  ✅ | blocker 해소         | gate 재검증 실패 시 불가                               |
| planned/ready → canceled                   |  ✅ | 운영자 Cancel         | actual.start_ts가 있으면 불가(그 경우 aborted)          |
| in_progress/paused/blocked → aborted       |  ✅ | 운영자 Abort          | reason 필수(incident/unsafe/… )                  |
| completed → *                              |  ❌ | -                  | 종단 상태                                          |

**필수 규칙**

* `state == blocked`이면 `blocker_code != null` 이어야 함
* `state == completed`이면 `actual.end_ts != null` 이어야 함(또는 “운영 예외”를 collision으로 기록)

---

## 5.5 (b) Reflow 계산 규칙 운영 룰북

Reflow는 반드시 **(1) Topological(의존) → (2) Constraint Snap → (3) Resource Calendar** 순서로 수렴시킵니다.

### 입력(Seed)

Reflow는 다음 중 하나로 트리거됩니다.

* 날짜 커서 변경
* Activity plan 변경(드래그, duration 수정, dependency 수정)
* resource calendar 변경
* constraint_rules 변경(WX/LINKSPAN/BARGE/PTW)

### 계산 절차(정확한 순서)

1. **그래프 구성**

* 노드: activities
* 엣지: dependencies (pred → succ)
* cycle 탐지:

  * cycle이면 `dependency_cycle` collision(blocking) 생성
  * reflow는 “preview만” 생성하고 apply 금지

2. **고정점(Fixed) 결정**

* `lock_level in ("hard","baseline")`인 activity의 `plan.start_ts/end_ts`는 이동 금지
* `reflow_pins`가 있는 path는 해당 pin 규칙에 따라 이동 금지(또는 soft penalty)

3. **Topological pass (Earliest)**

* 각 activity의 earliest start는:

  * max(선행 제약을 만족하는 시간, constraint snap 결과, resource calendar 가능 시간)

4. **Constraint Snap**

* hard constraint는 “가능한 다음 창”으로 스냅:

  * 예: `wx_profile=barge_transit` 조건 위반 → 다음 wx window로 이동
* soft constraint는 “가능하면 만족”:

  * 만족 불가면 warning collision만 생성

5. **Resource Calendar**

* `duration_mode="work"`:

  * 자원/작업 캘린더의 근무 시간 슬롯에서만 시간을 소모
* `duration_mode="elapsed"`:

  * 연속 시간(24h)로 소모 (단, 자원 사용 가능 구간은 충족해야 함)

6. **Backward pass (Latest) + Slack**

* Trip end milestone(또는 pinned constraint)을 기준으로 latest 계산
* `slack_min = ls_ts - es_ts` (분 단위)

7. **Collision 탐지**

* resource capacity 초과
* hard constraint 위반
* baseline/hard lock 위반(이동이 필요한데 이동 불가)

8. **Preview vs Apply**

* preview: `reflow_runs[].proposed_changes`만 생성
* apply:

  * lock된 필드 제외하고 plan 갱신
  * `reflow_runs[].applied_changes` 기록
  * history_events append

---

## 5.6 (c) Collision 분류/해결 정책 운영 룰북

### Collision kind 표준(권장 최소 집합)

* `resource_overallocated`
* `resource_unavailable`
* `constraint_violation`
* `dependency_violation`
* `dependency_cycle`
* `evidence_missing`
* `baseline_violation`
* `spatial_conflict`
* `negative_slack`
* `data_error`

### 해결 우선순위(결정 원칙)

1. **안전/법규(PTW/Certificate/WX hard)**
2. **Baseline freeze(Approval)**
3. **계약/마일스톤**
4. **운영 효율(자원 최적화, 최소 지연)**

### 기본 해결 정책(템플릿)

* `resource_overallocated`:

  * (A) **대기(standby 활동 삽입)**
  * (B) **자원 교체(swap resource)**
  * (C) **우선순위에 따라 후행 activity shift**
* `constraint_violation`(WX/LINKSPAN/BARGE):

  * (A) 다음 window로 스냅(shift)
  * (B) window 예약 변경(슬롯 교체)
* `evidence_missing`:

  * (A) evidence 추가(attach)
  * (B) 시작 지연(shift) + blocker 유지
* `baseline_violation`:

  * (A) baseline 재승인 프로세스(override 승인)
  * (B) lock 해제(권한 필요) 후 apply

---

## 6) 추가 아이디어(우선순위)

### P0 (즉시 효과/리스크 감소)

1. **TR Digital Passport**

   * TR별 “정적 스펙(Weight/COG) + 필수 증빙 + 현재 상태 + 최근 이력” 단일 카드
2. **Approval(Read-only) View**

   * baseline_id 고정 + frozen_fields 시각화(편집 불가를 데이터로 증명)
3. **Collision 2-click UX**

   * TR 선택 → collision 배지 클릭 → suggested_action 바로 실행(Preview 생성)

### P1 (운영 고도화)

4. **Scenario Compare (Plan A/B/C Overlay)**

   * reflow_runs를 시나리오로 승격, A/B/C 오버레이(ghost bars)
5. **Resource Heatmap**

   * resource_overallocated를 사전 예방(주간 캘린더)

### P2 (현장 친화)

6. **Mobile Field Mode**

   * 최소 UI(현재 Activity + 증빙 체크리스트 + 사진 업로드 + 상태 전이 버튼)

---

# option_c.json 샘플 (Contract v0.8.0 / 여러 TR·Trip 포함)

아래 JSON은 **“바로 구현/검증 가능한 형태”**로, 위 계약의 키/값을 실제로 채운 샘플입니다.

```json
{
  "contract": {
    "name": "tr-move-ssot",
    "version": "0.8.0",
    "timezone": "Asia/Dubai",
    "generated_at": "2026-02-01T12:00:00+04:00",
    "ssot": {
      "activity_is_source_of_truth": true,
      "derived_fields_read_only": true
    }
  },

  "constraint_rules": {
    "wx": {
      "profiles": {
        "wx_profile_spmt_move": {
          "wind_sustained_max_mps": 12.0,
          "wind_gust_max_mps": 16.0,
          "visibility_min_m": 800,
          "precip_max_mmph": 5.0,
          "lightning_exclusion_km": 10,
          "wave_height_max_m": 0.8,
          "temperature_min_c": -5,
          "temperature_max_c": 45,
          "window_min_duration_min": 120
        },
        "wx_profile_crane_lift": {
          "wind_sustained_max_mps": 10.0,
          "wind_gust_max_mps": 14.0,
          "visibility_min_m": 1000,
          "precip_max_mmph": 2.0,
          "lightning_exclusion_km": 15,
          "wave_height_max_m": 0.5,
          "temperature_min_c": 0,
          "temperature_max_c": 40,
          "window_min_duration_min": 90
        },
        "wx_profile_barge_transit": {
          "wind_sustained_max_mps": 13.0,
          "wind_gust_max_mps": 18.0,
          "visibility_min_m": 1200,
          "precip_max_mmph": 8.0,
          "lightning_exclusion_km": 15,
          "wave_height_max_m": 1.2,
          "temperature_min_c": 0,
          "temperature_max_c": 45,
          "window_min_duration_min": 240
        }
      },
      "data_sources": {
        "primary": "metocean_feed_a",
        "fallback": "manual_observation"
      }
    },

    "linkspan": {
      "assets": {
        "LINKSPAN_01": {
          "max_gross_load_t": 520,
          "max_axle_line_load_t": 40,
          "max_slope_deg": 3.0,
          "min_deck_width_m": 8.0,
          "slot_granularity_min": 30,
          "requires_slot_booking": true
        }
      }
    },

    "barge": {
      "assets": {
        "BARGE_01": {
          "max_payload_t": 900,
          "max_deck_point_load_t_per_m2": 20,
          "draft_max_m": 4.5,
          "trim_max_deg": 2.0,
          "heel_max_deg": 3.0,
          "requires_stability_calc": true,
          "requires_mooring_plan": true
        }
      }
    },

    "ptw": {
      "permit_types": {
        "ptw_hot_work": { "validity_min": 480, "lead_time_min": 240 },
        "ptw_lifting": { "validity_min": 480, "lead_time_min": 720 },
        "ptw_transport_road": { "validity_min": 1440, "lead_time_min": 2880 },
        "ptw_marine": { "validity_min": 1440, "lead_time_min": 2880 }
      },
      "certificate_types": {
        "cert_rigging": { "validity_min": 525600 },
        "cert_spmt_operator": { "validity_min": 525600 },
        "cert_crane": { "validity_min": 525600 }
      }
    }
  },

  "activity_types": {
    "route_survey": {
      "type_id": "route_survey",
      "display_name": "Route Survey",
      "category": "engineering",
      "default_duration_min": 480,
      "default_resources": [
        { "resource_kind": "crew", "pool_id": "POOL_SURVEY_CREW", "qty": 1 }
      ],
      "default_constraints": [],
      "default_evidence_required": [
        {
          "evidence_type": "route_survey_report",
          "stage": "after_end",
          "min_count": 1,
          "required": true,
          "validity_min": null,
          "tags": ["engineering", "route"]
        }
      ]
    },

    "ptw_bundle_approval": {
      "type_id": "ptw_bundle_approval",
      "display_name": "PTW / Certificates Gate",
      "category": "permit",
      "default_duration_min": 240,
      "default_resources": [
        { "resource_kind": "office", "pool_id": "POOL_PERMIT_TEAM", "qty": 1 }
      ],
      "default_constraints": [
        {
          "kind": "ptw_gate",
          "hardness": "hard",
          "rule_ref": "ptw.permit_types",
          "params": { "required_permits": ["ptw_lifting", "ptw_transport_road", "ptw_marine"] }
        }
      ],
      "default_evidence_required": [
        {
          "evidence_type": "ptw_approval",
          "stage": "before_ready",
          "min_count": 1,
          "required": true,
          "validity_min": 1440,
          "tags": ["permit"]
        },
        {
          "evidence_type": "certificate_bundle",
          "stage": "before_ready",
          "min_count": 1,
          "required": true,
          "validity_min": null,
          "tags": ["certificate"]
        }
      ]
    },

    "spmt_setup": {
      "type_id": "spmt_setup",
      "display_name": "SPMT Setup & Pre-check",
      "category": "ops",
      "default_duration_min": 360,
      "default_resources": [
        { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
        { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
      ],
      "default_constraints": [],
      "default_evidence_required": [
        {
          "evidence_type": "spmt_checklist",
          "stage": "after_end",
          "min_count": 1,
          "required": true,
          "validity_min": null,
          "tags": ["spmt", "safety"]
        }
      ]
    },

    "crane_lift": {
      "type_id": "crane_lift",
      "display_name": "Crane Lift / Load-out",
      "category": "ops",
      "default_duration_min": 240,
      "default_resources": [
        { "resource_kind": "crane", "pool_id": "POOL_CRANE", "qty": 1 },
        { "resource_kind": "crew", "pool_id": "POOL_LIFT_CREW", "qty": 1 }
      ],
      "default_constraints": [
        {
          "kind": "wx_window",
          "hardness": "hard",
          "rule_ref": "wx.profiles.wx_profile_crane_lift",
          "params": {}
        }
      ],
      "default_evidence_required": [
        {
          "evidence_type": "lift_plan",
          "stage": "before_ready",
          "min_count": 1,
          "required": true,
          "validity_min": 10080,
          "tags": ["lift"]
        },
        {
          "evidence_type": "toolbox_talk",
          "stage": "before_start",
          "min_count": 1,
          "required": true,
          "validity_min": 720,
          "tags": ["safety"]
        }
      ]
    },

    "road_move": {
      "type_id": "road_move",
      "display_name": "Road Move (SPMT)",
      "category": "transport",
      "default_duration_min": 360,
      "default_resources": [
        { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
        { "resource_kind": "escort", "pool_id": "POOL_ESCORT", "qty": 1 },
        { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
      ],
      "default_constraints": [
        {
          "kind": "wx_window",
          "hardness": "hard",
          "rule_ref": "wx.profiles.wx_profile_spmt_move",
          "params": {}
        }
      ],
      "default_evidence_required": [
        {
          "evidence_type": "gps_track",
          "stage": "during",
          "min_count": 1,
          "required": true,
          "validity_min": null,
          "tags": ["tracking"]
        }
      ]
    },

    "linkspan_crossing": {
      "type_id": "linkspan_crossing",
      "display_name": "Linkspan Crossing",
      "category": "marine_interface",
      "default_duration_min": 90,
      "default_resources": [
        { "resource_kind": "linkspan", "resource_id": "LINKSPAN_01", "qty": 1 },
        { "resource_kind": "crew", "pool_id": "POOL_MARINE_CREW", "qty": 1 }
      ],
      "default_constraints": [
        {
          "kind": "linkspan_capacity",
          "hardness": "hard",
          "rule_ref": "linkspan.assets.LINKSPAN_01",
          "params": {}
        }
      ],
      "default_evidence_required": [
        {
          "evidence_type": "linkspan_slot_confirmation",
          "stage": "before_ready",
          "min_count": 1,
          "required": true,
          "validity_min": 1440,
          "tags": ["slot"]
        }
      ]
    },

    "barge_transit": {
      "type_id": "barge_transit",
      "display_name": "Barge Transit",
      "category": "marine",
      "default_duration_min": 480,
      "default_resources": [
        { "resource_kind": "barge", "resource_id": "BARGE_01", "qty": 1 },
        { "resource_kind": "tug", "pool_id": "POOL_TUG", "qty": 1 },
        { "resource_kind": "crew", "pool_id": "POOL_MARINE_CREW", "qty": 1 }
      ],
      "default_constraints": [
        {
          "kind": "wx_window",
          "hardness": "hard",
          "rule_ref": "wx.profiles.wx_profile_barge_transit",
          "params": {}
        },
        {
          "kind": "barge_limits",
          "hardness": "hard",
          "rule_ref": "barge.assets.BARGE_01",
          "params": {}
        }
      ],
      "default_evidence_required": [
        {
          "evidence_type": "barge_stability_calc",
          "stage": "before_ready",
          "min_count": 1,
          "required": true,
          "validity_min": 10080,
          "tags": ["marine", "stability"]
        }
      ]
    }
  },

  "entities": {
    "locations": {
      "LOC_YARD_A": { "location_id": "LOC_YARD_A", "name": "Yard A", "lat": 25.0501, "lon": 55.1202 },
      "LOC_JETTY_A": { "location_id": "LOC_JETTY_A", "name": "Jetty A", "lat": 25.0611, "lon": 55.1404 },
      "LOC_ISLAND_PORT": { "location_id": "LOC_ISLAND_PORT", "name": "Island Port", "lat": 25.0902, "lon": 55.2109 },
      "LOC_SUBSTATION_1": { "location_id": "LOC_SUBSTATION_1", "name": "Substation 1", "lat": 25.1020, "lon": 55.2501 }
    },

    "resource_pools": {
      "POOL_SPMT": {
        "pool_id": "POOL_SPMT",
        "kind": "spmt",
        "members": ["SPMT_01", "SPMT_02"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_SPMT_CREW": {
        "pool_id": "POOL_SPMT_CREW",
        "kind": "crew",
        "members": ["CREW_SPMT_A", "CREW_SPMT_B"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_CRANE": {
        "pool_id": "POOL_CRANE",
        "kind": "crane",
        "members": ["CRANE_600T_01"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_ESCORT": {
        "pool_id": "POOL_ESCORT",
        "kind": "escort",
        "members": ["ESCORT_01", "ESCORT_02"],
        "capacity_rule": { "mode": "many", "qty_limit": 2 }
      },
      "POOL_MARINE_CREW": {
        "pool_id": "POOL_MARINE_CREW",
        "kind": "crew",
        "members": ["CREW_MARINE_A"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_TUG": {
        "pool_id": "POOL_TUG",
        "kind": "tug",
        "members": ["TUG_01"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_SURVEY_CREW": {
        "pool_id": "POOL_SURVEY_CREW",
        "kind": "crew",
        "members": ["CREW_SURVEY_01"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_PERMIT_TEAM": {
        "pool_id": "POOL_PERMIT_TEAM",
        "kind": "office",
        "members": ["TEAM_PERMIT_01"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      },
      "POOL_LIFT_CREW": {
        "pool_id": "POOL_LIFT_CREW",
        "kind": "crew",
        "members": ["CREW_LIFT_01"],
        "capacity_rule": { "mode": "one_of", "qty_limit": 1 }
      }
    },

    "resources": {
      "SPMT_01": {
        "resource_id": "SPMT_01",
        "kind": "spmt",
        "name": "SPMT Set 01 (12 axle lines)",
        "attributes": { "axle_lines": 12, "max_axle_line_load_t": 36 },
        "calendar": {
          "timezone": "Asia/Dubai",
          "work_shifts": [
            { "days": ["mon","tue","wed","thu","fri","sat"], "start_hhmm": "07:00", "end_hhmm": "19:00" }
          ],
          "blackouts": [
            { "start_ts": "2026-02-06T00:00:00+04:00", "end_ts": "2026-02-06T06:00:00+04:00", "reason": "maintenance" }
          ]
        }
      },
      "SPMT_02": {
        "resource_id": "SPMT_02",
        "kind": "spmt",
        "name": "SPMT Set 02 (10 axle lines)",
        "attributes": { "axle_lines": 10, "max_axle_line_load_t": 34 },
        "calendar": {
          "timezone": "Asia/Dubai",
          "work_shifts": [
            { "days": ["mon","tue","wed","thu","fri","sat"], "start_hhmm": "07:00", "end_hhmm": "19:00" }
          ],
          "blackouts": []
        }
      },
      "CRANE_600T_01": {
        "resource_id": "CRANE_600T_01",
        "kind": "crane",
        "name": "Crane 600T",
        "attributes": { "max_lift_t": 600 },
        "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] }
      },
      "LINKSPAN_01": {
        "resource_id": "LINKSPAN_01",
        "kind": "linkspan",
        "name": "Linkspan 01",
        "attributes": { "asset_ref": "LINKSPAN_01" },
        "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] }
      },
      "BARGE_01": {
        "resource_id": "BARGE_01",
        "kind": "barge",
        "name": "Barge 01",
        "attributes": { "asset_ref": "BARGE_01" },
        "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] }
      },
      "TUG_01": {
        "resource_id": "TUG_01",
        "kind": "tug",
        "name": "Tug 01",
        "attributes": {},
        "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] }
      },
      "CREW_SPMT_A": { "resource_id": "CREW_SPMT_A", "kind": "crew", "name": "SPMT Crew A", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "CREW_SPMT_B": { "resource_id": "CREW_SPMT_B", "kind": "crew", "name": "SPMT Crew B", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "CREW_MARINE_A": { "resource_id": "CREW_MARINE_A", "kind": "crew", "name": "Marine Crew A", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "CREW_SURVEY_01": { "resource_id": "CREW_SURVEY_01", "kind": "crew", "name": "Survey Crew", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "CREW_LIFT_01": { "resource_id": "CREW_LIFT_01", "kind": "crew", "name": "Lift Crew", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "TEAM_PERMIT_01": { "resource_id": "TEAM_PERMIT_01", "kind": "office", "name": "Permit Team", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "ESCORT_01": { "resource_id": "ESCORT_01", "kind": "escort", "name": "Escort 01", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } },
      "ESCORT_02": { "resource_id": "ESCORT_02", "kind": "escort", "name": "Escort 02", "attributes": {}, "calendar": { "timezone": "Asia/Dubai", "work_shifts": [], "blackouts": [] } }
    },

    "trs": {
      "TR_001": {
        "tr_id": "TR_001",
        "name": "Transformer TR-001",
        "spec": {
          "weight_t": 310.0,
          "cog_mm": { "x": 0, "y": 0, "z": 2100 },
          "dimensions_mm": { "l": 8200, "w": 3200, "h": 3800 }
        },
        "calc": {
          "current_activity_id": "A1120",
          "current_location_id": "LOC_JETTY_A",
          "risk_score": 0.42
        }
      },
      "TR_002": {
        "tr_id": "TR_002",
        "name": "Transformer TR-002",
        "spec": {
          "weight_t": 295.0,
          "cog_mm": { "x": 50, "y": -20, "z": 2050 },
          "dimensions_mm": { "l": 8000, "w": 3100, "h": 3700 }
        },
        "calc": {
          "current_activity_id": null,
          "current_location_id": "LOC_YARD_A",
          "risk_score": 0.35
        }
      },
      "TR_003": {
        "tr_id": "TR_003",
        "name": "Transformer TR-003",
        "spec": {
          "weight_t": 330.0,
          "cog_mm": { "x": -30, "y": 10, "z": 2200 },
          "dimensions_mm": { "l": 8500, "w": 3300, "h": 3900 }
        },
        "calc": {
          "current_activity_id": null,
          "current_location_id": "LOC_YARD_A",
          "risk_score": 0.50
        }
      }
    },

    "trips": {
      "TRIP_2026_02A": {
        "trip_id": "TRIP_2026_02A",
        "name": "Trip Alpha: Yard A → Island Port → Substation 1",
        "tr_ids": ["TR_001", "TR_002"],
        "activity_ids": [
          "A1000", "A1010", "A1020",
          "A1100", "A1110", "A1120", "A1130", "A1140",
          "A1200", "A1210", "A1220", "A1230", "A1240"
        ],
        "calc": { "collision_ids": ["COL_001", "COL_002"], "risk_score": 0.55 }
      },
      "TRIP_2026_02B": {
        "trip_id": "TRIP_2026_02B",
        "name": "Trip Beta: Yard A → Substation 1 (Road)",
        "tr_ids": ["TR_003"],
        "activity_ids": ["B1000", "B1100", "B1110", "B1120"],
        "calc": { "collision_ids": [], "risk_score": 0.28 }
      }
    },

    "evidence_items": {
      "EVI_0001": {
        "evidence_id": "EVI_0001",
        "evidence_type": "ptw_approval",
        "title": "PTW Bundle Approval (Trip Alpha)",
        "uri": "dms://permits/TRIP_2026_02A/ptw_bundle.pdf",
        "captured_at": "2026-02-03T09:15:00+04:00",
        "captured_by": "user:permit_team",
        "tags": ["permit"]
      },
      "EVI_0002": {
        "evidence_id": "EVI_0002",
        "evidence_type": "route_survey_report",
        "title": "Route Survey Report Rev1",
        "uri": "dms://engineering/TRIP_2026_02A/route_survey_rev1.pdf",
        "captured_at": "2026-02-02T18:10:00+04:00",
        "captured_by": "user:survey",
        "tags": ["engineering"]
      }
    },

    "activities": {
      "A1000": {
        "activity_id": "A1000",
        "type_id": "route_survey",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001", "TR_002"],
        "title": "Route Survey (shared)",
        "state": "completed",
        "lock_level": "baseline",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          {
            "evidence_type": "route_survey_report",
            "stage": "after_end",
            "min_count": 1,
            "required": true,
            "validity_min": null,
            "tags": ["engineering", "route"]
          }
        ],
        "evidence_ids": ["EVI_0002"],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-02T09:00:00+04:00",
          "end_ts": "2026-02-02T17:00:00+04:00",
          "duration_min": 480,
          "duration_mode": "work",
          "location": {
            "from_location_id": "LOC_YARD_A",
            "to_location_id": "LOC_JETTY_A",
            "route_id": "ROUTE_ALPHA",
            "geo_fence_ids": []
          },
          "dependencies": [],
          "resources": [
            { "resource_kind": "crew", "pool_id": "POOL_SURVEY_CREW", "qty": 1 }
          ],
          "constraints": [],
          "notes": "Survey completed, no clearance issues."
        },
        "actual": {
          "start_ts": "2026-02-02T09:10:00+04:00",
          "end_ts": "2026-02-02T16:40:00+04:00",
          "progress_pct": 100,
          "location_override": null,
          "resource_assignments": [
            { "resource_id": "CREW_SURVEY_01", "qty": 1 }
          ],
          "notes": "As planned."
        },
        "calc": {
          "es_ts": "2026-02-02T09:00:00+04:00",
          "ef_ts": "2026-02-02T17:00:00+04:00",
          "ls_ts": "2026-02-02T09:00:00+04:00",
          "lf_ts": "2026-02-02T17:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.10,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "A1010": {
        "activity_id": "A1010",
        "type_id": "spmt_setup",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001", "TR_002"],
        "title": "SPMT Setup (shared prep)",
        "state": "planned",
        "lock_level": "soft",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          {
            "evidence_type": "spmt_checklist",
            "stage": "after_end",
            "min_count": 1,
            "required": true,
            "validity_min": null,
            "tags": ["spmt", "safety"]
          }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-03T07:00:00+04:00",
          "end_ts": "2026-02-03T13:00:00+04:00",
          "duration_min": 360,
          "duration_mode": "work",
          "location": {
            "from_location_id": "LOC_YARD_A",
            "to_location_id": "LOC_YARD_A",
            "route_id": null,
            "geo_fence_ids": []
          },
          "dependencies": [
            { "pred_activity_id": "A1000", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
          ],
          "constraints": [],
          "notes": "Shared SPMT prep."
        },
        "actual": {
          "start_ts": null,
          "end_ts": null,
          "progress_pct": 0,
          "location_override": null,
          "resource_assignments": [],
          "notes": ""
        },
        "calc": {
          "es_ts": "2026-02-03T07:00:00+04:00",
          "ef_ts": "2026-02-03T13:00:00+04:00",
          "ls_ts": "2026-02-03T09:00:00+04:00",
          "lf_ts": "2026-02-03T15:00:00+04:00",
          "slack_min": 120,
          "critical_path": false,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.25,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1020": {
        "activity_id": "A1020",
        "type_id": "ptw_bundle_approval",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001", "TR_002"],
        "title": "PTW/Certificates Gate (shared)",
        "state": "ready",
        "lock_level": "hard",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          {
            "evidence_type": "ptw_approval",
            "stage": "before_ready",
            "min_count": 1,
            "required": true,
            "validity_min": 1440,
            "tags": ["permit"]
          },
          {
            "evidence_type": "certificate_bundle",
            "stage": "before_ready",
            "min_count": 1,
            "required": true,
            "validity_min": null,
            "tags": ["certificate"]
          }
        ],
        "evidence_ids": ["EVI_0001"],
        "reflow_pins": [
          {
            "path": "plan.start_ts",
            "pin_kind": "fixed",
            "value": "2026-02-03T08:00:00+04:00",
            "hardness": "hard",
            "reason_code": "permit_submission_window"
          }
        ],
        "plan": {
          "start_ts": "2026-02-03T08:00:00+04:00",
          "end_ts": "2026-02-03T12:00:00+04:00",
          "duration_min": 240,
          "duration_mode": "work",
          "location": {
            "from_location_id": "LOC_YARD_A",
            "to_location_id": "LOC_YARD_A",
            "route_id": null,
            "geo_fence_ids": []
          },
          "dependencies": [
            { "pred_activity_id": "A1000", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "office", "pool_id": "POOL_PERMIT_TEAM", "qty": 1 }
          ],
          "constraints": [
            {
              "kind": "ptw_gate",
              "hardness": "hard",
              "rule_ref": "ptw.permit_types",
              "params": { "required_permits": ["ptw_lifting", "ptw_transport_road", "ptw_marine"] }
            }
          ],
          "notes": "Gate activity: must be ready before ops start."
        },
        "actual": {
          "start_ts": "2026-02-03T08:10:00+04:00",
          "end_ts": null,
          "progress_pct": 50,
          "location_override": null,
          "resource_assignments": [{ "resource_id": "TEAM_PERMIT_01", "qty": 1 }],
          "notes": "PTW approved; cert bundle pending upload."
        },
        "calc": {
          "es_ts": "2026-02-03T08:00:00+04:00",
          "ef_ts": "2026-02-03T12:00:00+04:00",
          "ls_ts": "2026-02-03T08:00:00+04:00",
          "lf_ts": "2026-02-03T12:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.40,
          "predicted_end_ts": "2026-02-03T13:00:00+04:00",
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "A1100": {
        "activity_id": "A1100",
        "type_id": "crane_lift",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001"],
        "title": "Load-out TR_001",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          {
            "evidence_type": "lift_plan",
            "stage": "before_ready",
            "min_count": 1,
            "required": true,
            "validity_min": 10080,
            "tags": ["lift"]
          },
          {
            "evidence_type": "toolbox_talk",
            "stage": "before_start",
            "min_count": 1,
            "required": true,
            "validity_min": 720,
            "tags": ["safety"]
          }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-04T07:00:00+04:00",
          "end_ts": "2026-02-04T11:00:00+04:00",
          "duration_min": 240,
          "duration_mode": "work",
          "location": {
            "from_location_id": "LOC_YARD_A",
            "to_location_id": "LOC_YARD_A",
            "route_id": null,
            "geo_fence_ids": []
          },
          "dependencies": [
            { "pred_activity_id": "A1020", "type": "fs", "lag_min": 0 },
            { "pred_activity_id": "A1010", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "crane", "pool_id": "POOL_CRANE", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_LIFT_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_crane_lift", "params": {} }
          ],
          "notes": ""
        },
        "actual": {
          "start_ts": null,
          "end_ts": null,
          "progress_pct": 0,
          "location_override": null,
          "resource_assignments": [],
          "notes": ""
        },
        "calc": {
          "es_ts": "2026-02-04T07:00:00+04:00",
          "ef_ts": "2026-02-04T11:00:00+04:00",
          "ls_ts": "2026-02-04T07:00:00+04:00",
          "lf_ts": "2026-02-04T11:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.30,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1110": {
        "activity_id": "A1110",
        "type_id": "road_move",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001"],
        "title": "Road Move TR_001 (Yard → Jetty)",
        "state": "ready",
        "lock_level": "hard",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "gps_track", "stage": "during", "min_count": 1, "required": true, "validity_min": null, "tags": ["tracking"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [
          {
            "path": "plan.start_ts",
            "pin_kind": "fixed",
            "value": "2026-02-04T12:00:00+04:00",
            "hardness": "hard",
            "reason_code": "road_curfew_slot"
          }
        ],
        "plan": {
          "start_ts": "2026-02-04T12:00:00+04:00",
          "end_ts": "2026-02-04T18:00:00+04:00",
          "duration_min": 360,
          "duration_mode": "elapsed",
          "location": {
            "from_location_id": "LOC_YARD_A",
            "to_location_id": "LOC_JETTY_A",
            "route_id": "ROUTE_ALPHA_ROAD",
            "geo_fence_ids": []
          },
          "dependencies": [
            { "pred_activity_id": "A1100", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
            { "resource_kind": "escort", "pool_id": "POOL_ESCORT", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_spmt_move", "params": {} }
          ],
          "notes": "Pinned due to curfew/escort booking."
        },
        "actual": {
          "start_ts": "2026-02-04T12:10:00+04:00",
          "end_ts": null,
          "progress_pct": 60,
          "location_override": null,
          "resource_assignments": [
            { "resource_id": "SPMT_01", "qty": 1 },
            { "resource_id": "ESCORT_01", "qty": 1 },
            { "resource_id": "CREW_SPMT_A", "qty": 1 }
          ],
          "notes": "On route."
        },
        "calc": {
          "es_ts": "2026-02-04T12:00:00+04:00",
          "ef_ts": "2026-02-04T18:00:00+04:00",
          "ls_ts": "2026-02-04T12:00:00+04:00",
          "lf_ts": "2026-02-04T18:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": ["COL_002"],
          "collision_severity_max": "warning",
          "risk_score": 0.55,
          "predicted_end_ts": "2026-02-04T18:30:00+04:00",
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1120": {
        "activity_id": "A1120",
        "type_id": "linkspan_crossing",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001"],
        "title": "Linkspan Crossing TR_001",
        "state": "planned",
        "lock_level": "hard",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "linkspan_slot_confirmation", "stage": "before_ready", "min_count": 1, "required": true, "validity_min": 1440, "tags": ["slot"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [
          { "path": "plan.start_ts", "pin_kind": "fixed", "value": "2026-02-05T02:00:00+04:00", "hardness": "hard", "reason_code": "tide_window" }
        ],
        "plan": {
          "start_ts": "2026-02-05T02:00:00+04:00",
          "end_ts": "2026-02-05T03:30:00+04:00",
          "duration_min": 90,
          "duration_mode": "elapsed",
          "location": {
            "from_location_id": "LOC_JETTY_A",
            "to_location_id": "LOC_JETTY_A",
            "route_id": null,
            "geo_fence_ids": []
          },
          "dependencies": [
            { "pred_activity_id": "A1110", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "linkspan", "resource_id": "LINKSPAN_01", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_MARINE_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "linkspan_capacity", "hardness": "hard", "rule_ref": "linkspan.assets.LINKSPAN_01", "params": {} }
          ],
          "notes": "Pinned to tide window slot."
        },
        "actual": {
          "start_ts": null,
          "end_ts": null,
          "progress_pct": 0,
          "location_override": null,
          "resource_assignments": [],
          "notes": ""
        },
        "calc": {
          "es_ts": "2026-02-05T02:00:00+04:00",
          "ef_ts": "2026-02-05T03:30:00+04:00",
          "ls_ts": "2026-02-05T02:00:00+04:00",
          "lf_ts": "2026-02-05T03:30:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.35,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1130": {
        "activity_id": "A1130",
        "type_id": "barge_transit",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_001"],
        "title": "Barge Transit TR_001 (Jetty → Island Port)",
        "state": "planned",
        "lock_level": "soft",
        "blocker_code": "WX_WINDOW",
        "blocker_detail": { "owner_role": "ops", "eta_to_clear": "2026-02-05T10:00:00+04:00" },
        "evidence_required": [
          { "evidence_type": "barge_stability_calc", "stage": "before_ready", "min_count": 1, "required": true, "validity_min": 10080, "tags": ["marine", "stability"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-05T04:00:00+04:00",
          "end_ts": "2026-02-05T12:00:00+04:00",
          "duration_min": 480,
          "duration_mode": "elapsed",
          "location": {
            "from_location_id": "LOC_JETTY_A",
            "to_location_id": "LOC_ISLAND_PORT",
            "route_id": "ROUTE_ALPHA_MARINE",
            "geo_fence_ids": []
          },
          "dependencies": [
            { "pred_activity_id": "A1120", "type": "fs", "lag_min": 30 }
          ],
          "resources": [
            { "resource_kind": "barge", "resource_id": "BARGE_01", "qty": 1 },
            { "resource_kind": "tug", "pool_id": "POOL_TUG", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_MARINE_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_barge_transit", "params": {} },
            { "kind": "barge_limits", "hardness": "hard", "rule_ref": "barge.assets.BARGE_01", "params": {} }
          ],
          "notes": ""
        },
        "actual": {
          "start_ts": null,
          "end_ts": null,
          "progress_pct": 0,
          "location_override": null,
          "resource_assignments": [],
          "notes": "Blocked pending weather window + stability calc."
        },
        "calc": {
          "es_ts": "2026-02-05T10:00:00+04:00",
          "ef_ts": "2026-02-05T18:00:00+04:00",
          "ls_ts": "2026-02-05T10:00:00+04:00",
          "lf_ts": "2026-02-05T18:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": ["COL_002"],
          "collision_severity_max": "blocking",
          "risk_score": 0.70,
          "predicted_end_ts": "2026-02-05T18:00:00+04:00",
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1200": {
        "activity_id": "A1200",
        "type_id": "crane_lift",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_002"],
        "title": "Load-out TR_002",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "lift_plan", "stage": "before_ready", "min_count": 1, "required": true, "validity_min": 10080, "tags": ["lift"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-04T12:00:00+04:00",
          "end_ts": "2026-02-04T16:00:00+04:00",
          "duration_min": 240,
          "duration_mode": "work",
          "location": { "from_location_id": "LOC_YARD_A", "to_location_id": "LOC_YARD_A", "route_id": null, "geo_fence_ids": [] },
          "dependencies": [
            { "pred_activity_id": "A1020", "type": "fs", "lag_min": 0 },
            { "pred_activity_id": "A1010", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "crane", "pool_id": "POOL_CRANE", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_LIFT_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_crane_lift", "params": {} }
          ],
          "notes": "Potential overlap with TR_001 lift if not reflowed."
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-04T11:30:00+04:00",
          "ef_ts": "2026-02-04T15:30:00+04:00",
          "ls_ts": "2026-02-04T16:30:00+04:00",
          "lf_ts": "2026-02-04T20:30:00+04:00",
          "slack_min": 300,
          "critical_path": false,
          "collision_ids": ["COL_001"],
          "collision_severity_max": "blocking",
          "risk_score": 0.45,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1210": {
        "activity_id": "A1210",
        "type_id": "road_move",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_002"],
        "title": "Road Move TR_002 (Yard → Jetty)",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "gps_track", "stage": "during", "min_count": 1, "required": true, "validity_min": null, "tags": ["tracking"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-04T18:00:00+04:00",
          "end_ts": "2026-02-05T00:00:00+04:00",
          "duration_min": 360,
          "duration_mode": "elapsed",
          "location": { "from_location_id": "LOC_YARD_A", "to_location_id": "LOC_JETTY_A", "route_id": "ROUTE_ALPHA_ROAD", "geo_fence_ids": [] },
          "dependencies": [
            { "pred_activity_id": "A1200", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
            { "resource_kind": "escort", "pool_id": "POOL_ESCORT", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_spmt_move", "params": {} }
          ],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-05T07:00:00+04:00",
          "ef_ts": "2026-02-05T13:00:00+04:00",
          "ls_ts": "2026-02-05T07:00:00+04:00",
          "lf_ts": "2026-02-05T13:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": ["COL_001"],
          "collision_severity_max": "blocking",
          "risk_score": 0.60,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": "RUN_001", "last_apply_run_id": null }
        }
      },

      "A1220": {
        "activity_id": "A1220",
        "type_id": "linkspan_crossing",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_002"],
        "title": "Linkspan Crossing TR_002",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "linkspan_slot_confirmation", "stage": "before_ready", "min_count": 1, "required": true, "validity_min": 1440, "tags": ["slot"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-06T02:00:00+04:00",
          "end_ts": "2026-02-06T03:30:00+04:00",
          "duration_min": 90,
          "duration_mode": "elapsed",
          "location": { "from_location_id": "LOC_JETTY_A", "to_location_id": "LOC_JETTY_A", "route_id": null, "geo_fence_ids": [] },
          "dependencies": [
            { "pred_activity_id": "A1210", "type": "fs", "lag_min": 0 }
          ],
          "resources": [
            { "resource_kind": "linkspan", "resource_id": "LINKSPAN_01", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_MARINE_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "linkspan_capacity", "hardness": "hard", "rule_ref": "linkspan.assets.LINKSPAN_01", "params": {} }
          ],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-06T02:00:00+04:00",
          "ef_ts": "2026-02-06T03:30:00+04:00",
          "ls_ts": "2026-02-06T02:00:00+04:00",
          "lf_ts": "2026-02-06T03:30:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.32,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "A1230": {
        "activity_id": "A1230",
        "type_id": "barge_transit",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_002"],
        "title": "Barge Transit TR_002 (Jetty → Island Port)",
        "state": "planned",
        "lock_level": "soft",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "barge_stability_calc", "stage": "before_ready", "min_count": 1, "required": true, "validity_min": 10080, "tags": ["marine", "stability"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-06T04:00:00+04:00",
          "end_ts": "2026-02-06T12:00:00+04:00",
          "duration_min": 480,
          "duration_mode": "elapsed",
          "location": { "from_location_id": "LOC_JETTY_A", "to_location_id": "LOC_ISLAND_PORT", "route_id": "ROUTE_ALPHA_MARINE", "geo_fence_ids": [] },
          "dependencies": [
            { "pred_activity_id": "A1220", "type": "fs", "lag_min": 30 }
          ],
          "resources": [
            { "resource_kind": "barge", "resource_id": "BARGE_01", "qty": 1 },
            { "resource_kind": "tug", "pool_id": "POOL_TUG", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_MARINE_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_barge_transit", "params": {} },
            { "kind": "barge_limits", "hardness": "hard", "rule_ref": "barge.assets.BARGE_01", "params": {} }
          ],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-06T04:00:00+04:00",
          "ef_ts": "2026-02-06T12:00:00+04:00",
          "ls_ts": "2026-02-06T04:00:00+04:00",
          "lf_ts": "2026-02-06T12:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.50,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "A1240": {
        "activity_id": "A1240",
        "type_id": "road_move",
        "trip_id": "TRIP_2026_02A",
        "tr_ids": ["TR_002"],
        "title": "Final Road Move TR_002 (Island Port → Substation 1)",
        "state": "draft",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": null,
          "end_ts": null,
          "duration_min": 420,
          "duration_mode": "elapsed",
          "location": { "from_location_id": "LOC_ISLAND_PORT", "to_location_id": "LOC_SUBSTATION_1", "route_id": "ROUTE_ISLAND_ROAD", "geo_fence_ids": [] },
          "dependencies": [
            { "pred_activity_id": "A1230", "type": "fs", "lag_min": 60 }
          ],
          "resources": [
            { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
            { "resource_kind": "escort", "pool_id": "POOL_ESCORT", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
          ],
          "constraints": [
            { "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_spmt_move", "params": {} }
          ],
          "notes": "Draft until island route permit confirmed."
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": null,
          "ef_ts": null,
          "ls_ts": null,
          "lf_ts": null,
          "slack_min": null,
          "critical_path": false,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.20,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "B1000": {
        "activity_id": "B1000",
        "type_id": "route_survey",
        "trip_id": "TRIP_2026_02B",
        "tr_ids": ["TR_003"],
        "title": "Route Survey (Trip Beta)",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "route_survey_report", "stage": "after_end", "min_count": 1, "required": true, "validity_min": null, "tags": ["engineering"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-10T09:00:00+04:00",
          "end_ts": "2026-02-10T17:00:00+04:00",
          "duration_min": 480,
          "duration_mode": "work",
          "location": { "from_location_id": "LOC_YARD_A", "to_location_id": "LOC_SUBSTATION_1", "route_id": "ROUTE_BETA_ROAD", "geo_fence_ids": [] },
          "dependencies": [],
          "resources": [{ "resource_kind": "crew", "pool_id": "POOL_SURVEY_CREW", "qty": 1 }],
          "constraints": [],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-10T09:00:00+04:00",
          "ef_ts": "2026-02-10T17:00:00+04:00",
          "ls_ts": "2026-02-10T09:00:00+04:00",
          "lf_ts": "2026-02-10T17:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.22,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "B1100": {
        "activity_id": "B1100",
        "type_id": "spmt_setup",
        "trip_id": "TRIP_2026_02B",
        "tr_ids": ["TR_003"],
        "title": "SPMT Setup TR_003",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "spmt_checklist", "stage": "after_end", "min_count": 1, "required": true, "validity_min": null, "tags": ["spmt"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-11T07:00:00+04:00",
          "end_ts": "2026-02-11T13:00:00+04:00",
          "duration_min": 360,
          "duration_mode": "work",
          "location": { "from_location_id": "LOC_YARD_A", "to_location_id": "LOC_YARD_A", "route_id": null, "geo_fence_ids": [] },
          "dependencies": [{ "pred_activity_id": "B1000", "type": "fs", "lag_min": 0 }],
          "resources": [
            { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
          ],
          "constraints": [],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-11T07:00:00+04:00",
          "ef_ts": "2026-02-11T13:00:00+04:00",
          "ls_ts": "2026-02-11T07:00:00+04:00",
          "lf_ts": "2026-02-11T13:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.25,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "B1110": {
        "activity_id": "B1110",
        "type_id": "crane_lift",
        "trip_id": "TRIP_2026_02B",
        "tr_ids": ["TR_003"],
        "title": "Load-out TR_003",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "lift_plan", "stage": "before_ready", "min_count": 1, "required": true, "validity_min": 10080, "tags": ["lift"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-12T07:00:00+04:00",
          "end_ts": "2026-02-12T11:00:00+04:00",
          "duration_min": 240,
          "duration_mode": "work",
          "location": { "from_location_id": "LOC_YARD_A", "to_location_id": "LOC_YARD_A", "route_id": null, "geo_fence_ids": [] },
          "dependencies": [{ "pred_activity_id": "B1100", "type": "fs", "lag_min": 0 }],
          "resources": [
            { "resource_kind": "crane", "pool_id": "POOL_CRANE", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_LIFT_CREW", "qty": 1 }
          ],
          "constraints": [{ "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_crane_lift", "params": {} }],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-12T07:00:00+04:00",
          "ef_ts": "2026-02-12T11:00:00+04:00",
          "ls_ts": "2026-02-12T07:00:00+04:00",
          "lf_ts": "2026-02-12T11:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.30,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      },

      "B1120": {
        "activity_id": "B1120",
        "type_id": "road_move",
        "trip_id": "TRIP_2026_02B",
        "tr_ids": ["TR_003"],
        "title": "Road Move TR_003 (Yard → Substation 1)",
        "state": "planned",
        "lock_level": "none",
        "blocker_code": null,
        "blocker_detail": {},
        "evidence_required": [
          { "evidence_type": "gps_track", "stage": "during", "min_count": 1, "required": true, "validity_min": null, "tags": ["tracking"] }
        ],
        "evidence_ids": [],
        "reflow_pins": [],
        "plan": {
          "start_ts": "2026-02-12T12:00:00+04:00",
          "end_ts": "2026-02-12T20:00:00+04:00",
          "duration_min": 480,
          "duration_mode": "elapsed",
          "location": { "from_location_id": "LOC_YARD_A", "to_location_id": "LOC_SUBSTATION_1", "route_id": "ROUTE_BETA_ROAD", "geo_fence_ids": [] },
          "dependencies": [{ "pred_activity_id": "B1110", "type": "fs", "lag_min": 0 }],
          "resources": [
            { "resource_kind": "spmt", "pool_id": "POOL_SPMT", "qty": 1 },
            { "resource_kind": "escort", "pool_id": "POOL_ESCORT", "qty": 1 },
            { "resource_kind": "crew", "pool_id": "POOL_SPMT_CREW", "qty": 1 }
          ],
          "constraints": [{ "kind": "wx_window", "hardness": "hard", "rule_ref": "wx.profiles.wx_profile_spmt_move", "params": {} }],
          "notes": ""
        },
        "actual": { "start_ts": null, "end_ts": null, "progress_pct": 0, "location_override": null, "resource_assignments": [], "notes": "" },
        "calc": {
          "es_ts": "2026-02-12T12:00:00+04:00",
          "ef_ts": "2026-02-12T20:00:00+04:00",
          "ls_ts": "2026-02-12T12:00:00+04:00",
          "lf_ts": "2026-02-12T20:00:00+04:00",
          "slack_min": 0,
          "critical_path": true,
          "collision_ids": [],
          "collision_severity_max": null,
          "risk_score": 0.40,
          "predicted_end_ts": null,
          "reflow": { "last_preview_run_id": null, "last_apply_run_id": null }
        }
      }
    }
  },

  "collisions": {
    "COL_001": {
      "collision_id": "COL_001",
      "kind": "resource_overallocated",
      "severity": "blocking",
      "status": "open",
      "trip_id": "TRIP_2026_02A",
      "activity_ids": ["A1100", "A1200", "A1210"],
      "resource_ids": ["CRANE_600T_01", "SPMT_01"],
      "rule_refs": [],
      "message": "Crane/SPMT overlap between TR_001 and TR_002 sequence.",
      "details": {
        "overlap": [
          { "resource_id": "CRANE_600T_01", "from_ts": "2026-02-04T12:00:00+04:00", "to_ts": "2026-02-04T16:00:00+04:00" },
          { "resource_id": "SPMT_01", "from_ts": "2026-02-04T18:00:00+04:00", "to_ts": "2026-02-05T00:00:00+04:00" }
        ],
        "capacity": { "POOL_SPMT": 1, "POOL_CRANE": 1 }
      },
      "suggested_actions": [
        {
          "action_id": "ACT_001",
          "kind": "shift_activity",
          "label": "Shift TR_002 load-out after TR_001 move completes",
          "params": { "activity_id": "A1200", "shift_min": 240 }
        },
        {
          "action_id": "ACT_002",
          "kind": "swap_resource",
          "label": "Use SPMT_02 for TR_002 road move",
          "params": { "activity_id": "A1210", "assign_resource_id": "SPMT_02" }
        },
        {
          "action_id": "ACT_003",
          "kind": "add_standby_activity",
          "label": "Insert standby buffer for TR_002 until SPMT is free",
          "params": { "trip_id": "TRIP_2026_02A", "after_activity_id": "A1200", "duration_min": 180 }
        }
      ]
    },

    "COL_002": {
      "collision_id": "COL_002",
      "kind": "constraint_violation",
      "severity": "blocking",
      "status": "open",
      "trip_id": "TRIP_2026_02A",
      "activity_ids": ["A1110", "A1130"],
      "resource_ids": ["BARGE_01"],
      "rule_refs": ["wx.profiles.wx_profile_barge_transit"],
      "message": "Weather window insufficient for barge transit; reflow required.",
      "details": {
        "profile": "wx_profile_barge_transit",
        "next_window_start_ts": "2026-02-05T10:00:00+04:00",
        "min_window_duration_min": 240
      },
      "suggested_actions": [
        {
          "action_id": "ACT_010",
          "kind": "shift_activity",
          "label": "Snap barge transit to next WX window",
          "params": { "activity_id": "A1130", "snap_to": "next_window" }
        },
        {
          "action_id": "ACT_011",
          "kind": "add_standby_activity",
          "label": "Insert weather standby before barge transit",
          "params": { "trip_id": "TRIP_2026_02A", "after_activity_id": "A1120", "duration_min": 360 }
        }
      ]
    }
  },

  "reflow_runs": [
    {
      "run_id": "RUN_001",
      "mode": "preview",
      "requested_at": "2026-02-01T12:30:00+04:00",
      "requested_by": "user:planner",
      "baseline_id": "BASELINE_001",
      "seed": {
        "reason": "date_cursor_changed",
        "cursor_ts": "2026-02-01T12:30:00+04:00",
        "focus_trip_id": "TRIP_2026_02A"
      },
      "proposed_changes": [
        {
          "activity_id": "A1130",
          "path": "plan.start_ts",
          "from": "2026-02-05T04:00:00+04:00",
          "to": "2026-02-05T10:00:00+04:00",
          "reason_code": "wx_window_snap"
        }
      ],
      "applied_changes": [],
      "collision_summary": { "blocking": 2, "warning": 0, "info": 0 }
    }
  ],

  "baselines": {
    "current_baseline_id": "BASELINE_001",
    "items": {
      "BASELINE_001": {
        "baseline_id": "BASELINE_001",
        "name": "Client Approved Rev1",
        "status": "active",
        "created_at": "2026-02-01T10:00:00+04:00",
        "created_by": "user:pm",
        "scope": { "trip_ids": ["TRIP_2026_02A"] },
        "freeze_policy": {
          "lock_level_on_apply": "baseline",
          "frozen_fields": [
            "entities.activities.*.plan.start_ts",
            "entities.activities.*.plan.end_ts",
            "entities.activities.*.plan.dependencies",
            "entities.activities.*.plan.constraints",
            "entities.trs.*.spec.weight_t",
            "entities.trs.*.spec.cog_mm"
          ],
          "allow_actual_updates": true,
          "allow_evidence_add": true,
          "allow_notes_add": true,
          "override_roles": ["admin", "pm"]
        },
        "snapshot": {
          "captured_at": "2026-02-01T10:00:00+04:00",
          "entities": {
            "activities_plan": {
              "A1000": { "start_ts": "2026-02-02T09:00:00+04:00", "end_ts": "2026-02-02T17:00:00+04:00" },
              "A1020": { "start_ts": "2026-02-03T08:00:00+04:00", "end_ts": "2026-02-03T12:00:00+04:00" },
              "A1110": { "start_ts": "2026-02-04T12:00:00+04:00", "end_ts": "2026-02-04T18:00:00+04:00" },
              "A1120": { "start_ts": "2026-02-05T02:00:00+04:00", "end_ts": "2026-02-05T03:30:00+04:00" },
              "A1130": { "start_ts": "2026-02-05T04:00:00+04:00", "end_ts": "2026-02-05T12:00:00+04:00" }
            },
            "trs_spec": {
              "TR_001": { "weight_t": 310.0, "cog_mm": { "x": 0, "y": 0, "z": 2100 } },
              "TR_002": { "weight_t": 295.0, "cog_mm": { "x": 50, "y": -20, "z": 2050 } }
            }
          },
          "hash": {
            "algo": "sha256",
            "value": "b3f9d0d0b7a1f2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7"
          }
        }
      }
    }
  },

  "history_events": [
    {
      "event_id": "HE_0001",
      "ts": "2026-02-01T10:00:00+04:00",
      "actor": "user:pm",
      "event_type": "baseline_activated",
      "entity_ref": { "entity_type": "baseline", "entity_id": "BASELINE_001" },
      "details": { "scope_trip_ids": ["TRIP_2026_02A"] }
    },
    {
      "event_id": "HE_0002",
      "ts": "2026-02-01T12:30:00+04:00",
      "actor": "user:planner",
      "event_type": "reflow_previewed",
      "entity_ref": { "entity_type": "reflow_run", "entity_id": "RUN_001" },
      "details": { "cursor_ts": "2026-02-01T12:30:00+04:00" }
    }
  ],

  "ui_defaults": {
    "view_mode": "live",
    "risk_overlay": "all",
    "map": { "show_route_segments": true, "show_tr_labels": true },
    "timeline": { "show_dependencies": true, "show_slack": true, "show_collisions": true }
  }
}
```

---

원하시면 다음을 “즉시 확장”할 수 있습니다(추가 질문 없이 진행 가능):

* `activity_types`를 **귀사 실제 작업분류 코드(ERP/OPS Code)로 1:1 매핑**한 최종본
* `constraint_rules`의 기준치를 **귀사 운영 기준치(풍속/파고/슬롯 운영/허용 하중/permit lead time)**로 더 구체화
* `validate_optionc.py`가 검사할 **정확한 JSON Schema(draft-2020-12)**까지 함께 제공
