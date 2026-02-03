아래는 **현재 배포 화면(Vercel)**과 **README에 적힌 구조/기능(GitHub)** 기준으로, 요청하신 1~7번을 “동작하게 만드는 패치” 관점에서 정리한 **수정 가이드(파일 위치 + 구현 방향 + 수용 기준)** 입니다.
현재 이 채팅 환경에서는 GitHub에서 **개별 소스 파일 원문을 직접 열람/클론**하는 접근이 제한되어(README와 배포 UI만 확인 가능), **정확한 라인 단위 diff** 대신 **적용 파일/함수(README에 명시) 기준의 패치 지시서**로 제공합니다. (파일명이 약간 다르더라도 “동일 책임” 컴포넌트에 반영하면 됩니다.)

---

## 0) 현재 확인된 증상 (근거)

배포 화면에 다음이 그대로 노출됩니다.

* 상단에 **Selected Date**, **Trip Select**, **TR Select**, **View**, **Compare**가 존재 ([tr-dashboard-ten.vercel.app][1])
* “WHERE / WHEN/WHAT / EVIDENCE … 제거하라”로 요청하신 안내 문구가 화면에 그대로 있음 ([tr-dashboard-ten.vercel.app][1])
* “Detailed Voyage Schedule(0 of 7 visible)”처럼 **7개 항차 중 0개만 보이는 상태**가 기본값으로 노출 ([tr-dashboard-ten.vercel.app][1])
* README에 따르면 Gantt 및 날짜변경 UI는 `components/dashboard/gantt-chart.tsx`, 일정 SSOT/UTC 유틸은 `lib/ssot/schedule.ts`, 재계산 엔진은 `lib/utils/schedule-reflow.ts`, 변환은 `lib/data/schedule-data.ts`에 있음 ([GitHub][2])

---

## 1) Selected Date → Gantt 날짜바 위치가 “라벨 날짜”와 안 맞는 문제

### 1-1. 원인(가능성이 높은 것)

이 증상은 거의 항상 **“date-only(YYYY-MM-DD)”를 Date 객체로 바꾸는 과정에서 timezone이 섞여** 생깁니다.

* Gantt 상단 라벨은 “주차/일자” 기준으로 그리는데,
* Selected Date marker는 `Date`의 ms 차이로 `diffDays`를 계산하거나,
* 입력값(YYYY-MM-DD)을 `new Date("YYYY-MM-DD")`로 파싱해 **UTC/Local 해석이 브라우저마다 달라** dayIndex가 흔들리는 형태가 흔합니다.

README에서도 “UTC 날짜 유틸 / parseDateInput(YYYY-MM-DD 입력을 UTC로)”가 이미 존재한다고 되어 있어 ([GitHub][2]), **한쪽은 UTC, 한쪽은 Local**로 계산 중일 가능성이 큽니다.

### 1-2. 패치 목표(명확한 정의)

* **Selected Date**는 “하루(00:00~23:59)”를 가리키는 **date-only**로 정의합니다.
* 내부 계산은 **항상 UTC 기준의 dayIndex**로 통일합니다.
* UI에는 “Selected Date가 무엇을 의미하는지”가 보이도록 라벨을 추가합니다.

### 1-3. 수정 포인트(README 기준 파일)

* `lib/ssot/schedule.ts` (또는 프로젝트의 date 유틸 파일)

  * **date-only를 UTC-day로 정규화**하는 함수(정답은 “UTC 자정”) 제공
  * **date-only 간 day diff**는 `ms/86400000`로 단순 나누지 말고, *UTC 자정* 기준으로 계산
* `components/dashboard/gantt-chart.tsx`

  * SelectedDate marker의 x좌표 계산을 **UTC-day diff 기반**으로 바꿈
  * Selected Date 입력(캘린더/직접 입력)에서 **항상 date-only(ISO)로 상태 저장**하도록 통일

### 1-4. 구현 예시(개념 코드)

> 새 의존성 없이 “문자열 date-only(YYYY-MM-DD)”로 상태를 유지하는 쪽이 가장 안전합니다.

