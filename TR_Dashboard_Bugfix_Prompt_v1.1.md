# /optimize prompt — TR Dashboard Bugfix & UX Hardening v1.1

Repo
- https://github.com/macho715/tr_dashboard.git

## Objective (1 sentence)
현장 운영 관점에서 **Trip/TR 선택 → Timeline/Gantt 확인 → Evidence/History 기록 → Compare/Report/Readiness 확인**의 핵심 루프가 “오작동/혼란/끊김 없이” 동작하도록, 현재 배포본의 명확한 UX 결함과 기능 버그를 수정한다.

---

## Scope (Must)

### 1) Date Cursor(Selected Date) 정합성 버그 수정
**문제:** Selected Date(또는 Date Cursor)를 변경하면 Gantt의 날짜 바/라인이 이동하지만, 실제 Gantt 날짜 축과 맞지 않거나 “Selected Date가 정확히 무엇을 의미하는지”가 불명확함.

**요구사항:**
- Selected Date는 **“YYYY-MM-DD(날짜-only)”** 기준이며, **Gantt X축의 동일한 날짜 컬럼/그리드에 정확히 정렬**되어야 한다.
- 타임존 혼선(UTC vs Local)로 하루 밀림이 발생하지 않도록 **date-only 표준(UTC day index 또는 app 표준 timezone)** 를 정의하고, Gantt의 모든 위치 계산에 동일 기준을 적용한다.
- UI에 명시적으로 표시:
  - 예: `Selected date: 2026-02-07` (툴팁/배지/상단 컨트롤)
  - 라인/커서에 hover 시 툴팁으로 날짜를 표시

**AC:**
- 2026-02-07 입력 시, Gantt 상에서 2026-02-07 위치에 커서가 정확히 정렬.
- “Selected Date가 어떤 기준인지(UTC day / project TZ)”를 UI 혹은 help tooltip로 명시.

---

### 2) Trip 클릭/선택 시 잘못된 데이터 노출 + TR 목록 3개만 보이는 버그 수정
**문제:** Trip을 클릭하면 상관없는 데이터가 나오고, TR 클릭 시 3까지만 존재/노출됨.

**요구사항:**
- **Trip(1~7) ↔ TR(1~7)** 매핑을 SSOT로 단일화한다.
  - 좌측 Map(TR 선택), 상단 Trip/TR selector, Trip 카드 클릭, Detail 패널/History/Evidence 탭의 trip_id가 **항상 동일한 선택 상태**를 바라봐야 한다.
- TR 리스트/마커/selector가 **항상 7개**를 노출하고, 클릭 시 해당 trip_id로 정확히 라우팅/상태 변경.
- “상관없는 자료”가 나오지 않도록, trip_id 기반 데이터 바인딩을 전수 점검한다.

**AC:**
- Trip 1~7 각각 클릭 시, 중앙 Timeline/우측 탭(History/Evidence/Compare/Closeout)이 동일 trip_id의 데이터로 일관되게 갱신.
- TR selector가 1~7 전부 노출되고, 각 TR 선택 시 동일한 trip_id로 동작.

---

### 3) View 버튼 동작(링크/화면 없음) 수정
**문제:** `View` 클릭 시 이동되는 화면/라우트가 없음.

**요구사항:**
- 최소 1개 이상의 명확한 View 동작 제공:
  - A안: Next.js App Router로 `app/trip/[tripId]/page.tsx` 라우트 구현
  - B안: 쿼리 기반 딥링크(예: `/?trip=3&panel=detail`) + 페이지 내 Detail 패널 포커싱
- 어떤 방식을 택하든:
  - URL 공유/새로고침/재접속 시 동일 상태 복원
  - 잘못된 tripId 입력 시 안전한 fallback(Trip Overview로 redirect)

**AC:**
- View 클릭 → “존재하는 화면”으로 이동/표시됨.
- 새로고침해도 동일 trip detail 상태가 복원됨.

---

### 4) StoryHeader Empty-state의 WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 제거
**문제:** 아래 가이드 문구가 화면에 노출됨(사용자 요구로 제거).
- WHERE: 좌측 지도에서 TR 선택
- WHEN/WHAT: 중앙 타임라인을 확인
- EVIDENCE: 우측 증빙 탭에서 확인

