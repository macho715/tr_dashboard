# Operational Runbook — State / Reflow / Collision (Contract v0.8.0 반영)

## A) Activity 상태 머신(소문자 state 고정)

state:
- draft → planned → ready → in_progress → done → verified
- in_progress ↔ paused
- planned/ready/in_progress/paused → blocked
- planned/ready → cancelled
- in_progress/paused/blocked → cancelled(중단 승인)

blocked vs paused:
- paused: 운영 의사결정(현장)
- blocked: 요건 미충족(PTW/Weather/Certificate/Resource) — 시스템 강신호

## B) Allowed transitions(요약)

- draft→planned: plan.duration_min + resources.required 최소 1개 + constraints 유효
- planned→ready: 선행 done/verified + PTW/CERT OK + evidence_required(before_start) 충족
- ready→in_progress: actual.start_ts 입력 + before_start evidence 충족
- in_progress→paused: pause_reason 필수(로그)
- paused→in_progress: blocker 없을 때만
- *→blocked: 조건 불충족 감지 또는 수동 설정 + blocker_code 세팅
- blocked→ready: blocker 해소 + 선행조건 충족
- in_progress→done: actual.end_ts + before_complete evidence 충족
- done→verified: after_complete + 서명/검증 충족
- verified 역전이 금지(예외: CR + 신규 baseline)

하드룰:
- blocked에서 done으로 직접 전이 금지
- lock_level=baseline인 Activity의 plan.* 변경은 CR 없이 금지

## C) Reflow (Topological + Constraint Snap + Resource Calendar)

Trigger(MUST):
1) date_cursor_ts 변경
2) plan/dependencies/constraints/resources 변경
3) resource calendar 변경
4) state가 done/verified/cancelled로 변경
5) weather window 업데이트
6) baseline 승인/적용(잠금 정책 변경)

Algorithm(결정론):
0) Fail-fast: 필수 필드 + DAG cycle + baseline_conflict 검사
1) Topological sort (tie-break: priority, plan.start_ts, activity_id)
2) Forward pass:
   - deps 반영(FS/SS/FF/SF+lag)
   - lock_level/reflow_pins 반영
   - constraint snap(순서 고정): time/permit → weather → resource calendar → location access
   - resource 동시 가용 최초 연속 슬롯 배치
   - calc.es_ts/ef_ts 기록
3) Backward pass:
   - due_ts 또는 final milestone 기준으로 ls/lf
   - slack(total/free)은 "가용시간(min)" 기준
4) Collision 산출(3.C taxonomy) + calc.collision_ids/collision_count 갱신
5) Preview→Apply:
   - Apply 시: plan 업데이트 + reflow_runs[] 기록 + history_events 기록

## D) Collision 2-click UX 계약

- Click 1: Gantt/Map 충돌 선택 → Detail에 collision 카드 표시
- Click 2: 해결 옵션 선택(wait/resource_swap/...) → Reflow 자동 재실행(정책 허용 시)
  - blocking 충돌은 자동 적용 금지(제안만)