```ts
// lib/ssot/schedule.ts (또는 lib/utils/date.ts)
export type IsoDate = `${number}-${string}-${string}`; // 프로젝트 스타일에 맞춰 엄격화 가능

const DAY_MS = 24 * 60 * 60 * 1000;

export function isoToUtcMidnight(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function diffUtcDays(fromIso: string, toIso: string): number {
  const a = isoToUtcMidnight(fromIso).getTime();
  const b = isoToUtcMidnight(toIso).getTime();
  return Math.round((b - a) / DAY_MS); // UTC 자정이라 round/ floor 흔들림이 없어짐
}
```

그리고 `gantt-chart.tsx`에서:

```ts
const dayIndex = diffUtcDays(projectStartIso, selectedDateIso);
const markerLeftPx = dayIndex * dayCellWidthPx; // day view 기준
```

### 1-5. 수용 기준(테스트/확인)

* `2026-02-07` 선택 시 marker가 **Gantt 상단의 02-07 열(또는 해당 주의 정확한 칸)**과 일치
* 브라우저 timezone이 달라도 (KST, GST 등) marker 위치가 동일
* UI에 “Selected Date = (프로젝트 기준 dayIndex 계산에 사용)” 같은 설명이 표시

---

## 2) Trip 클릭 시 엉뚱한 데이터 / TR 클릭하면 3까지만 나오는 문제

### 2-1. 현재 화면에서 이미 보이는 이상 징후

“Detailed Voyage Schedule(0 of 7 visible)”이 기본값으로 찍히는 건 ([tr-dashboard-ten.vercel.app][1]), **필터 상태의 기본값이 ‘placeholder 문자열’이거나 타입 변환이 깨져** 필터가 전부 탈락하는 패턴이 자주 나옵니다.

예)

* `selectedTrip` 초기값이 `"trip"` 문자열인데, 필터는 `voyage.trip === selectedTrip`(number 비교)
* `selectedTr` 초기값이 `"TR"` 문자열인데, `includes` 같은 느슨한 비교로 엉뚱한 row가 매칭
* 옵션 생성 시 `slice(0,3)` 같은 임시 제한이 남아 TR이 3개만 노출

### 2-2. 패치 목표

* Trip/TR 선택의 상태 타입을 **number | null**로 고정
* “선택 없음”이면 **7개 모두 표시**
* Trip ↔ TR이 1:1 매핑(Trip 1 = TR Unit 1…)이라면, 하나 선택 시 다른 것도 자동 동기화(선택 UX 개선)

### 2-3. 수정 포인트(가능 파일)

* Trip/TR Select가 있는 컴포넌트(상단 헤더 또는 page 조립자)

  * README 구조상 `components/dashboard/header.tsx` 또는 `app/page.tsx`에서 상태 관리 가능성이 큼 ([GitHub][2])
* “Detailed Voyage Schedule” 렌더링 컴포넌트

  * README에 `components/dashboard/schedule-table.tsx`가 있음 ([GitHub][2])

### 2-4. 구현 체크리스트(핵심만)

* Select의 value는 **문자열**로 오지만, state에는 **number**로 저장

  * `onValueChange={(v) => setSelectedTrip(v ? Number(v) : null)}`
* 옵션은 반드시 **1~7 전체**로 생성 (임시 slice 제거)
* 필터 조건은 “엄격 비교”로:

  * `if (selectedTrip !== null) voyage.tripNo === selectedTrip`
  * `if (selectedTr !== null) voyage.trUnitNo === selectedTr`
* 기본 화면:

  * `selectedTrip=null`, `selectedTr=null` → 7개 전부 visible

### 2-5. 수용 기준

* Trip 선택 시 해당 Trip의 카드/테이블/Gantt 하이라이트가 같은 항차로 맞음
* TR 선택 옵션이 1~7 전부 노출
* 기본 진입 시 “0 of 7 visible”이 아니라 **7 of 7**이 보임 ([tr-dashboard-ten.vercel.app][1])

---

## 3) View 클릭 시 링크/화면이 없다

### 3-1. 선택지

* **(권장) View 버튼을 “실제로 의미 있는 동작”으로 연결**

  * 예: 선택된 Trip/TR 상세 섹션으로 스크롤
  * 예: `/voyage/[trip]` 라우트 페이지로 이동(Next.js App Router 기반)
