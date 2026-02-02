# HVDC TR Transport Dashboard

**Real-time logistics dashboard for HVDC TR Transport operations at Al Ghallan Island (AGI Site)**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)

---

## 📋 프로젝트 개요

HVDC TR Transport Dashboard는 **7개의 Transformer Unit**을 **LCT BUSHRA**로 운송하는 프로젝트의 실시간 물류 대시보드입니다.

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

### 주요 기능

- **실시간 KPI 모니터링**: 총 일수, 항차 수, SPMT 세트, TR Unit 추적
- **Gantt 차트**: 7개 항차의 시각적 일정 관리 (Jan 26 - Mar 22, 2026)
- **스케줄 재계산 엔진**: 의존성 기반 자동 일정 조정
- **Preview 패널**: 변경 사항 미리보기 및 충돌 검사
- **Compare Mode**: baseline vs compare delta overlay, Gantt ghost bars, **Compare Diff 패널**
- **날짜 변경 UI**: Calendar + 직접 입력으로 시작일 변경
- **항차 상세 정보**: Load-out, Sail-away, Load-in, Turning, Jack-down 일정
- **History/Evidence (append-only)**: History 입력, Evidence 링크 추가, localStorage 저장
- **Trip Report Export**: MD/JSON 보고서 다운로드
- **Next Trip Readiness**: Ready/Not Ready 배지, 마일스톤/증빙/블로커 체크리스트

---

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js**: 20.x 이상 (LTS 권장) - `.nvmrc` 파일로 버전 고정
- **패키지 매니저**: pnpm (권장) / npm / yarn

### 설치

```bash
# Node.js 버전 확인 (nvm 사용 시)
nvm use  # .nvmrc 파일에서 버전 자동 로드

# 패키지 매니저 확인 (자동 감지)
node tools/detect_pm_and_scripts.mjs

# 의존성 설치
pnpm install
# 또는
npm install
```

### 환경 변수 설정 (선택사항)

현재 프로젝트는 환경 변수를 사용하지 않지만, 향후 확장을 위해 템플릿이 제공됩니다:

```bash
# config/env.example을 복사하여 .env.local 생성
cp config/env.example .env.local

# 필요한 환경 변수 값 입력
# NEXT_PUBLIC_API_URL=https://api.example.com
```

### 개발 서버 실행

```bash
pnpm run dev
# 또는
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

### 빌드

```bash
pnpm run build
pnpm run start
```

---

## 🏗️ 기술 스택

### Core

- **Next.js 16.0.10** (App Router)
- **React 19.2.0**
- **TypeScript 5.x**
- **Tailwind CSS 4.1.9** (OKLCH 색상 공간)

### UI 컴포넌트

- **Radix UI** (Dialog, Calendar, Button 등)
- **Lucide React** (아이콘)
- **react-day-picker 9.8.0** (날짜 선택)

### 스타일링

- **Deep Ocean Theme** (OKLCH 기반)
- **Glass morphism** 효과
- **그라데이션** 및 **글로우** 효과

---

## 📁 프로젝트 구조

```
hvdc-tr-dashboard/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 루트 레이아웃 (메타데이터, 폰트)
│   ├── page.tsx           # 홈 페이지 (조립자)
│   └── globals.css        # Deep Ocean Theme 스타일
├── components/
│   ├── dashboard/         # 대시보드 섹션 컴포넌트
│   │   ├── header.tsx
│   │   ├── kpi-cards.tsx
│   │   ├── alerts.tsx
│   │   ├── voyage-cards.tsx
│   │   ├── schedule-table.tsx
│   │   ├── gantt-chart.tsx  # Gantt 차트 + 날짜 변경 UI
│   │   └── footer.tsx
│   ├── gantt/
│   │   └── SchedulePreviewPanel.tsx  # Preview 패널
│   ├── dashboard/
│   │   └── back-to-top.tsx  # Back to Top 버튼
│   └── ui/                # Radix UI 기반 컴포넌트
├── lib/
│   ├── ssot/              # Single Source of Truth
│   │   └── schedule.ts   # 스케줄 타입 정의 + UTC 날짜 유틸
│   ├── store/
│   │   └── trip-store.ts  # History/Evidence localStorage (append-only)
│   ├── reports/
│   │   └── trip-report.ts # Trip Report 생성 + MD/JSON Export
│   ├── baseline/
│   │   └── baseline-compare.ts  # computeActivityDiff (Compare Diff)
│   ├── data/
│   │   └── schedule-data.ts  # data/schedule/option_c.json 로더 + scheduleActivitiesToGanttRows() 변환 함수
│   ├── utils/
│   │   ├── schedule-reflow.ts  # 재계산 엔진
│   │   ├── schedule-mapper.ts  # option_c.json → ScheduleActivity 매핑
│   │   └── utils.ts
│   └── dashboard-data.ts  # 정적 데이터 (KPI, 항차, Gantt)
├── data/schedule/
│   └── option_c.json      # 마스터 스케줄 데이터 (139개 활동)
├── config/                # 설정 파일
│   ├── prettierignore     # Prettier 제외 목록
│   └── env.example        # 환경변수 템플릿
├── docs/                  # 문서
│   ├── guides/            # 가이드 (agi-schedule-updater, patch-guide, termux-ssh-cursor)
│   └── ...
├── tools/                 # 개발 도구
│   └── detect_pm_and_scripts.mjs  # 패키지 매니저·스크립트 탐지 (CI용)
└── .cursor/               # Cursor IDE 규칙
    ├── rules/             # 코딩 규칙 (.mdc)
    ├── commands/          # 커스텀 명령어
    └── config/            # 워크스페이스 설정
