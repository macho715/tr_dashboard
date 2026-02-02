## 1) Repo 스캔 결과 — Upload 관련 코드 경로/라우트/컴포넌트 목록 (현재 확인분)

커밋 트리(Phase 4 + EvidenceUploadModal 도입 커밋) 기준으로, “Upload(업로드)” 기능은 **Evidence 업로드 모달/CTA 흐름**에 집중되어 있습니다. ([GitHub][1])

### A. Upload UI(직접 업로드)로 보이는 컴포넌트

* `components/evidence/EvidenceUploadModal.tsx`

  * 증빙 “업로드” 모달 컴포넌트(명시적으로 Upload Modal). ([GitHub][1])

### B. Upload CTA/연결(업로드 진입점) 가능성이 높은 영역

* `components/evidence/EvidenceTab.tsx`

  * Evidence 탭(증빙 섹션) — 업로드/추가 동작이 여기서 연결될 가능성이 큼. ([GitHub][1])
* `components/history/HistoryEvidencePanel.tsx`

  * History + Evidence 패널(우측/하단 패널) — 업로드 버튼/모달 오픈 등의 진입점일 가능성이 큼. ([GitHub][1])
* `app/page.tsx`

  * 메인 페이지에서 History/Evidence 패널을 연결(과거에 `onUploadClick` 같은 연결점이 존재했던 흔적). ([GitHub][1])

### C. “Upload Route/API” 확인

* Phase 4 도입 커밋 파일 트리 기준으로는 `app/api/ssot/route.ts`만 명시적으로 보이며, **upload 관련 API route는 커밋 트리 상에서 확인되지 않습니다**(추가 검증 필요). ([GitHub][2])

### D. 문서/플랜 문서(Upload 언급 가능)

* `docs/plan/tr-dashboard-plan.md`
* `docs/plan/tr-dashboard-plan-patch4.md`

  * EvidenceUploadModal 도입 커밋에서 함께 수정됨(업로드 흐름/Phase 계획이 문서에 남아있을 수 있음). ([GitHub][1])

> ⚠️ 주의: 위 목록은 “커밋 파일 트리에서 확인 가능한 Upload 연관 경로” 기반입니다. 최종적으로는 로컬에서 `rg -n "(upload|Upload|EvidenceUploadModal)"` 같은 전역 검색으로 **남은 업로드 dead-path(라우트/유틸/테스트/문서)**까지 완전 제거 여부를 확인하는 절차가 필요합니다.

---

## 2) Upload 제거 전략 — 영향 범위 + 대체(OFF/삭제) 권장안

### 권장: **완전 삭제(Dead code 제거)**

요구사항이 “실사용 0 + dead code 제거 후 build/test 통과”라서, **feature flag로 숨기기보다 삭제가 더 일관**됩니다.

#### 제거 대상(최소)

1. `EvidenceUploadModal.tsx` 삭제
2. `EvidenceTab.tsx`, `HistoryEvidencePanel.tsx` 내 “Upload” CTA/모달 오픈 로직 제거
3. `app/page.tsx`에서 업로드 관련 props/state/handler 제거(혹은 이미 제거되었으면 잔여 import만 정리) ([GitHub][1])
4. 문서/주석에서 Phase “Upload” TODO 제거(예: “Phase 8 Evidence upload TODO”) — 코드/문서 일관성 목적

#### 영향 범위(리스크)

* **UI 단**: Evidence 탭에서 “증빙 추가” 흐름이 사라짐 → PR#2에서 “Evidence 입력(링크/경로)” UI로 대체해야 공백이 없음.
* **테스트 단**: Evidence 관련 단위 테스트가 “업로드 모달” 렌더를 가정하면 깨질 수 있음.
* **데이터 플로우 단**: 업로드가 실제로 SSOT에 `evidence_items`를 추가하는 통로였다면, PR#2의 “Evidence Item append 저장”이 동등 기능이 됨.

### 대안: Feature Flag OFF (정말 필요할 때만)

* “향후 파일 업로드를 재도입할 가능성”이 높고, 당장 삭제가 부담이면 `NEXT_PUBLIC_FEATURE_UPLOAD=false` 같은 플래그로 UI를 숨길 수 있음.
* 다만 **dead code 제거** 요구가 있으므로, flag 방식이라도 “라우트/컴포넌트/플로우”는 최대한 삭제하고, 정말 최소한만 남기는 편이 맞습니다.

---

