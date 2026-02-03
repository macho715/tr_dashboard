# TR Dashboard — patchm1 + patchm2 통합 구현 계획

> **SSOT**: patchm1.md, patchm2.md  
> **목표**: 불필요 UI 제거(Upload/BulkAnchors) + 운영 입력/보고 체계 강화 + SSOT Upgrade v1.0  
> **생성**: 2026-02-02

---

## 1. 요구사항 통합 매트릭스

| # | patchm1 | patchm2 | 통합 작업 | 우선순위 |
|---|---------|---------|-----------|----------|
| 1 | BulkAnchors 기본 제거 | — | T1: BulkAnchors 숨김 | P0 |
| 2 | — | **Upload 제거/flag OFF** | T2: Upload dead-path 제거 | P0 |
| 3 | History/Evidence 입력+저장 | History append-only | T3: History/Evidence 입력+저장 | P0 |
| 4 | Plan Diff (Original vs Current) | Plan Diff + audit meta | T4: Compare Diff 패널 | P0 |
| 5 | Trip Report 자동 생성+Export | Trip Report Source + Export | T5: Trip Report 생성+Export | P0 |
| 6 | Next Trip Readiness | Next Trip Readiness | T6: Readiness 패널 | P1 |

---

## 2. Repo Scan — Upload Inventory (patchm2 §7 Step 1)

| path | type | referenced-by | risk | remove strategy |
|------|------|---------------|------|------------------|
| `components/evidence/EvidenceUploadModal.tsx` | component | HistoryEvidencePanel, EvidenceTab | file input, simulate upload | **Flag OFF** 또는 **Replace**: 링크/메타 입력 폼으로 교체 |
| `components/evidence/EvidenceTab.tsx` | component | HistoryEvidencePanel | `onUploadClick`, Upload 버튼 | Upload 버튼 → "Add link" 버튼으로 교체 |
| `components/history/HistoryEvidencePanel.tsx` | component | DetailPanel | `handleUploadClick`, `EvidenceUploadModal` | `onUploadClick` → `onAddEvidence(link/metadata)` |
| `src/lib/stores/view-mode-store.tsx` | store | — | `canUploadEvidence` | `canAddEvidence`로 rename, 링크/메타만 허용 |

**Impact summary**:
- EvidenceUploadModal: file input → 링크/URL 입력 폼으로 교체 (patchm2: "Evidence는 링크/경로 메타데이터만")
- 실제 파일 업로드 UI/라우트/데이터 플로우 제거
- Evidence 저장: `uri` 필드에 URL/경로 문자열만 저장

**Decision Log**:
| Date | Context | Options | Decision | Rationale |
|------|---------|---------|----------|------------|
| 2026-02-02 | patchm2 Upload 제거 | Hard delete vs Flag OFF vs Replace | **Replace** | Evidence 입력은 유지하되, 파일 업로드 → 링크/메타 입력으로 교체. dead code 최소화. |

---

## 3. PR 단위 계획 (patchm2 §6 + patchm1 통합)

### PR#1 (Structural) — Dead-path 제거 + BulkAnchors 숨김

**목적**: Upload dead-path 제거/교체 + BulkAnchors 기본 숨김 + lint/build/test 통과

**변경 파일**:
- `components/ops/AgiOpsDock.tsx` — Bulk Anchors 섹션 `showBulkAnchors` prop, 기본 `false`
- `components/dashboard/sections/overview-section.tsx` — `showBulkAnchors={false}` (또는 생략)
- `components/evidence/EvidenceUploadModal.tsx` — **Replace**: file input 제거, URL/링크 입력 폼으로 교체
- `components/evidence/EvidenceTab.tsx` — "Upload" → "Add link" 버튼, `onAddEvidence` prop
- `components/history/HistoryEvidencePanel.tsx` — `onUploadClick` → `onAddEvidence`, EvidenceUploadModal → EvidenceLinkModal(또는 동일 컴포넌트 내 입력 방식 변경)
- `src/lib/stores/view-mode-store.tsx` — `canUploadEvidence` → `canAddEvidence` (선택)

**Verify**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

**Rollback**: PR revert, feature flag `ENABLE_EVIDENCE_UPLOAD=false` (선택)

---

### PR#2 (Structural) — SSOT 타입 확장

**목적**: patchm1 §3 + patchm2 §3 데이터 계약을 TypeScript 타입으로 반영

**변경 파일**:
- `src/types/ssot.ts`
  - `baselines`, `history_events`, `evidence_items`, `trip_closeouts`, `reports` 타입
  - `Trip.closeout`, `Trip.baseline_id_at_start`, `Trip.milestones`
  - `EvidenceItem` (uri = URL/경로만), `HistoryEvent`, `TripCloseout`, `TripReport`, `ProjectReport`
  - `blocker_code` enum: `PTW_MISSING | CERT_MISSING | WX_NO_WINDOW | LINKSPAN_LIMIT | BARGE_LIMIT | RESOURCE_CONFLICT | MANUAL_HOLD`
- `option_c.json` 검증 스크립트 (선택)

**Verify**: `pnpm typecheck`, 기존 타입 호환

---

### PR#3 (Behavioral) — History/Evidence 입력 + 저장 (append-only)

**목적**: Trip 단위 History/Evidence 사용자 입력 + SSOT 저장 (append-only)

**Storage 전략** (patchm2 §3):
- **Option A (권장)**: Client-side persistence (localStorage/IndexedDB) — Vercel 서버 파일 쓰기 불가
- **Option B**: 기존 DB가 있으면 사용