```

---

## 🎯 주요 기능 상세

### 1. 스케줄 재계산 엔진 (`lib/utils/schedule-reflow.ts`)

의존성 그래프 기반 자동 일정 조정:

- **불변성 보장**: 깊은 복사로 원본 데이터 보호
- **사이클 탐지**: DFS 기반 의존성 사이클 검사
- **UTC 날짜 연산**: 타임존 안전한 날짜 계산
- **Lock/Constraint 처리**: 잠금 작업 및 제약 조건 존중
- **SUMMARY rollup**: 요약 활동 자동 계산

**사용 예시:**

```typescript
import { reflowSchedule } from "@/lib/utils/schedule-reflow"

const result = reflowSchedule(
  scheduleActivities,
  "ACT-001",
  "2026-02-15",
  {
    respectLocks: true,
    respectConstraints: true,
    detectCycles: true,
  }
)

// result.activities: 재계산된 활동 목록
// result.impact_report: 영향받은 작업 및 충돌 정보
```

### 2. Gantt 차트 (`components/dashboard/gantt-chart.tsx`)

- **동적 데이터 렌더링**: `currentActivities` 상태로 실시간 업데이트
- **데이터 변환**: `scheduleActivitiesToGanttRows()` 함수로 ScheduleActivity[] → GanttRow[] 변환
- **시각적 일정 표시**: 7개 항차의 타임라인
- **인터랙티브 활동 바**: 호버 시 Tooltip, 클릭 시 날짜 변경 Dialog
- **마일스톤 표시**: 주요 이벤트 마커
- **레전드**: 활동 타입별 색상 구분

### 3. 날짜 변경 UI

- **Tooltip 버튼**: 활동 바 호버 → "날짜 변경" 버튼
- **Dialog**: Calendar + 직접 입력 (YYYY-MM-DD)
- **타임존 안전**: `parseDateInput()` 함수로 로컬 타임존 파싱
- **재계산 실행**: Dialog에서 직접 `reflowSchedule` 호출

### 4. Preview 패널 (`components/gantt/SchedulePreviewPanel.tsx`)

- **변경 사항 목록**: 영향받은 작업의 이전/이후 날짜
- **충돌 경고**: 의존성 사이클, 잠금 위반, 제약 조건 위반
- **적용/취소**: Preview 적용 시 `currentActivities` 상태 업데이트 및 Gantt 차트 자동 리렌더링

### 5. 데이터 변환 함수 (`lib/data/schedule-data.ts`)

**`scheduleActivitiesToGanttRows()` 함수:**

- **목적**: ScheduleActivity[] → GanttRow[] 변환 (Gantt 차트 렌더링용)
- **변환 로직**:
  - level1별 그룹화 → level1 SUMMARY는 Header row로 변환 (`isHeader: true`)
  - level2별 그룹화 → level2 SUMMARY는 일반 row로 변환
  - LEAF 활동만 Activity[]로 변환 (SUMMARY 제외)
  - AnchorType → ActivityType 매핑:
    - `LOADOUT` → `loadout`
    - `SAIL_AWAY` → `transport`
    - `BERTHING` / `LOADIN` → `loadin`
    - `TURNING` → `turning`
    - `JACKDOWN` → `jackdown`
    - 기본값 → `mobilization`
- **사용 위치**: `gantt-chart.tsx`에서 `currentActivities` 상태를 GanttRow[]로 변환

**사용 예시:**

```typescript
import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data"

