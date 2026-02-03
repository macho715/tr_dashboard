아래는 **코딩 에이전트(Codex/Cursor/Claude Code 등)** 에 바로 붙여넣어 실행할 수 있게 다듬은 **최적화 프롬프트 v1.0** 입니다.
(원문 요구사항은 유지하되, **결정/출력 포맷/저장 전략/PR 단위 검증**을 더 엄격히 고정했습니다.)

---

# TR Dashboard (7 Trips / 7 TR) — SSOT Upgrade v1.0 (Agent Prompt)

## 0) Role & Working Rules

너는 Next.js/React 기반 **TR Dashboard** 레포를 수정하는 **실행형 코딩 에이전트**다.

### Hard rules

* **Upload 기능(파일 업로드 UI/라우트/컴포넌트/데이터 플로우)은 v1.0에서 제거하거나 feature flag로 OFF** 한다.
* SSOT 원칙:

  * **Plan Baseline = immutable** (절대 수정 불가)
  * **History = append-only** (수정/삭제 금지, 오직 “추가”)
* Vercel 배포가 깨지면 실패. `build / test / lint`를 PR마다 통과시켜라.
* **되돌릴 수 없는 변경(데이터 파기, 상태 일괄 변경 등)** 은 PR 본문에 “Rollback” 절차를 반드시 포함해라.
* 민감정보/실데이터(P2) 노출 금지. 샘플은 **더미/마스킹**만 사용.

---

## 1) Objective (1 sentence)

“**TR 하나 = Trip 하나의 이동 스토리**”를 SSOT 기준으로 운영 가능하게 만들고, Trip 종료 시 **기록/증빙/요약/다음 준비**가 자동으로 남는 대시보드로 업그레이드한다.

---

## 2) Scope

### Must (v1.0)

1. **Upload 섹션 제외(실사용 0)**

* 대시보드에서 업로드 UI/라우트/컴포넌트/데이터 플로우를 제거하거나 feature flag로 OFF.
* dead code 제거 후 build/test 통과.

2. **History/Evidence 사용자 입력 + 저장 (append-only)**

* Trip(1~7) 단위 UI 제공.
* “Trip 종료(DONE)” 시 사용자 입력(히스토리/지연 사유/결정사항)이 저장되고 재접속/새로고침 후에도 유지.
* 수정은 금지, **추가만 허용**.

3. **Plan Diff (Original vs Updated)**

* Original Plan(immutable snapshot)과 Current Plan(변경본)을 분리 저장.
* UI에서 변경된 날짜/Activity를 Diff로 표시:

  * 날짜 변경(shift)
  * activity 추가/삭제
  * dependency/resource 변경(있으면)
* 변경 이력(audit): 누가/언제/무엇을 바꿨는지 최소 메타 저장.

4. **Trip 종료 시 운송 Summary 생성 (Report Source 저장)**

* Trip 완료 처리 시 “Report Source”로 구조화 저장:

  * 실제 수행일(Actual start/end)
  * 지연 여부 + 지연 사유(사전 taxonomy + 자유기술)
  * 주요 결정사항/리스크/조치
  * Evidence 링크 요약
* Export 기능: **Markdown(.md) + JSON(.json)** 생성

  * **Deterministic**: 동일 데이터 → 동일 결과 (정렬/템플릿 고정)

5. **Next Trip Readiness (One-glance)**

* 다음 Trip(또는 선택 Trip)에 대해 일정/체크리스트/미비 증빙/Blocker를 한 화면에:

  * upcoming milestones
  * missing evidence
  * unresolved blockers
  * resource conflicts(있으면)
* “Ready / Not Ready” 배지 제공 + 근거 항목 클릭 시 상세로 이동.

### Nice-to-have (옵션)

* Evidence completeness score(0–100) + 룰 기반 경고
* Delay taxonomy(Weather/Permit/Port/Resource/Docs/Client/Other) + 통계
* Trip 종료 템플릿(1-click) + 모바일 스티키 입력 버튼
* Report export “Trip Pack(zip)”은 Phase2

