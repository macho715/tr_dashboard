# TR Dashboard — patchm1 Implementation Plan

> **SSOT**: patchm1.md  
> **목표**: 불필요 UI 제거 + 운영 입력/보고 체계 강화 + 비교/리포트 UX 강화  
> **생성**: 2026-02-02

---

## 1. 요구사항 → 작업 매핑

| # | 요구사항 | 작업 ID | 우선순위 |
|---|----------|---------|----------|
| 1 | BulkAnchors(/bulk) 기본 화면 제거 | T1 | P0 |
| 2 | History/Evidence 사용자 입력 + SSOT 저장 | T2 | P0 |
| 3 | Original vs 변경 Plan 비교(Diff 패널) | T3 | P0 |
| 4 | 항차 종료 시 Trip Report 자동 생성 + Export | T4 | P0 |
| 5 | 다음 항차 Readiness 패널 | T5 | P1 |
| 6 | 추가 아이디어(P0~P2) | T6 | P2 |

---

## 2. Phase 1 — Structural (구조 변경 우선)

### T1-S: BulkAnchors 기본 숨김 [structural]

**목적**: Live/History/Approval/Compare 기본 화면에서 Bulk Anchors 영역 제거.

**수정 포인트**:
- `components/ops/AgiOpsDock.tsx`
  - Bulk Anchors 섹션(라인 172~201)을 `showBulkAnchors` prop으로 제어
  - 기본값 `false` → 기본 화면에서 미노출
- `components/dashboard/sections/overview-section.tsx`
  - `AgiOpsDock`에 `showBulkAnchors={false}` 전달(또는 생략 시 기본 숨김)

**대안(선택)**: Ops Tools Drawer로 이동 — Command bar `/tools`로 접근. 기본 UI 노출 0.

**검증**: 기본 대시보드에서 "Bulk Anchors (for /bulk)" 영역 미표시.

---

### T2-S: SSOT 계약 확장(타입 정의) [structural]

**목적**: patchm1 §3 데이터 계약을 TypeScript 타입으로 반영.

**수정 포인트**:
- `src/types/ssot.ts`
  - `baselines`, `history_events`, `evidence_items`, `trip_closeouts`, `reports` 타입 추가
  - `Trip.closeout`, `Trip.baseline_id_at_start`, `Trip.milestones` 추가
  - `EvidenceItem`, `HistoryEvent`, `TripCloseout`, `TripReport`, `ProjectReport` 인터페이스
- `option_c.json` 스키마(또는 검증 스크립트) 업데이트

**enum 확장** (patchm1 §3.2):
- `state`: `done` 추가 (현재 `completed`와 매핑 검토)
- `blocker_code`: `PTW_MISSING | CERT_MISSING | WX_NO_WINDOW | LINKSPAN_LIMIT | BARGE_LIMIT | RESOURCE_CONFLICT | MANUAL_HOLD`

**검증**: `pnpm typecheck` 통과, 기존 타입 호환 유지.

---

### T3-S: Compare Diff 패널 골격 [structural]

**목적**: Compare 모드에서 baseline vs current diff 표시용 패널 추가.

**수정 포인트**:
- `components/detail/` 또는 `components/compare/`
  - `CompareDiffPanel.tsx` 신규: Activity ID, Baseline(start/end), Current(start/end), Δminutes, Changed fields, Why 링크
- `HistoryEvidencePanel` 탭 확장: `Detail | Evidence | History | Compare Diff | Trip Closeout/Report`
- `lib/compare/` 또는 `lib/baseline/`: baseline vs current diff 계산 유틸

**검증**: Compare 모드에서 Diff 탭 클릭 시 빈 표(또는 placeholder) 표시.

---

## 3. Phase 2 — Behavioral (기능 구현)

### T1-B: BulkAnchors Ops Drawer 옵션 [behavioral]

**목적**: `/tools` 또는 설정으로 Bulk Anchors 접근 경로 제공(선택).

**수정 포인트**:
- `AgiCommandBar`: `/tools` 명령 추가 → Ops Drawer 토글
- Ops Drawer 내부에 Bulk Anchors 섹션 포함, 기본 닫힘

---

### T2-B: History/Evidence 입력 + Trip Closeout 저장 [behavioral]

**목적**: Trip Closeout 시 운영자 요약/지연사유/첨부증빙 입력 → SSOT 누적.

**수정 포인트**:
- `components/history/HistoryEvidencePanel.tsx`
  - 탭: `Detail | Evidence | History | Compare Diff | Trip Closeout/Report`
  - `TripCloseoutForm`: summary_md, delay_reason_codes, delay_details, evidence_ids 입력
