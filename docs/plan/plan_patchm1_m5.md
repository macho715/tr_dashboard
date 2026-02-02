# TR Dashboard — patchm1~m5 통합 구현 계획

> **SSOT**: patchm1.md, patchm2.md, patchm3.md, patchm4.md, patchm5.md  
> **목표**: 불필요 UI 제거(Upload/BulkAnchors) + 운영 입력/보고 체계 강화 + SSOT Upgrade v1.0  
> **생성**: 2026-02-02

---

## 1. patch별 역할 요약

| patch | 역할 | 핵심 내용 |
|-------|------|-----------|
| **patchm1** | 요구사항·데이터 계약 | BulkAnchors, History/Evidence, Plan Diff, Trip Report, Readiness, option_c.json 스키마 |
| **patchm2** | Agent Prompt | Upload 제거, SSOT Upgrade, PR#1~#5, Hard Rules, Storage 전략 |
| **patchm3** | 요구사항 (m1 동일) | patchm1과 동일 |
| **patchm4** | Repo 스캔·제거 전략 | Upload 경로 목록, **완전 삭제** 권장, PR#1 스캐폴딩, /optimize 프롬프트 |
| **patchm5** | Upload 분석·PR#1 | Upload 코드 경로 표, flag OFF vs 완전 제거, PR#1 변경 파일·Verify |

---

## 2. 요구사항 통합 매트릭스

| # | patchm1/m3 | patchm2 | patchm4/m5 | 통합 작업 | 우선순위 |
|---|------------|---------|------------|-----------|----------|
| 1 | BulkAnchors 제거 | — | — | T1: BulkAnchors 숨김 | P0 |
| 2 | — | Upload 제거 | **완전 삭제** 권장 | T2: Upload dead-path 제거 | P0 |
| 3 | History/Evidence 입력 | append-only | PR#2에서 링크 입력 대체 | T3: History/Evidence 입력+저장 | P0 |
| 4 | Plan Diff | + audit meta | — | T4: Compare Diff 패널 | P0 |
| 5 | Trip Report | Report Source + Export | — | T5: Trip Report 생성+Export | P0 |
| 6 | Readiness | Readiness | — | T6: Readiness 패널 | P1 |

---

## 3. Repo Scan — Upload Inventory (patchm4 §1, patchm5 §1 통합)

| path | type | purpose | remove strategy |
|------|------|---------|-----------------|
| `components/evidence/EvidenceUploadModal.tsx` | component | file input + simulate upload, `onConfirm` | **삭제** (patchm4) 또는 **교체** (링크 입력 모달) |
| `components/evidence/EvidenceTab.tsx` | component | `onUploadClick`, `canUpload`, Upload 버튼 | Upload CTA 제거, PR#2에서 "Add link" 추가 |
| `components/history/HistoryEvidencePanel.tsx` | component | `EvidenceUploadModal`, `handleUploadClick`, `modalOpen`, `evidenceOverlay` | Upload 관련 state/callback 제거 |
| `src/lib/stores/view-mode-store.tsx` | store | `canUploadEvidence` (live=true) | **flag OFF** (patchm5) 또는 제거 후 `canAddEvidence` |
| `app/api/ssot/route.ts` | route | SSOT 읽기 | Upload API 없음 — 영향 없음 |

**Decision Log** (patchm4 §2, patchm5 §2 통합):

| Date | Context | Options | Decision | Rationale |
|------|---------|---------|----------|------------|
| 2026-02-02 | Upload 제거 | Hard delete vs Flag OFF vs Replace | **Path A (권장)**: 완전 삭제 + PR#2에서 링크 입력 신규 | patchm4: dead code 제거 일관, PR#2에서 Evidence 링크 UI로 공백 메움 |
| 2026-02-02 | — | — | **Path B (대안)**: EvidenceUploadModal → EvidenceLinkModal 교체 | 동일 컴포넌트 내 file→URL 입력으로 변경, PR#1에서 한 번에 처리 |

---

## 4. PR 단위 계획 (patchm2 §6, patchm4 §3, patchm5 §3 통합)

### PR#1 (Structural) — Upload 제거 + BulkAnchors 숨김

**목적**: Upload UI/라우트/컴포넌트 0 노출, BulkAnchors 기본 숨김, lint/build/test 통과

**Path A (patchm4/m5 권장 — 완전 삭제)**:
- **삭제**: `components/evidence/EvidenceUploadModal.tsx`
- **수정**:
  - `components/evidence/EvidenceTab.tsx` — `onUploadClick`, `canUpload` 제거, Upload 버튼 삭제
  - `components/history/HistoryEvidencePanel.tsx` — `EvidenceUploadModal` import/state/렌더 제거, `handleUploadClick`, `evidenceOverlay` 제거
  - `src/lib/stores/view-mode-store.tsx` — `canUploadEvidence: false` 고정 (또는 제거)
  - `components/ops/AgiOpsDock.tsx` — Bulk Anchors `showBulkAnchors` prop, 기본 `false`
  - `components/dashboard/sections/overview-section.tsx` — `showBulkAnchors={false}` (또는 생략)

**Path B (교체)**:
- `EvidenceUploadModal.tsx` → `EvidenceLinkModal.tsx` (file input → URL/링크 입력)
- `EvidenceTab.tsx` — "Upload" → "Add link", `onAddEvidence`
- 나머지 동일

**Verify** (patchm5 §3):
```bash
pnpm install
pnpm lint
pnpm typecheck   # 또는 npm run typecheck
pnpm test
pnpm build
```

**Rollback**: PR revert

