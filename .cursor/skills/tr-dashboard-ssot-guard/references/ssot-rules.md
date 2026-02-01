# SSOT Rules 요약

## option_c.json 최소 규칙(검증 대상)
- activities[]는 고유 activity_id 필수
- state는 허용 집합만: DRAFT/PLANNED/COMMITTED/READY/IN_PROGRESS/PAUSED/BLOCKED/COMPLETED/VERIFIED/CANCELLED/ABORTED
- actual_start 존재 시: IN_PROGRESS/PAUSED/COMPLETED/VERIFIED 중 하나여야 함
- actual_end 존재 시: COMPLETED/VERIFIED여야 함
- history[]는 append-only 이벤트 배열로 간주(내부 정합성 검사만 수행)

## Reflow 안전 규칙(정합성)
- IN_PROGRESS/PAUSED/COMPLETED/VERIFIED/ABORTED는 Freeze(이동 금지)
- Preview 결과는 Apply 전까지 SSOT를 변경하지 않음