const ganttRows = scheduleActivitiesToGanttRows(currentActivities)
// ganttRows: GanttRow[] (렌더링용 데이터)
```

### 6. Activity 스크롤 기능 (`components/dashboard/gantt-chart.tsx`)

- **DOM 참조 관리**: `activityRefs` Map으로 각 Activity의 DOM 요소 참조 저장
- **스크롤 함수**: `scrollToActivity(activityId)` 함수로 부드러운 스크롤
- **Activity ID 매칭**: Activity label에 ID 포함 (`A1002: Activity Name` 형식)

---

## 🔧 개발 명령어

### 패키지 매니저 자동 감지

```bash
node tools/detect_pm_and_scripts.mjs
```

### 검증

```bash
# 타입 체크
pnpm run typecheck

# 린트 (ESLint)
pnpm run lint

# 코드 포맷팅 (Prettier - 수동 실행)
npx prettier --check .

# 빌드 테스트
pnpm run build
```

### 코드 품질 도구

프로젝트에는 다음 코드 품질 도구가 설정되어 있습니다:

- **ESLint**: `eslint.config.mjs` - Next.js 16 flat config (core-web-vitals + TypeScript)
- **Prettier**: `package.json` "prettier" - 코드 포맷팅 일관성
- **TypeScript**: `tsconfig.json` - 타입 체크

### Cursor 커스텀 명령어

- `/diagnose-env`: 환경 진단 (lockfile + scripts 확인)
- `/validate`: 검증 게이트 실행 (존재하는 스크립트만)
- `/guard-theme`: 테마 보존 확인

---

## 📐 아키텍처 원칙

### SSOT (Single Source of Truth)

- **타입 정의**: `lib/ssot/schedule.ts`
- **데이터 로더**: `lib/data/schedule-data.ts`
- **중복 금지**: 동일 enum/상수를 여러 파일에 정의하지 않음

### 계산 vs 렌더 분리

- **계산 로직**: `lib/utils/*` (순수 함수)
- **UI 렌더링**: `components/*` (계산 로직 금지)

### 컴포넌트 책임 분리

- **조립자**: `app/page.tsx` (섹션 컴포넌트 import만)
- **섹션 컴포넌트**: `components/dashboard/*` (렌더링 전용)
- **유틸 함수**: `lib/utils/*` (순수 함수)

---

## 🎨 테마 및 스타일

### Deep Ocean Theme

- **색상 공간**: OKLCH
- **주요 색상**: Cyan/Teal 그라데이션
- **배경**: 어두운 그라데이션 + 그리드 오버레이
- **글래스 효과**: `bg-glass` 유틸 클래스

### 커스텀 유틸 클래스

- `.bg-glass`: 반투명 배경 + 블러
- `.shadow-glow`: 글로우 효과
- `.shadow-cyan`: Cyan 그림자
- `.shadow-voyage`: 항차 카드 그림자

---

## 📊 데이터 흐름

### 스케줄 데이터 흐름

```
data/schedule/option_c.json (139개 활동)
    ↓
schedule-mapper.ts (TR Unit, Anchor 타입, 자원 태그 추출)
    ↓
schedule-data.ts (scheduleActivities)
    ↓
scheduleActivitiesToGanttRows() (ScheduleActivity[] → GanttRow[] 변환)
    ↓
gantt-chart.tsx (currentActivities 상태 → 동적 렌더링)
    ↓
사용자 클릭 → Dialog → reflowSchedule()
    ↓
Preview 패널 (변경 사항 표시)
    ↓
적용 → setCurrentActivities() → Gantt 차트 자동 리렌더링
```

---

## 🔒 보안 및 규칙

### 절대 규칙 (Hard Rules)

1. **UI 스타일 보존**: `globals.css`의 Deep Ocean Theme 변경 금지
2. **구조 보존**: `app/layout.tsx`, `app/page.tsx` 조립 패턴 유지
3. **추측 금지**: 파일/스크립트 존재 확인 전 단정 금지
4. **NDA/PII 금지**: API Key, 토큰, 계정정보, PII 기록 금지

### 커밋 규칙

- **Structural commit**: 구조 변경만 (리네이밍, 추출, 이동)
- **Behavioral commit**: 기능 추가/수정
- **분리 원칙**: 구조와 행위 변경을 동일 커밋에 포함하지 않음

---

## 📚 참고 문서

- [SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) - **시스템 아키텍처 상세** (레이어 구조, 데이터 흐름, 핵심 컴포넌트)
- [VERCEL.md](./docs/VERCEL.md) - Vercel 배포 설정 가이드
- [.cursor/rules/](./.cursor/rules/) - Cursor IDE 규칙
- [termux-ssh-cursor.md](./docs/guides/termux-ssh-cursor.md) - Termux SSH → Cursor 터미널 연결 가이드

---

## 🧪 테스트

- **Vitest**: 160 tests passed (state-machine, reflow, collision, baseline, evidence 등)
- **실행**: `pnpm test -- --run`

---

## 🚧 향후 계획

- [x] ScheduleActivity → GanttRow 변환 유틸 완성 ✅
- [x] 실제 데이터 반영 로직 (Preview 적용 시) ✅
- [ ] Undo/Redo 기능
- [ ] localStorage 저장
- [ ] DeadlineLadder 연동 (문서 마감)
- [ ] ResourceTag 충돌 탐지 고도화

---

## 📝 라이선스

Private project - Samsung C&T × Mammoet

---

## 👥 기여

프로젝트 규칙은 `.cursor/rules/` 및 `agent.md`를 참고하세요.

---

**Last Updated**: 2026-02-02

---

## ⚙️ 개발 환경 설정

### 필수 설정 파일

프로젝트에는 다음 설정 파일들이 포함되어 있습니다:

- **`eslint.config.mjs`**: ESLint flat config (Next.js 16 + TypeScript 규칙)
- **`package.json` "prettier"**: Prettier 코드 포맷팅 설정
- **`config/prettierignore`**: Prettier 제외 파일 목록
- **`.nvmrc`**: Node.js 버전 고정 (20)
- **`config/env.example`**: 환경 변수 템플릿
- **`tsconfig.json`**: TypeScript 컴파일러 설정
- **`next.config.mjs`**: Next.js 빌드 설정
- **`components.json`**: shadcn/ui 설정

### IDE 설정 권장사항

**VS Code / Cursor**:
- ESLint 확장 프로그램 설치
- Prettier 확장 프로그램 설치
- 저장 시 자동 포맷팅 활성화 (선택사항)

**설정 예시** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 📝 최근 업데이트

### Phase 5: SSOT Upgrade v1.0 (patchm1~m5, 2026-02-02)

#### PR#1: Upload 제거 + BulkAnchors 숨김
- ✅ **BulkAnchors**: 기본 숨김 (`showBulkAnchors={false}`), Ops Tools에서만 노출
- ✅ **Upload 제거**: EvidenceUploadModal 삭제, Evidence는 링크/URL 입력만

#### PR#2: SSOT 타입 확장
- ✅ **Trip**: closeout, baseline_id_at_start, milestones, status
- ✅ **TripCloseout, TripReport, ProjectReport**: patchm1 §3.6, §3.7
- ✅ **BlockerCode**: PTW_MISSING, CERT_MISSING, WX_NO_WINDOW 등

#### PR#3: History/Evidence 입력 + 저장 (append-only)
- ✅ **lib/store/trip-store.ts**: localStorage 기반 History/Evidence 저장
- ✅ **HistoryTab**: Add event (note, delay, decision, risk, milestone, issue)
- ✅ **EvidenceTab**: Add link (URL/경로) — 파일 업로드 대체

#### PR#4: Compare Diff 패널
- ✅ **CompareDiffPanel**: Baseline vs Current diff 테이블
- ✅ **computeActivityDiff**: shift/add/remove/change 분류
- ✅ **HistoryEvidencePanel**: Compare Diff 탭 추가

#### PR#5: Trip Report Source + Export
- ✅ **lib/reports/trip-report.ts**: generateTripReport, tripReportToMarkdown, tripReportToJson
- ✅ **TripCloseoutForm**: Export MD/JSON 다운로드

#### PR#6: Next Trip Readiness 패널
- ✅ **ReadinessPanel**: Ready/Not Ready 배지, milestones, missing evidence, blockers

---

### Phase 4: UI Foundation (2026-02-02)

#### 신규 컴포넌트 (28개 파일)
- ✅ **Global Control Bar**: Trip/TR 선택, Date Cursor, View Mode(Live/History/Approval/Compare), Risk Overlay 토글
- ✅ **DashboardLayout**: ViewModeProvider, 3-column layout orchestration
- ✅ **MapPanel**: Leaflet 기반 지도 + TR 마커 + 상호 하이라이트
- ✅ **TimelinePanel**: Gantt 차트 통합, Activity 선택
- ✅ **DetailPanel**: Activity Inspector (Header, State, Plan vs Actual, Resources, Constraints, Collision Tray)
- ✅ **WhyPanel**: 2-click Collision UX (Root cause + suggested_actions)
- ✅ **ReflowPreviewPanel**: suggested_action → reflowSchedule → Preview UI
- ✅ **HistoryEvidencePanel**: History | Evidence | Compare Diff | Trip Closeout 탭
- ✅ **EvidenceTab/HistoryTab**: Evidence 링크 추가, History append-only 입력

#### State Machine & Evidence (Phase 3)
- ✅ **State Machine**: `src/lib/state-machine/` - Activity 상태 전이 (ALLOWED_TRANSITIONS, Evidence Gates)
- ✅ **Evidence Gate**: before_start, after_end 증빙 검증
- ✅ **테스트**: 124 tests passed (state-machine, evidence-gate, reflow, collision 등)

#### 스케줄 엔진 고도화
- ✅ **Forward Pass**: 의존성 기반 일정 재계산 + Constraint snapping + Resource 교집합
- ✅ **Backward Pass**: Slack 계산 (ES/EF/LS/LF) + Critical path 식별
- ✅ **Collision Detection**: 자원 충돌, 시간 충돌, 의존성 사이클 탐지
- ✅ **Reflow Manager**: Preview → Apply 2단계 워크플로우

#### API & 데이터 통합
- ✅ **SSOT API**: `/api/ssot` route - option_c.json 제공
- ✅ **Map Status Colors**: Activity 상태별 색상 매핑
- ✅ **View Mode Store**: Zustand 기반 Live/History/Approval/Compare 상태 관리

#### 문서 & 자동화
- ✅ **WORK_LOG_20260202.md**: Phase 4-11 상세 작업 이력
- ✅ **pipeline-git-autocommit 서브에이전트**: 파이프라인 통과 후 자동 Git commit/push
- ✅ **StoryHeader 개선**: Empty state에 WHERE/WHEN/WHAT/EVIDENCE 가이드 추가

### 이전 릴리즈 (2026-01-22)
- ✅ **Activity 스크롤 기능**: Activity 클릭 시 Gantt 차트로 자동 스크롤
- ✅ **페이지 구조 개선**: `SectionNav` (sticky 네비게이션), `BackToTop` 버튼
- ✅ **실제 데이터 로딩**: `data/schedule/option_c.json`에서 139개 활동 로드
```