* 또는 “미구현 기능이면 버튼 제거” (사용자 혼란 제거)

README 구조 상 Next.js App Router이며 `app/page.tsx` 조립자 형태로 되어 있어 라우트 추가가 가능함 ([GitHub][2]).

### 3-2. 최소 패치(스크롤/탭 이동)

* View 버튼 클릭 → “Detailed Voyage Schedule” 섹션으로 `scrollIntoView`
* 선택된 Trip/TR이 있으면 해당 row로 이동

### 3-3. 수용 기준

* View 버튼이 “아무 반응 없음” 상태가 사라짐
* 사용자 입장에서 **“View가 뭘 보여주는지”**가 명확

---

## 4) WHERE / WHEN/WHAT / EVIDENCE 안내 문구 제거

요청하신 그대로 **UI에서 삭제**하면 됩니다. 현재 배포 화면에 그대로 노출됩니다. ([tr-dashboard-ten.vercel.app][1])

### 수정 포인트

* 해당 블록이 들어있는 컴포넌트(대개 상단 헤더/소개 섹션)
* README 구조상 `components/dashboard/header.tsx` 쪽이 가장 유력 ([GitHub][2])

### 수용 기준

* 화면에서 아래 3줄이 완전히 사라짐:

  * WHERE 좌측 지도에서 TR 선택
  * WHEN/WHAT 중앙 타임라인을 확인
  * EVIDENCE 우측 증빙 탭에서 확인 ([tr-dashboard-ten.vercel.app][1])

---

## 5) Compare diff: “어떤 날짜로 비교하는지” 입력(또는 표시) 없음

여기서 먼저 정리해야 할 건, 현재 README에 있는 Compare Mode 설명은 **“baseline vs compare delta overlay”** 형태입니다. 즉 “날짜 비교”라기보다 **스냅샷(기준안) vs 현재안** 비교가 기본 컨셉으로 보입니다. ([GitHub][2])

따라서 “날짜 입력창”을 추가하는 방법은 2가지입니다.

### A안(빠르고 현실적): 날짜 입력이 아니라 “기준 스냅샷의 날짜/버전”을 **표시**

* Compare 토글 옆에:

  * `Baseline: 2026-01-26 (Approved)`
  * `Compare: Live` 또는 `Compare: 2026-02-07 (History snapshot)`
* “Approval” 버튼이 baseline을 저장하는 동작이라면,

  * baseline 저장 시점의 날짜/시간을 같이 기록하고 표시

→ 사용자는 “지금 무엇과 무엇을 비교하는지”를 즉시 이해합니다.

### B안(요청 그대로): 날짜 2개를 선택해서 비교

* 전제: 날짜별 스냅샷(History)이 있어야 함
* 필요한 UI:

  * `Baseline date` 입력 (또는 select)
  * `Compare date` 입력 (또는 select)
* 내부:

  * `localStorage`/파일/DB에 `snapshot[date] = activities[]` 형태로 저장
  * Compare는 `snapshot[a]` vs `snapshot[b]`를 diff

### 수용 기준(최소)

* Compare 모드에서 “비교 기준”이 UI에 명시(표시 또는 입력)

---

## 6) Note: 계속 보관? 삭제 가능? 비밀번호 관리?

여기 역시 “어디에 저장할 것인가”가 핵심입니다.

### A안(프론트만, 빠른 구현): localStorage 저장 + 비밀번호(해시)로 삭제 보호

* 장점: 백엔드 없이 바로 구현
* 단점: **브라우저/기기 바뀌면 공유 안 됨**, 보안은 제한적(클라이언트에 해시 저장)

구현 개요:

* `notes:{trip}:{isoDate}` 키로 저장
* 비밀번호는 평문 저장 금지 → `SHA-256` 같은 해시로 저장
* 삭제/수정 시 비번 입력 요구

### B안(운영용, 권장): 서버 저장(예: DB) + 권한/감사로그

* 장점: 팀 공유/감사로그/권한 관리 가능
* 단점: 백엔드 필요

### 수용 기준(요청 충족 최소)