**변경 파일**:
- `components/history/HistoryEvidencePanel.tsx` — History 입력 폼, Evidence 링크 입력
- `components/history/HistoryTab.tsx` — append-only 입력 UI
- `components/evidence/EvidenceTab.tsx` — 링크/URL 입력, 저장
- `lib/store/` 또는 `src/lib/` — Trip Store (localStorage/IndexedDB) 구현
- API 또는 클라이언트: `history_events` append, `evidence_items` append

**원칙**: Baseline immutable, History append-only, 수정 UI 금지

**Verify**: 입력 후 새로고침/재접속에도 유지

---

### PR#4 (Behavioral) — Plan Diff + Compare Diff 패널

**목적**: Original Plan(immutable) vs Current Plan Diff 표시 + audit meta

**변경 파일**:
- `components/compare/CompareDiffPanel.tsx` (신규)
- `HistoryEvidencePanel` — 탭: `Detail | Evidence | History | Compare Diff | Trip Closeout/Report`
- `lib/baseline/baseline-compare.ts` — `computeActivityDiff(baseline, current)`, diff 분류(shift/add/remove/change)
- Gantt: baseline bar = ghost, current bar = solid, 변경 Activity = ● + 색상

**Verify**: 날짜/Activity 변경이 정확히 분류

---

### PR#5 (Behavioral) — Trip Report Source + Export

**목적**: Trip 완료 시 Report Source 생성 + Export(md/json), deterministic

**변경 파일**:
- `lib/reports/` (신규) — `generateTripReport(closeoutId, ssot)`
- `components/history/TripCloseoutForm.tsx` (신규) — Closeout 입력 폼
- Export: 정렬 기준 고정(occurred_at asc, activity_id asc), Markdown 템플릿 고정

**Verify**: 동일 데이터 → 동일 export 결과

---

### PR#6 (Polish) — Next Trip Readiness 패널

**목적**: 48~72h 체크리스트, Ready/Not Ready 배지, 근거 deep-link

**변경 파일**:
- `components/dashboard/ReadinessPanel.tsx` (신규)

---

## 4. 실행 순서 (TDD 권장)

```
1. PR#1 (BulkAnchors + Upload 교체)  → 즉시, 영향 최소
2. PR#2 (SSOT 타입 확장)            → PR#3, #4, #5 의존
3. PR#3 (History/Evidence 저장)     → PR#5 의존
4. PR#4 (Compare Diff)             → PR#2 의존
5. PR#5 (Trip Report)              → PR#3 완료 후
6. PR#6 (Readiness)                → 독립
```

---

## 5. 파일 터치맵

| 파일 | PR#1 | PR#2 | PR#3 | PR#4 | PR#5 | PR#6 |
|------|------|------|------|------|------|------|
| `AgiOpsDock.tsx` | ● | | | | | |
| `overview-section.tsx` | ● | | | | | |
| `EvidenceUploadModal.tsx` | ● | | | | | |
| `EvidenceTab.tsx` | ● | | ● | | | |
| `HistoryEvidencePanel.tsx` | ● | | ● | ● | | |
| `HistoryTab.tsx` | | | ● | | | |
| `src/types/ssot.ts` | | ● | | | | |
| `CompareDiffPanel.tsx` (신규) | | | | ● | | |
| `lib/baseline/baseline-compare.ts` | | | | ● | | |
| `lib/reports/` (신규) | | | | | ● | |
| `TripCloseoutForm.tsx` (신규) | | | | | ● | |
| `ReadinessPanel.tsx` (신규) | | | | | | ● |
| `lib/store/trip-store.ts` (신규) | | | ● | | | |

---

## 6. Acceptance Criteria (patchm2 §5)

- [ ] **AC1 Upload 제거/비활성화**: 파일 업로드 UI 노출 0, Evidence는 링크/메타 입력만, build/test/deploy OK
- [ ] **AC2 History append-only**: 입력 후 새로고침/재접속에도 유지, 수정은 "추가"로만
- [ ] **AC3 Plan Diff**: 날짜/Activity 변경이 정확히 분류(shift/add/remove/change)
- [ ] **AC4 Trip Report**: md/json export 재현 가능(동일 데이터 → 동일 결과)
- [ ] **AC5 Next Trip Readiness**: NOT READY 사유 클릭 시 근거로 추적 가능

---

## 7. Hard Rules (patchm2 §0)

- **Plan Baseline = immutable** (절대 수정 불가)
- **History = append-only** (수정/삭제 금지)
- Vercel 배포 유지: `build / test / lint` PR마다 통과
- 되돌릴 수 없는 변경 시 PR 본문에 Rollback 절차 포함
- 민감정보/실데이터 노출 금지, 샘플은 더미/마스킹만

---

## 8. Evidence v1.0 제약 (patchm2 §9)

- Evidence는 **링크/경로 메타데이터**만
- **실제 파일 업로드 기능 제거**
- kind: PHOTO|PDF|EMAIL|WHATSAPP|LINK|OTHER (url_or_path, note)

---

## 9. Tests (plan.md 규약)

- [x] test: BulkAnchors hidden by default (file: components/ops/__tests__/AgiOpsDock.test.tsx) # passed
- [ ] test: EvidenceLinkModal accepts URL and creates EvidenceItem (file: components/evidence/__tests__/EvidenceLinkModal.test.tsx)
- [ ] test: History append-only — no edit/delete UI (file: components/history/__tests__/HistoryTab.test.tsx)
- [ ] test: computeActivityDiff returns correct delta (file: lib/baseline/__tests__/baseline-compare.test.ts)
- [ ] test: generateTripReport deterministic output (file: lib/reports/__tests__/trip-report.test.ts)

---

## 10. 참조

- **patchm1.md** (요구사항 상세)
- **patchm2.md** (Agent Prompt, PR 구조, Output Format)
- **AGENTS.md** (불변조건)
- **option_c.json** (데이터 SSOT)