**요구사항:**
- 해당 가이드를 UI에서 완전히 제거한다(컴포넌트/문자열/조건부 렌더 포함).
- 기능적 빈 상태(empty state)는 유지하되, 문구만 제거하거나 더 축약된 형태로 대체(요청이 “제거”이므로 기본은 삭제).

**AC:**
- UI에서 WHERE/WHEN/WHAT/EVIDENCE 문구 노출 0.

---

### 5) Compare Diff “어떤 날짜로 비교”하는지 입력/선택 UI 추가
**문제:** Compare Diff가 어떤 시점(날짜/스냅샷)을 기준으로 비교하는지 입력하는 란이 없음.

**요구사항(최소):**
- Compare Diff 패널 상단에 아래를 제공:
  - `Baseline snapshot:` (created_at 표시, immutable)
  - `Compare as-of date:` (DatePicker 또는 YYYY-MM-DD input)
  - `Compare snapshot:` (해당 날짜 기준으로 선택된 snapshot/버전 표시)
- 기능적으로는 아래 중 하나를 충족해야 함:
  - (권장) **Plan snapshot history**를 저장하고(예: reflow/apply 시점마다 snapshot append), `Compare as-of date`로 가장 가까운 snapshot을 선택하여 diff.
  - (대체) snapshot history 구현이 어렵다면, 최소한 **현재 diff가 baseline vs current**임을 명확히 표시하고, compare date는 “현재”로 고정되더라도 UI에서 고정값을 명시(하지만 사용자가 “입력”을 원하므로 권장안 우선).

**AC:**
- 사용자가 `Compare as-of date`를 입력/선택할 수 있음.
- Diff가 어떤 baseline/compare 시점인지 UI에 명확히 표시.

---

### 6) Note 보관/삭제 요구사항 반영 (비밀번호 기반)
**문제/질문:** Note란이 계속 보관되는가? 입력하고 지울 수 있도록 하고 비번으로 관리.

**요구사항(권장 설계: 감사추적 유지 + 삭제 UX 제공):**
- Note는 localStorage(또는 기존 trip-store)에 **영속 저장**되어 새로고침/재접속 후에도 유지.
- “삭제”는 데이터 무결성을 위해 **하드 삭제 대신 tombstone(삭제 이벤트 append)** 로 구현:
  - NOTE 삭제 시 `NOTE_DELETE`(또는 `TOMBSTONE`) 이벤트를 append
  - UI 기본 뷰에서는 삭제된 NOTE를 숨기고, 필요 시 “Show deleted” 토글로 확인 가능
- 삭제/숨김 처리에는 비밀번호가 필요:
  - 비밀번호는 **평문 저장 금지**
  - 브라우저 Web Crypto로 **salted hash** 저장(localStorage)
  - 첫 설정/변경/검증 UX 제공(간단한 Dialog)

**AC:**
- Note 작성 → 새로고침 후에도 유지.
- Note 삭제 버튼 클릭 시 비밀번호 요구.
- 삭제 후 새로고침해도 삭제 상태 유지(숨김 유지).

---

### 7) 코드 점검 후 동작하지 않는 기능 전수 패치
**요구사항:**
- 위 1~6 항목 외에도, UI에서 dead link / broken state / 빈 화면 / 콘솔 에러 등 **즉시 운영을 방해하는 결함**이 있으면 함께 수정.
- 최소 smoke test 시나리오를 문서화하고, Vercel build가 깨지지 않도록 한다.

---

## Non-goals (Now)
- 외부 시스템(메일/WhatsApp/ERP) 실시간 연동
- SSO/권한/승인 워크플로(Phase2)
- 복잡한 BI/ML 예측(Phase3)

---

## Engineering Constraints
- Next.js/React 기반 유지, Vercel 배포 깨지면 실패.
- 날짜/상태/선택 상태는 **SSOT 단일 소스**로 유지(분산 상태 금지).
- Audit trail 원칙 유지(가능한 한 append-only; 삭제는 tombstone 방식 우선).

---

## Target Files (High probability)
> 실제 경로는 repo에서 확인 후 확정. 아래는 README 구조 기반 후보.