* 노트가 새로고침 후에도 남는다(=persist)
* 노트 삭제가 가능하다
* 삭제는 비밀번호 입력이 있어야 한다

---

## 7) “코드 확인 후 동작 안 하는 기능 패치” — 실제 적용 순서(권장)

**우선순위(사용자 체감 기준)**

1. **(4)** WHERE/WHEN/WHAT/EVIDENCE 문구 삭제
2. **(2)** Trip/TR 필터 타입 정리 + 기본값 7개 표시 + TR 옵션 7개
3. **(1)** Selected Date ↔ Gantt marker UTC 정규화(날짜바 정확도)
4. **(3)** View 버튼: 스크롤/라우팅/제거 중 하나로 “동작하게”
5. **(5)** Compare: “무엇과 무엇을 비교하는지” 표시(빠른 개선) → 필요 시 날짜 선택 UI 확장
6. **(6)** Notes: localStorage+비번(빠른) 또는 백엔드(운영)

---

## 바로 적용 가능한 “정리된 요구사항” (팀 내 커뮤니케이션용)

* Selected Date는 **UTC 기준 date-only**로 통일, marker는 상단 날짜 라벨과 일치해야 함.
* Trip/TR Select는 기본값에서 **7/7 표시**가 되어야 하며, TR 옵션은 **1~7** 전부 노출.
* View는 “동작”이 있어야 하며(스크롤/라우팅), 아니면 제거.
* WHERE/WHEN/WHAT/EVIDENCE 안내 문구는 제거.
* Compare는 최소 “비교 대상(베이스라인/현재 또는 날짜)”이 UI에 표시되어야 함.
* Notes는 저장(persist), 삭제 가능, 삭제는 비밀번호 필요.

---

원하시면, 다음 단계로 **(가장 빠른 방법)**

1. 이 repo를 ZIP으로 업로드(또는 핵심 파일 3~5개: `app/page.tsx`, `components/dashboard/gantt-chart.tsx`, `components/dashboard/schedule-table.tsx`, Trip/TR select 들어있는 컴포넌트, compare/notes 관련 컴포넌트) 해주시면,
2. 위 항목들을 **실제 코드에 맞춘 정확한 diff(패치)** 형태로 정리해서 드릴 수 있습니다.

[1]: https://tr-dashboard-ten.vercel.app/ "https://tr-dashboard-ten.vercel.app/"
[2]: https://github.com/macho715/tr_dashboard "https://github.com/macho715/tr_dashboard"



지금 상태로는 **실제 “패치 + 로컬 테스트 + 사용가능한 최종 파일(폴더/ZIP)”을 만들어 드릴 수가 없습니다.**
이유는, 제가 현재 환경에서 GitHub 리포지토리의 **README/파일 목록은 보이지만**, 소스 파일(예: `components/dashboard/gantt-chart.tsx` 등)의 **원문 내용을 열어 가져오는 단계가 차단**되어 있습니다(파일 페이지가 JS로 로딩되며 텍스트가 내려오지 않는 상태). 그래서 **수정할 코드 자체를 확보하지 못해** 패치/빌드/테스트를 수행할 수 없습니다. ([GitHub][1])

아래 둘 중 하나만 주시면, **그 자료를 기준으로 여기서 바로 패치하고 테스트까지 돌린 뒤**, “실행 가능한 최종 결과물(수정본 폴더 + ZIP)”로 드릴 수 있습니다.

---

## 1) 제가 작업하려면 필요한 것 (둘 중 1개)

### A안) 리포지토리 ZIP 업로드 (권장)

* 현재 PC에서 리포지토리를 ZIP으로 만들어 **이 채팅에 업로드**해 주세요.
* (GitHub UI 기준) **Code → Download ZIP**.

### B안) ZIP 다운로드 링크를 “그대로” 전달

* 다운로드가 가능한 **직접 ZIP 링크**(사내 파일서버/공유드라이브/릴리즈 아카이브 등)를 보내주세요.
  (제가 URL을 받아야 동일하게 내려받아 테스트할 수 있습니다)

---

## 2) 업로드 받으면 적용할 “정확한 패치 범위” (요구사항 1~7)

