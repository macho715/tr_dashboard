# Collision Taxonomy (Contract v0.8.0)

## kind(고정)
- dependency_cycle (blocking)
- dependency_violation (blocking)
- constraint_window_violation (보통 blocking)
- resource_overallocated (보통 blocking)
- resource_unavailable (blocking)
- spatial_conflict (정책)
- baseline_conflict (blocking)
- data_incomplete (blocking)
- risk_hold (blocking, 승인으로만 해제)

## severity(고정)
- blocking: 수행 불가
- major: 수행 가능하나 즉시 조치 필요
- minor: 경고/모니터링

## suggested_actions.action(고정)
- wait
- resource_swap
- split_activity
- dependency_change
- relax_constraint
- baseline_update

## 2-click root cause 최소요건
collision 객체는 반드시 포함:
- kind, severity, message
- time_range, resource_ids, activity_ids
- suggested_actions[] (최소 1개)