### Non-goals (Now)

* 외부 시스템 실시간 연동(메일/WhatsApp/ERP)
* SSO/권한/승인 워크플로(Phase2)
* BI/ML 예측(Phase3)

---

## 3) SSOT / Data Model (Schema-first)

아래 모델을 **TypeScript type + runtime validation(zod 등)** 로 고정하고, 저장소는 아래 원칙을 지켜라.

### Entities

* **Trip**

  * trip_id: 1..7
  * tr_id: string
  * status: PLANNED|IN_PROGRESS|DONE
  * planned_window: {start,end}
  * actual_window: {start,end}

* **Plan Baseline (Original, immutable)**

  * plan_id, trip_id
  * activities[]: {activity_id, name, planned_start, planned_end, deps[], resource?}
  * created_at

* **Plan Current (Updated)**

  * plan_id, trip_id
  * activities[]: {activity_id, name, planned_start, planned_end, deps[], resource?, updated_at, updated_by}
  * (권장) plan_updated_at, plan_updated_by

* **History Event (append-only)**

  * event_id, trip_id, occurred_at
  * type: NOTE|DELAY|DECISION|RISK|MILESTONE|ISSUE
  * message
  * delay_flag, delay_reason_code?, refs[] (evidence_id 또는 url)

* **Evidence Item**

  * evidence_id, trip_id, activity_id?
  * kind: PHOTO|PDF|EMAIL|WHATSAPP|LINK|OTHER
  * url_or_path, note, created_at

* **Trip Report Source**

  * trip_id, generated_at
  * actuals_summary, delays[], decisions[], evidence_summary
  * export_md_path?, export_json_path?
  * (브라우저 다운로드 방식이면 path 대신 export payload metadata 저장 가능)

### Storage 선택 (중요)

Vercel 환경에서 서버 파일시스템 영구 저장이 불가할 수 있다. v1.0 요구사항은 “새로고침/재접속에도 유지”이므로 아래 중 하나를 선택하고 이유를 PR에 명시해라.

* **Option A (권장, v1.0 최소): Client-side persistence**

  * localStorage/IndexedDB 기반 “Trip Store” 구현
  * 장점: 배포/운영 단순, 서버 불필요
  * 단점: 브라우저/디바이스 종속
* **Option B: DB (기존에 이미 붙어 있다면)**

  * 기존 저장소가 있으면 그것을 사용
  * 다만 Non-goals 범위 내에서 최소화

> 어떤 옵션을 택하든, Baseline immutable + History append-only + audit meta 저장 원칙은 유지.

---

## 4) UX Requirements (Screens)

A) **Trip Overview (7 cards)**

* status, next milestone, readiness badge, key blockers count

B) **Trip Detail**

* Plan Diff (baseline vs current)
* Timeline/Gantt (current plan 기준)
* History input (quick add; append-only)
* Evidence input (링크/파일 ref — **실제 업로드는 금지**)
* Trip Report Source preview + Export(md/json)

C) **Next Trip Readiness**

* checklist + missing items + blockers + upcoming schedule
* Ready/Not Ready + 근거 deep-link

---

## 5) Acceptance Criteria (Testable)

* **AC1 Upload 제거/비활성화**: UI 노출 0, build/test/deploy OK
* **AC2 History append-only**: 입력 후 새로고침/재접속에도 유지, 수정은 “추가”로만
* **AC3 Plan Diff**: 날짜/Activity 변경이 정확히 분류(shift/add/remove/change)
* **AC4 Trip 종료 시 Report Source 생성**: md/json export 재현 가능(동일 데이터 → 동일 결과)
* **AC5 Next Trip Readiness**: NOT READY 사유 클릭 시 근거로 추적 가능

---

## 6) Implementation Plan (PR 단위, Tidy First)

### PR#1 (Structural)

**Upload dead-path 제거/flag OFF + 파일/라우트 정리 + lint/build/test 통과**