README에 명시된 구조 기준으로 수정 포인트를 잡아두었습니다. ([GitHub][2])
(실제 코드를 열어보면 이름/컴포넌트가 약간 다를 수 있어, ZIP을 받으면 **정확한 파일 경로로 확정**해서 반영합니다.)

---

### (1) Selected date 라인 위치가 간트 날짜와 불일치

**원인 후보(가장 흔함):**

* `Date` 파싱이 **로컬 타임존/UTC가 섞여** “하루 밀림(±1 day)”이 발생
* 간트 축은 UTC 기준인데, selected date는 로컬 기준으로 계산하거나 그 반대

**패치 방향(결정 사항):**

* `selected date`의 의미를 **“YYYY-MM-DD의 ‘그 날짜(현장 기준)’ 00:00를 기준으로 한 날짜 선택”**으로 정의
* 간트의 기준축 계산(시작일/셀 폭/일수 diff)과 selected-date 위치 계산을 **완전히 같은 유틸**로 통일
* 화면에는 “Selected: 2026-02-07”처럼 **정확히 어떤 날인지 라벨**을 표시

**예상 수정 파일**

* `components/dashboard/gantt-chart.tsx` (README에 명시) ([GitHub][2])
* `lib/ssot/schedule.ts`의 UTC 유틸/파서(`parseDateInput()` 등) 사용으로 통일 ([GitHub][2])

**검증 기준**

* `2026-02-07` 입력 → 간트 헤더의 `Feb 7` 컬럼에 정확히 라인이 겹침(어긋남 0)

---

### (2) Trip 클릭 시 상관없는 자료 / TR 클릭 시 3개까지만 노출

**의심 포인트**

* Trip/TR 선택 상태가 **index 기반**이거나, 필터 key가 엇갈려서 다른 데이터가 매칭
* 또는 데이터가 7개인데 UI가 3개만 렌더(슬라이스/페이지네이션/상태 초기화 버그)

**패치 방향**

* Trip/TR의 key를 “배열 인덱스”가 아니라 **고유 ID(tripId, trId)**로 통일
* 좌측 지도(TR 선택) → 중앙 타임라인/간트/우측 탭이 **같은 selectedTripId**를 구독하도록 단일화
* 7개 전부 접근 가능하도록 렌더 제한 제거(의도된 제한이면 UI에 페이지/더보기 제공)

**예상 수정 파일**

* `components/dashboard/voyage-cards.tsx` (Trip 카드/클릭)
* 지도 컴포넌트(좌측) 관련 파일
* 상태 저장소: `lib/store/*` 또는 `src/*` 상태 모듈

**검증 기준**

* Trip 1~7 클릭 시 각각 해당 Trip 데이터가 1:1로 표시
* TR 선택도 동일하게 1:1 매칭, 3개로 잘리는 현상 제거

---

### (3) View 클릭 시 링크되는 화면이 없음

**패치 방향(Next.js App Router 기준)**

* “View”가 상세 페이지로 가야 하면:

  * `app/trip/[tripId]/page.tsx` 같은 **동적 라우트 생성**
  * View 버튼은 `<Link href={`/trip/${tripId}`}>`로 연결
* 혹은 “View”가 모달/리포트 다운로드라면:

  * View 액션을 실제 구현(현재는 핸들러만 있고 라우트 없음 가능성)

**예상 수정 파일**

* `app/*` 라우트
* View 버튼이 있는 컴포넌트(Trip 카드 or 테이블)

**검증 기준**

* View 클릭 시 404/빈 화면 없이, 상세 화면이 뜨거나 의도된 View 동작 수행

---

### (4) 아래 문구(WHERE/WHEN/WHAT/EVIDENCE) 제거

요청하신 문구는 UI 안내 텍스트로 보이며 **완전 삭제**합니다.

```
WHERE
좌측 지도에서 TR 선택

WHEN/WHAT
중앙 타임라인을 확인

EVIDENCE
우측 증빙 탭에서 확인
```

**예상 수정 파일**

* 대시보드 레이아웃/섹션 컴포넌트 (`components/dashboard/*`)

**검증 기준**