- `components/dashboard/gantt-chart.tsx` (Gantt + 날짜 변경/커서)
- `lib/ssot/schedule.ts` (UTC 날짜 유틸, parseDateInput 등)
- `components/dashboard/voyage-cards.tsx` (Trip 카드 클릭/뷰 버튼)
- `src/**` (DashboardLayout, MapPanel, TimelinePanel, ViewModeStore, StoryHeader 등)
- `lib/store/trip-store.ts` (History/Evidence/Note 영속)
- `lib/baseline/baseline-compare.ts` + CompareDiffPanel (diff)
- `app/**` (View 라우트/딥링크)

---

## Acceptance Criteria (Testable)
- **AC1** Selected Date 커서 위치가 입력 날짜와 정확히 일치 + 의미가 UI에 명시됨.
- **AC2** Trip/TR 선택이 1~7 전부 일관되게 동작(좌/중/우 패널 일치) + “상관없는 자료” 미노출.
- **AC3** View 클릭 시 실제 화면으로 이동/표시 + 새로고침 복원.
- **AC4** WHERE/WHEN/WHAT/EVIDENCE 가이드 문구 노출 0.
- **AC5** Compare Diff에서 비교 기준 날짜(또는 스냅샷)를 입력/선택 가능 + 어떤 기준인지 표기.
- **AC6** Note는 영속 저장 + 비밀번호 기반 삭제(또는 tombstone) + 새로고침 후 유지.
- **AC7** `pnpm run typecheck && pnpm run lint && pnpm test -- --run && pnpm run build` 통과.

---

## Implementation Plan (PR 단위)

### PR#1 — Date Cursor 정합성(Selected Date) + 타임존/날짜-only 표준화
- 목표: selected date/day index 계산을 Gantt와 동일 기준으로 통일
- 변경 파일(예상): `components/dashboard/gantt-chart.tsx`, `lib/ssot/schedule.ts`
- Verify:
  - `pnpm run typecheck`
  - `pnpm test -- --run` (가능하면 date util 단위 테스트 추가)

### PR#2 — Trip/TR 선택 상태 단일화 + TR 7개 노출/연결
- 목표: Trip 카드/Map/TR selector/우측 탭 모두 같은 trip_id를 참조
- Verify: smoke scenario 1~7 클릭 반복 + 콘솔 에러 0

### PR#3 — View 라우트(또는 딥링크) 구현 + View 버튼 연결
- 목표: View 클릭 시 화면 존재 + URL 복원
- Verify:
  - `pnpm run build`
  - 새로고침 복원 확인

### PR#4 — StoryHeader 가이드 문구 제거
- 목표: WHERE/WHEN/WHAT/EVIDENCE 제거
- Verify: UI 어디에도 문자열이 남지 않음(검색 포함)

### PR#5 — Compare Diff 기준 날짜 입력 + Snapshot 선택 로직
- 목표: compare as-of date 입력 UI + diff 기준 명확화
- 권장: snapshot history 저장(append-only)

### PR#6 — Note 영속 + 비밀번호 기반 삭제(tombstone)
- 목표: note 유지 + 삭제 UX/보안(평문 금지)

### PR#7 — Regression/Polish
- 목표: 남은 broken UX/기능 패치 + a11y 스모크(키보드 포커스, Dialog focus trap, 버튼 라벨)

---

## Start Instructions (Agent)
1) **로컬에서 repo clone 후 dev 서버 실행** (`pnpm install`, `pnpm dev`).
2) 아래 버그를 **재현하고**, 각각의 원인 파일/컴포넌트 경로를 먼저 리스트업:
   - Selected Date 커서 오프셋
   - Trip 클릭 시 데이터 불일치
   - TR 선택 3개 제한
   - View 링크 없음
   - WHERE/WHEN/WHAT/EVIDENCE 문구 위치
   - Compare Diff 기준 날짜 입력 부재
   - Note 영속/삭제 요구
3) PR#1부터 순서대로 작업하되, 각 PR마다:
   - 변경 파일 리스트
   - 동작 스크린샷/짧은 로그(재현→수정→검증)
   - Verify 명령 결과(typecheck/lint/test/build)
4) 최종 결과물:
   - `git diff`를 patch 파일로 제공
   - (가능하면) 변경된 프로젝트 전체를 zip으로 제공

