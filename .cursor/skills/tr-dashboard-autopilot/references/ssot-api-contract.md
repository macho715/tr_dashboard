# SSOT API Contract (Single Response) — v1 (User Doc Aligned)

목적:
- FE가 "한 번에 렌더링" 하도록 Trip/TR/Activities/파생 요약을 단일 응답으로 제공
- SSOT는 option_c.json이지만, API는 조회 모델(Read Model)

## 필수 상위 키
- ssot_version (string)
- generated_at (ISO, TZ=Asia/Dubai)
- mode: live | history | approval | compare
- trip (object)
- trs (array)
- activities (array)

## trip 최소 필드
- trip_id, name, timezone
- status(파생): in_progress 등(저장 강제 아님)
- resources(참조): spmt_sets/barges/crews 등

## trs 최소 필드
- tr_id, label
- weight_t, cog_mm, dimensions_mm
- current_location (live일 때만 권장)
- active_activity_id, activity_ids

## activities 최소 필드(조회 모델)
- activity_id, tr_id, name, type
- location (site_id + lat/lon + geofence_id 권장)
- plan { start, finish, duration_min }
- actual { start, finish }
- status(or state): in_progress 등
- dependencies[]: { pred, type(FS/SS/FF/SF), lag_min }
- constraints: weather_window, ptw, certificates, linkspan, barge
- resources: spmt_set_id, barge_id, crew_id
- risk: risk_level, drivers[], notes
- evidence:
  - required_types[]
  - items[]: { evidence_id, type, uri, captured_at, captured_by, hash_sha256 }
  - missing_required[]
- history[]: { event_id, timestamp, actor, action, summary, ... }
- source: { system:"option_c.json", revision, last_updated }

## Compare 모드 규칙
- C(option_c.json)만 SSOT
- A/B는 delta overlay로만 반환(저장 시 SSOT 불변)