- `components/evidence/EvidenceTab.tsx`: 사용자 직접 입력(텍스트/링크) + 저장
- API 또는 클라이언트: `trip_closeouts.items[TC]` 생성, `history_events` 추가

**트리거** (patchm1 §5.1):
- jackdown `state=done` AND `actual.end_ts != null` → `trips[V].closeout.status = "required"`
- Closeout 저장 → `trip_closeouts` 생성, `reports.trip_reports` 자동 생성

---

### T3-B: Compare Diff 데이터 연동 [behavioral]

**목적**: baseline snapshot vs 현재 plan diff를 표로 표시.

**수정 포인트**:
- `lib/baseline/baseline-compare.ts` (또는 유사): `computeActivityDiff(baseline, current)` 
- `CompareDiffPanel`: diff 결과 테이블 렌더링
- Gantt: baseline bar = thin ghost, current bar = solid, 변경 Activity = ● + 색상

---

### T4-B: Trip Report 자동 생성 + Export [behavioral]

**목적**: Closeout 저장 시 Trip Report(JSON+MD) 자동 생성 및 다운로드.

**수정 포인트**:
- `lib/reports/` (신규): `generateTripReport(closeoutId, ssot)` → `TripReport` 객체
- `reports.trip_reports[RPT_Vxxx]` 자동 생성: milestones, delay_minutes, evidence_completeness
- Export 버튼: JSON + MD 다운로드

---

### T5-B: Next Trip Readiness 패널 [behavioral]

**목적**: 다음 48~72h 크리티컬 태스크/필수 증빙/제약 체크리스트.

**수정 포인트**:
- `components/dashboard/ReadinessPanel.tsx` (신규)
  - 다음 항차 마일스톤 계획일
  - D-2~D0 필수 증빙 누락(PTW/CERT/INSPECTION)
  - Weather/LINKSPAN/BARGE 충족 여부
  - 자원 충돌 위험 + 해결 추천

---

## 4. 실행 순서 (TDD 권장)

```
1. T1-S (BulkAnchors 숨김)     → 즉시 적용 가능, 영향 최소
2. T2-S (SSOT 타입 확장)      → T2-B, T4-B 의존
3. T3-S (Diff 패널 골격)      → T3-B 의존
4. T2-B (Closeout 입력/저장)  → T4-B 의존
5. T4-B (Trip Report 생성)   → T2-B 완료 후
6. T3-B (Diff 데이터 연동)    → T3-S 완료 후
7. T5-B (Readiness 패널)      → 독립
```

---

## 5. 파일 터치맵

| 파일 | T1-S | T2-S | T3-S | T2-B | T3-B | T4-B | T5-B |
|------|------|------|------|------|------|------|------|
| `components/ops/AgiOpsDock.tsx` | ● | | | | | | |
| `components/dashboard/sections/overview-section.tsx` | ● | | | | | | |
| `src/types/ssot.ts` | | ● | | | | | |
| `components/history/HistoryEvidencePanel.tsx` | | | ● | ● | | | |
| `components/evidence/EvidenceTab.tsx` | | | | ● | | | |
| `components/compare/CompareDiffPanel.tsx` (신규) | | | ● | | ● | | |
| `lib/baseline/baseline-compare.ts` | | | | | ● | | |
| `lib/reports/` (신규) | | | | | | ● | |
| `components/dashboard/ReadinessPanel.tsx` (신규) | | | | | | | ● |

---

## 6. Tests (plan.md 규약)

- [ ] test: BulkAnchors hidden by default when showBulkAnchors=false (file: components/ops/__tests__/AgiOpsDock.test.tsx)
- [ ] test: TripCloseoutForm submits and creates trip_closeouts item (file: components/history/__tests__/TripCloseoutForm.test.tsx)
- [ ] test: computeActivityDiff returns correct delta for changed activities (file: lib/baseline/__tests__/baseline-compare.test.ts)
- [ ] test: generateTripReport produces valid TripReport with milestones and evidence_completeness (file: lib/reports/__tests__/trip-report.test.ts)

---

## 7. DoD (Definition of Done)

- [ ] BulkAnchors 기본 화면에서 미노출
- [ ] Trip Closeout 입력 → SSOT 저장 → History 이벤트 기록
- [ ] Compare Diff 패널에서 변경 Activity 2클릭 내 확인
- [ ] Trip Report(JSON+MD) Export 동작
- [ ] Readiness 패널(48~72h 체크리스트) 표시
- [ ] `pnpm typecheck` + `pnpm test` 통과
- [ ] AGENTS.md SSOT/Preview→Apply/History append-only 준수

---

## 8. 참조

- **patchm1.md** (요구사항 SSOT)
- **AGENTS.md** (불변조건)
- **tr-dashboard-patch** skill (UI/UX 규칙)
- **option_c.json** (데이터 SSOT)