---

### PR#2 (Structural) — SSOT 타입 확장

**목적**: patchm1 §3 + patchm2 §3 데이터 계약을 TypeScript 타입으로 반영

**변경 파일**: `src/types/ssot.ts` — baselines, history_events, evidence_items, trip_closeouts, reports, Trip.closeout, Trip.milestones, EvidenceItem, HistoryEvent, TripCloseout, TripReport, blocker_code enum

---

### PR#3 (Behavioral) — History/Evidence 입력 + 저장 (append-only)

**목적**: Trip 단위 History/Evidence 사용자 입력 + SSOT 저장 (append-only)

**Evidence 입력** (patchm4: PR#2에서 링크 입력 대체):
- "Add link" 버튼 → URL/경로 입력 폼 → `evidence_items` append
- kind: PHOTO|PDF|EMAIL|WHATSAPP|LINK|OTHER (url_or_path, note)

**Storage**: Client-side persistence (localStorage/IndexedDB) — patchm2 §3 Option A

---

### PR#4 (Behavioral) — Plan Diff + Compare Diff 패널

**목적**: Original Plan(immutable) vs Current Plan Diff + audit meta

**Diff 분류** (patchm2 AC3): shift / add / remove / change

---

### PR#5 (Behavioral) — Trip Report Source + Export

**목적**: Trip 완료 시 Report Source 생성 + Export(md/json), deterministic

**Deterministic** (patchm2 §9): 정렬 기준 고정(occurred_at asc, activity_id asc), Markdown 템플릿 고정

---

### PR#6 (Polish) — Next Trip Readiness 패널

**목적**: 48~72h 체크리스트, Ready/Not Ready 배지, 근거 deep-link

---

## 5. 실행 순서

```
1. PR#1 (Upload 제거 + BulkAnchors 숨김)  → 즉시
2. PR#2 (SSOT 타입 확장)                  → PR#3, #4, #5 의존
3. PR#3 (History/Evidence 저장)           → PR#5 의존
4. PR#4 (Compare Diff)                   → PR#2 의존
5. PR#5 (Trip Report)                    → PR#3 완료 후
6. PR#6 (Readiness)                      → 독립
```

---

## 6. 파일 터치맵 (Path A 기준)

| 파일 | PR#1 | PR#2 | PR#3 | PR#4 | PR#5 | PR#6 |
|------|------|------|------|------|------|------|
| `EvidenceUploadModal.tsx` | **삭제** | | | | | |
| `EvidenceTab.tsx` | ● | | ● | | | |
| `HistoryEvidencePanel.tsx` | ● | | ● | ● | | |
| `view-mode-store.tsx` | ● | | | | | |
| `AgiOpsDock.tsx` | ● | | | | | |
| `overview-section.tsx` | ● | | | | | |
| `src/types/ssot.ts` | | ● | | | | |
| `EvidenceLinkModal.tsx` (신규, PR#3) | | | ● | | | |
| `CompareDiffPanel.tsx` (신규) | | | | ● | | |
| `lib/baseline/baseline-compare.ts` | | | | ● | | |
| `lib/reports/` (신규) | | | | | ● | |
| `TripCloseoutForm.tsx` (신규) | | | | | ● | |
| `ReadinessPanel.tsx` (신규) | | | | | | ● |
| `lib/store/trip-store.ts` (신규) | | | ● | | | |

---

## 7. Acceptance Criteria (patchm2 §5)

- [x] **AC1 Upload 제거**: Upload UI 0 노출, build/test/deploy OK (PR#1 완료 2026-02-02)
- [x] **AC2 History append-only**: 입력 후 새로고침/재접속에도 유지 (PR#3 localStorage)
- [x] **AC3 Plan Diff**: shift/add/remove/change 정확히 분류 (PR#4 CompareDiffPanel)
- [x] **AC4 Trip Report**: md/json export 재현 가능 (PR#5 TripCloseoutForm)
- [x] **AC5 Readiness**: NOT READY 사유 클릭 시 근거 추적 가능 (PR#6 ReadinessPanel)

---

## 8. Hard Rules (patchm2 §0)

- Plan Baseline = immutable
- History = append-only
- Vercel 배포: build/test/lint PR마다 통과
- 되돌릴 수 없는 변경 시 Rollback 절차 명시
- 민감정보/실데이터 노출 금지

---

## 9. /optimize 프롬프트 (patchm4 §4 요약)

PR#1~#5 실행 시 참조할 에이전트 프롬프트 핵심:

1. **Scan first**: Upload 관련 경로 출력
2. **Impact + Strategy**: OFF vs 삭제 결정
3. **PR#1 scaffolding**: 변경 파일, Verify, Rollback

---

## 10. Tests (plan.md 규약)

- [ ] test: BulkAnchors hidden by default
- [ ] test: EvidenceTab has no Upload button after PR#1
- [ ] test: EvidenceLinkModal (or Add link flow) creates EvidenceItem with uri
- [ ] test: History append-only — no edit/delete UI
- [ ] test: computeActivityDiff returns correct delta
- [ ] test: generateTripReport deterministic output

---

## 11. 참조

- **patchm1.md**, **patchm3.md** — 요구사항·데이터 계약
- **patchm2.md** — Agent Prompt, Hard Rules
- **patchm4.md** — Repo 스캔, 완전 삭제 권장, /optimize 프롬프트
- **patchm5.md** — Upload 분석, PR#1 스캐폴딩, Verify 명령
- **AGENTS.md** — 불변조건
- **option_c.json** — 데이터 SSOT
