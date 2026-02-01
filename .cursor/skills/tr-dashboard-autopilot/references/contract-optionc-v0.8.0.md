# option_c.json Contract — v0.8.0 (문서 기준 고정)

본 문서는 "option_c.json을 그대로 넣을 수 있는" SSOT 계약이다.
SSOT의 권위는 entities.activities에 있으며, Reflow/Collision/Baseline은 동일 파일 내 레지스트리로 관리한다.

## 1) Top-level 구조(필수)

- schema: { name, version, scenario_id, timezone }
- policy: { view_modes[], reflow{ snap_direction, tie_break[], calendar_granularity_min } }
- catalog:
  - enums: activity_state[], lock_level[], dependency_type[], evidence_stage[], collision_severity[], collision_kind[]
  - blocker_codes{}, evidence_types{}, activity_types{}, constraint_rules{}, resources{}
- entities:
  - trips{}, trs{}, activities{}
- collisions: {} (전역 레지스트리)
- reflow_runs: [] (감사용)
- baselines: { current_baseline_id, items{} }
- history_events: [] (전역 이벤트 타임라인)

## 2) enums(필수 값 고정)

activity_state:
- draft, planned, ready, in_progress, paused, blocked, done, verified, cancelled

lock_level:
- none, soft, hard, baseline

dependency_type:
- FS, SS, FF, SF

evidence_stage:
- before_start, before_complete, after_complete

collision_severity:
- minor, major, blocking

collision_kind:
- dependency_cycle
- dependency_violation
- constraint_window_violation
- resource_overallocated
- resource_unavailable
- spatial_conflict
- baseline_conflict
- data_incomplete
- risk_hold

## 3) Activity 필드(필수 키)

entities.activities.<id>는 반드시 포함:
- activity_id, trip_id, tr_id, type, title
- state (activity_state)
- lock_level (lock_level)
- reflow_pins: string[]
- blocker_code: catalog.blocker_codes key (예: NONE, PTW_MISSING...)
- blockers: array
- location: { site_id, geo{lat,lon} }
- plan: { start_ts, duration_min, end_ts, priority }
- actual: { start_ts, end_ts, progress_pct }
- dependencies: [{ type, from_activity_id, lag_min }]
- constraints: [{ kind, params }]
- resources:
  - required: [{ resource_type, qty, must_be_continuous }]
  - assigned: [{ resource_id, resource_type, qty }]
- evidence_required: [{ evidence_type, stage, min_count, label }]
- evidence: []
- calc:
  - es_ts/ef_ts/ls_ts/lf_ts
  - total_float_min/free_float_min
  - is_critical_path
  - reflow_shift_min
  - collision_ids[], collision_count
  - slack_bucket (none/low/ok/unknown)

## 4) Baseline(필수)

baselines:
- current_baseline_id: string|null
- items.<baseline_id>:
  - baseline_id, trip_id, label, status
  - created_at_ts, created_by{role,user_id}
  - approved_at_ts, approvers[]
  - freeze_policy{ lock_level_on_apply, frozen_fields[] }
  - snapshot{ trs{}, activities{} }
  - snapshot_hash_sha256

Approval 모드 규칙:
- view_mode=approval: plan 편집 금지
- frozen_fields 변경 시 collision_kind=baseline_conflict 처리
- 변경 필요 시 CR + 신규 baseline 생성 흐름만 허용

## 5) Collision 레지스트리(권장)

collisions.<collision_id>:
- collision_id, kind, severity, message
- time_range{start_ts,end_ts}
- resource_ids[], activity_ids[]
- suggested_actions[]:
  - action: wait | resource_swap | split_activity | dependency_change | relax_constraint | baseline_update
  - target_activity_id, delta_min, candidate_resource_ids 등

## 6) Reflow Runs(필수 기록)

reflow_runs[]:
- run_id, ts, trip_id, cursor_ts, policy_snapshot
- changed_activity_ids[]
- created_collision_ids[], resolved_collision_ids[]
- summary{ shift_total_min, blocking_count, major_count, minor_count }