## 3) PR#1 스캐폴딩 (Structural) — Upload dead-path 제거/flag off + 정리 + Verify 명령

### PR#1 목표

* **Upload UI/라우트/컴포넌트/데이터 플로우**가 UI에서 0 노출.
* 불필요 코드 제거 후 **lint/build/test 통과**.

### PR#1 변경 파일(예상 최소 세트)

> 아래는 “현재 확인된 Upload 관련 경로” 기반의 **가장 보수적인 최소 변경 세트**입니다. ([GitHub][1])

* ✅ 삭제

  * `components/evidence/EvidenceUploadModal.tsx`

* ✅ 수정

  * `components/evidence/EvidenceTab.tsx`

    * Upload CTA/모달 트리거 제거
    * (대체) “증빙은 링크/레퍼런스 형태로 PR#2에서 추가된다”는 빈 상태 메시지만 유지
  * `components/history/HistoryEvidencePanel.tsx`

    * Upload 버튼/동작 제거
    * History/Evidence 섹션은 read-only 상태 유지(입력은 PR#2에서)
  * `app/page.tsx`

    * 업로드 관련 import/props/state 핸들러 정리(잔여 코드가 있을 경우)
  * (있다면) 업로드 관련 테스트/스토리/문서 파일 정리

### Verify 명령 (레포에 이미 제공된 도구 흐름 포함)

* 패키지 매니저 자동 감지(레포 내 도구):

  * `node tools/detect_pm_and_scripts.mjs` ([GitHub][3])
* 일반 검증(권장 순서)

  * `pnpm lint` (또는 `pnpm run lint`)
  * `pnpm test` (또는 `pnpm run test`)
  * `pnpm build` (또는 `pnpm run build`)
  * 필요 시 `pnpm exec next build`

---

## 4) /optimize prompt — “TR Dashboard SSOT Upgrade v1.0” (Copy/Paste 용, Agent 실행 지침)

아래는 **PR#1~PR#5**를 그대로 실행 가능한 형태로 재구성한 “에이전트 프롬프트”입니다.
(※ 코드블록 내부에는 특정 플랫폼명은 넣지 않았습니다. 배포/CI 요구만 기술했습니다.)

```text
ROLE
- You are a senior full-stack engineer working in a Next.js/React/TypeScript codebase.
- Deliver changes as a sequence of PRs (PR#1..PR#5). Each PR must compile, pass tests, and be deploy-safe.

PRIMARY OBJECTIVE (1 sentence)
- Make “1 TR = 1 Trip story” operable as SSOT, so that at Trip completion the history/evidence/summary/next readiness are persistently recorded and exportable.

NON-GOALS (NOW)
- No external system real-time integrations.
- No SSO/permissions/approval workflows (Phase2).
- No BI/ML predictions (Phase3).

HARD CONSTRAINTS
- Keep Next.js/React architecture. Deployment must not break.
- Baseline plan is immutable.
- History is append-only (audit/traceability).
- Any status/date change requires audit metadata (updated_at, updated_by at minimum).
- Prefer tidy-first refactors: remove dead paths, keep diffs reviewable.

DATA MODEL (Schema-first; implement types first)
Trip
- trip_id: 1..7
- tr_id: string
- status: PLANNED|IN_PROGRESS|DONE
- planned_window: {start,end}
- actual_window: {start,end}

Plan Baseline (Original, immutable snapshot)
- plan_id, trip_id
- activities[]: {activity_id, name, planned_start, planned_end, deps[], resource?}
- created_at

Plan Current (Updated)
- plan_id, trip_id
- activities[]: {activity_id, name, planned_start, planned_end, deps[], resource?, updated_at, updated_by}

History Event (append-only)
- event_id, trip_id, occurred_at
- type: NOTE|DELAY|DECISION|RISK|MILESTONE|ISSUE
- message
- delay_flag, delay_reason_code?, refs[]

Evidence Item
- evidence_id, trip_id, activity_id?
- kind: PHOTO|PDF|EMAIL|WHATSAPP|LINK|OTHER
- url_or_path, note, created_at

Trip Report Source
- trip_id, generated_at
- actuals_summary, delays[], decisions[], evidence_summary
- export_md_path?, export_json_path?

UX SCREENS (Must)
A) Trip Overview (7 cards)
- status, next milestone, readiness badge, key blockers count

B) Trip Detail
- Plan Diff (baseline vs current)
- Timeline/Gantt (current plan 기준)
- History input (quick add)
- Evidence input (link/file ref)
- Trip Report Source preview + Export

C) Next Trip Readiness
- checklist + missing items + blockers + upcoming schedule
- Ready/Not Ready badge, clickable reasons -> deep link to detail

ACCEPTANCE CRITERIA (Testable)
AC1 Upload 제거/비활성화
- Upload UI/route/component not visible in UI.
- No dead code path. Build/test pass.

AC2 History append-only
- Add event, refresh/reopen, events persist.
- Editing existing event is not allowed; only append.

AC3 Plan Diff
- Shows shift/add/remove/change classification correctly
  - date shift
  - activity add/remove
  - dep/resource change (if exists)
- Store minimal audit: who/when/what changed.

AC4 Trip Done -> Report Source 생성 + Export
- On Trip 완료 처리, generate Report Source and persist it.
- Export Markdown + JSON is reproducible (same input -> same output).

AC5 Next Trip Readiness
- NOT READY reasons (missing evidence/blocker) are clickable and traceable.

START INSTRUCTIONS (MANDATORY OUTPUT ORDER)
1) Scan repo and output “Upload 관련 코드 경로/라우트/컴포넌트 목록” first.
2) Propose removal impact and choose OFF vs delete strategy.
3) Then create PR#1 scaffolding. For each PR:
   - list changed files
   - list verify commands (lint/test/build)
   - add short notes on risk/rollback

PR PLAN (Tidy First)
PR#1 Structural
- Remove/disable Upload section (UI/routes/components/flows). Delete dead code. Ensure build/test pass.

PR#2 Behavioral
- Implement History/Evidence input UI per Trip.
- Persist storage (append-only for history). Reload must keep data.

PR#3 Behavioral
- Implement Baseline snapshot + Current plan separation.
- Build Diff utility + Diff UI, store audit metadata.

PR#4 Behavioral
- Implement Trip completion workflow:
  - set actual_window
  - collect delays/decisions/evidence summary
  - store Trip Report Source
  - export .md and .json

PR#5 Polish
- Next Trip readiness panel + (optional) completeness score + mobile sticky quick-add button.

QUALITY BAR
- Keep types in sync, no any-casts.
- Write unit tests for diff classification and append-only invariants.
- No breaking changes to existing schedule/gantt baseline functionality.
- Include lightweight migration path for existing data if needed.
```

---

## 5) 참고(레포에서 이미 보이는 힌트 — 향후 PR#2~에서 활용 가능)

* 이미 Evidence/History 관련 UI 컴포넌트 구조가 존재합니다(`EvidenceTab`, `HistoryEvidencePanel`, `HistoryTab`). ([GitHub][2])
* Evidence 게이트(상태머신 + evidence_required / evidence_ids)도 코드베이스에 존재하므로, “Next Trip Readiness” 계산의 기반으로 재사용 가능성이 큽니다. ([GitHub][4])

---

### 다음 액션(권장 순서)

* 위 “Upload 목록”을 기준으로 PR#1에서 **EvidenceUploadModal 및 업로드 진입점 제거**부터 처리
* PR#2에서 곧바로 **Evidence 입력(링크/경로) + History append-only 저장**으로 사용자 플로우 공백을 메우는 방식이 가장 안전합니다.

(추가 스캔이 필요하면: “Upload” 키워드뿐 아니라 `EvidenceUploadModal`, `onUpload`, `file input`, `dropzone` 계열 검색까지 포함해 dead-path를 완전 제거하는 것을 권장합니다.)

[1]: https://github.com/macho715/tr_dashboard/commit/913e0f5034f1f504c4b60608da418f0e07a80e08 "feat: EvidenceUploadModal, page/gantt updates, plan docs · macho715/tr_dashboard@913e0f5 · GitHub"
[2]: https://github.com/macho715/tr_dashboard/commit/edcbeb43c4b702eabb03f082c6d5d9c4ca6c44ec "feat: Phase 4 UI Foundation - Complete dashboard implementation · macho715/tr_dashboard@edcbeb4 · GitHub"
[3]: https://github.com/macho715/tr_dashboard.git "https://github.com/macho715/tr_dashboard.git"
[4]: https://github.com/macho715/tr_dashboard/commit/55808aab7e72989ab5e03e60a64a373556bda62b "feat: Phase 3 - State Machine + Evidence Gates · macho715/tr_dashboard@55808aa · GitHub"