* 요구 출력:

  * 제거 대상 목록(경로/의존성/사용처)
  * 제거 전략(삭제 vs flag OFF) 및 이유
  * 변경 파일 리스트
  * Verify 명령 + 결과 요약

### PR#2 (Behavioral)

**History/Evidence 입력 UI + 저장소 + 조회(append-only)**

* append-only 강제(수정 UI 금지)
* 저장/조회/마이그레이션(버전) 고려

### PR#3 (Behavioral)

**Plan Baseline snapshot + Plan Current + Diff 유틸 + Diff UI**

* Baseline 생성 규칙: “최초 로드 시 스냅샷” 또는 “Trip 시작 시 확정”
* Diff 분류 규칙을 유틸로 고정 + 테스트

### PR#4 (Behavioral)

**Trip 완료 처리 + Trip Report Source 생성 + Export(md/json)**

* 완료 시점에 report source 생성/저장
* export: deterministic formatting(정렬/템플릿 고정)
* UI: preview + 다운로드 버튼

### PR#5 (Polish)

**Next Trip Readiness 패널 + 모바일 UX(스티키 버튼/템플릿) + completeness score(옵션)**

---

## 7) Start Instructions (Agent) — 반드시 이 순서로 실행

### Step 1 — Repo scan first

레포 스캔 후 아래를 먼저 출력:

* “Upload 관련 코드 경로/라우트/컴포넌트 목록”

  * 검색 키워드 예: `upload`, `Upload`, `dropzone`, `file`, `multipart`, `s3`, `bucket`, `formdata`, `evidence upload`
  * 결과는 표로 정리: `path | type(route/component/store) | referenced-by | risk | remove strategy`

### Step 2 — Impact analysis + Strategy

Upload 제거 시 영향 범위:

* 의존성/사용처(import graph 관점)
* 라우팅/네비게이션/상태(store) 영향
* 대체 전략:

  * **Hard delete**(dead feature 완전 제거) vs **Feature flag OFF**(즉시 복구 가능)
* 최종 선택과 이유를 “Decision Log” 형식으로 남겨라.

### Step 3 — Implement PR#1 scaffolding

PR#1부터 실제 변경을 만들고(브랜치/커밋 단위로),
각 PR마다 아래를 반드시 포함해라:

* 변경 파일 리스트
* Verify 명령(예: `npm run lint`, `npm test`, `npm run build`) + 실행 결과
* 롤백 방법(최소 1줄)

---

## 8) Required Output Format (에이전트 응답 템플릿)

### (A) Repo Scan Report — Upload Inventory

* **Findings table** (필수)
* **Impact summary** (3–7줄)
* **Decision Log (1건)**

  * Date / Context / Options / Decision / Rationale / Validation

### (B) PR Plan (PR#1~#5)

각 PR마다:

* 목적(1–2줄)
* 변경 파일 리스트
* Verify 명령
* Simulation Log (1건)

  * Scenario / Steps / Output / Verdict / Next(≤3)

### (C) Risk & Assumptions

* 가정: (예: “updated_by는 로그인 없으므로 local user label로 저장”)
* 리스크: (예: “Vercel 서버 저장 불가 → client persistence 선택”)
* 대응: (예: “export는 client-side download로 구현”)

---

## 9) Notes / Gotchas (반드시 고려)

* **Vercel**: 서버 파일 쓰기 기반 영구 저장은 실패할 가능성이 큼 → 저장 전략을 명확히.
* “Evidence”는 v1.0에서 **링크/경로 메타데이터**만. **실제 파일 업로드 기능은 제거**.
* Deterministic export를 위해:

  * events/activities/evidence는 **정렬 기준을 고정**(예: occurred_at asc, activity_id asc)
  * Markdown 템플릿 고정(섹션 순서/헤더명 고정)

---

원하면, 위 프롬프트를 **“Codex용(명령형)” / “Cursor용(체크리스트+파일수정 지시형)”** 두 버전으로 더 압축해서도 제공할 수 있다.
