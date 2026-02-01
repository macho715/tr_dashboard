# SSOT Rules (option_c.json) — Updated

## 1) 상태값(권장)
우선 권장(운영 룰북 기반):
- DRAFT, PLANNED, COMMITTED, READY, IN_PROGRESS, PAUSED, BLOCKED, COMPLETED, VERIFIED, CANCELLED, ABORTED

(레포에 이미 ACTIVE/DONE/SKIPPED가 존재할 수 있음. 이 경우 validator는 alias로 허용하되,
SSOT 표준화(Option A)에서 위 값으로 정리 권장)

## 2) 시간 필드(허용 형태)
- Plan: plan.start/finish 또는 planned.start/end
- Actual: actual.start/finish 또는 actual.start/end 또는 actual_start/actual_end(legacy)

## 3) Freeze 규칙(필수)
- state ∈ {IN_PROGRESS, PAUSED, COMPLETED, VERIFIED, ABORTED} 이면 plan 이동 금지(특히 actual 존재 시 절대)
- actual.start 존재 → 시작 이동 금지
- actual.end 존재 → 종료 이동 금지

## 4) History 규칙(내부 정합성)
- history[] 또는 state_history[]는 배열이어야 함
- 삭제/수정 "증명"은 스냅샷 없이는 불가하므로,
  validator는 "내부 정합성"만 점검(타임스탬프/타입/필수 키 유무)

## 5) Evidence 규칙(권장)
- evidence.required_types + missing_required(또는 evidence_required + evidence 상태)가 있으면 정합성 검사 수행
- VERIFIED 전 Evidence 완비 정책은 앱/엔진에서 게이트로 강제