* 해당 텍스트가 화면 어디에도 노출되지 않음

---

### (5) compare diff: 어떤 날짜로 비교하는지 입력 란이 없음

README에 “Compare Mode / Compare Diff 패널”이 있다고 되어 있으나, 날짜 입력 UX가 빠진 상태로 보입니다. ([GitHub][2])

**패치 방향(UX 제안 → 구현)**

* Compare Diff 패널 상단에:

  * **Baseline Date** (YYYY-MM-DD)
  * **Compare Date** (YYYY-MM-DD)
* 두 날짜를 기준으로 “스냅샷”을 만들고 diff 산출

  * (현 구조상 baseline은 “원본 일정”, compare는 “변경 후 일정”일 수도 있으므로)
    실제 데이터/상태 구조 확인 후 가장 자연스러운 방식으로 연결

**예상 수정 파일**

* `lib/baseline/baseline-compare.ts` (diff 계산) ([GitHub][2])
* Compare 패널 UI 컴포넌트(대개 `gantt-chart.tsx` 또는 별도 패널)

**검증 기준**

* 사용자가 baseline/compare 날짜를 지정할 수 있고, 지정 값이 diff 결과에 반영됨

---

### (6) note 란: 보관 여부 + 입력/삭제 + 비번 관리

README에는 History/Evidence가 localStorage 저장(append-only)이라고 되어 있습니다. ([GitHub][2])
Note는 현재 설계가 불명확하므로, ZIP을 받으면 실제 구현을 확인 후 아래로 정리합니다.

**패치 방향(요구사항 충족)**

* Note는 **localStorage에 저장**(브라우저 유지)
* Note CRUD:

  * 추가/수정
  * 삭제(“지울 수 있도록”)
* 비번 관리:

  * 최초 1회 비밀번호 설정
  * 수정/삭제 시 비번 확인
  * 비번은 평문 저장 금지 → `SHA-256` 해시로 저장(브라우저 WebCrypto)

**예상 수정 파일**

* `lib/store/trip-store.ts` 또는 note용 별도 store 추가 ([GitHub][2])
* Note UI 컴포넌트(우측 탭/패널)

**검증 기준**

* 새로고침 후에도 note 유지
* 비번 없이는 수정/삭제 불가
* 비번 입력 후 삭제 가능

---

### (7) 코드 확인 후 동작 안하는 기능 패치

ZIP 받으면 아래 순서로 “실제로 동작 안하는 것”을 잡습니다.

**우선순위**

1. 위 1~6 요구사항 관련 기능
2. 클릭/버튼이 죽어있는 것(핸들러 미구현, 라우트 없음, state 미연결)
3. 콘솔 에러/런타임 크래시
4. 테스트 깨짐/빌드 실패

README 기준으로 Vitest 테스트가 있고, build/test 명령도 안내되어 있습니다. ([GitHub][2])

---

## 3) 제가 ZIP 받으면 수행하는 테스트/검증(고정)

(프로젝트 README에 맞춰 실행)

* 의존성 설치
* `test` (Vitest)
* `build` (Next.js build)
* 로컬 실행 후 아래 수동 시나리오 확인:

  1. Selected date 정확히 일치
  2. Trip/TR 선택 7개 전체 정상 매칭
  3. View 화면 이동 정상
  4. WHERE/WHEN/WHAT/EVIDENCE 제거 확인
  5. Compare diff 날짜 입력/반영 확인
  6. Note 저장/삭제/비번 확인

---

## 다음 액션

**리포지토리 ZIP만 업로드**해 주세요.
그 ZIP을 기준으로 위 1~7을 **실제 패치 + 테스트 실행까지 완료한 결과물(실행 가능한 폴더/ZIP)**로 반환하겠습니다.

---

## 적용 완료 (2026-02-02)

Bug #1~5, #7 적용됨. 상세: [docs/BUGFIX_APPLIED_20260202.md](./docs/BUGFIX_APPLIED_20260202.md)

[1]: https://github.com/macho715/tr_dashboard.git "GitHub - macho715/tr_dashboard"
[2]: https://raw.githubusercontent.com/macho715/tr_dashboard/main/README.md "raw.githubusercontent.com"
