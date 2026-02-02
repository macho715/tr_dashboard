# DocOps — 최신 작업 내용 반영 (필수)

**원칙**: 각 서류마다 최신 작업 내용을 반영하여 문서를 업데이트한다. DocOps에서 가장 중요한 단계.

**본문 내용 업데이트 (필수)**: 메타(날짜/Refs)만이 아니라 **본문(섹션·문구·설명)** 도 최신 작업에 맞게 수정한다.  
- UI/코드가 변경되면 문서의 해당 설명을 실제와 일치시키고(예: WHERE/WHEN/WHAT → Location/Schedule/Verification),  
- 새 기능/버그픽스가 반영되면 해당 컴포넌트·섹션에 설명을 추가·수정한다.

## 1. 최신 작업 소스 (우선순위)

| 순위 | 소스 | 용도 |
|------|------|------|
| 1 | `docs/WORK_LOG_*.md` | Phase/작업 요약, 변경 파일, 완료일 |
| 2 | `docs/BUGFIX_APPLIED_*.md` | 버그픽스 항목, 수용 기준, 변경 파일 |
| 3 | `docs/IMPLEMENTATION_SUMMARY.md` | 구현 요약, 버전/Phase |
| 4 | `docs/plan/*.md` (verification-report, tr-dashboard-plan-patch4 등) | 계획/검증 결과, Task 완료 |
| 5 | `docs/00_INBOX/chat/*.md` | 대화 요약/회의 메모 (있으면 반영) |

## 2. 문서별 반영 규칙

### 2.1 SSOT/계약 문서 (patch.md, AGENTS.md)

- **최종 업데이트** 날짜를 최신 작업일과 맞춘다.
- 하단 **Refs** 또는 본문에 `WORK_LOG_YYYYMMDD.md`, `BUGFIX_APPLIED_YYYYMMDD.md` 링크를 둔다.
- 적용된 **Phase/버그 번호**를 요약 문단에 언급한다 (예: Phase 6 Bugfix #1~5,#7 적용).

### 2.2 설계 문서 (docs/LAYOUT.md, docs/SYSTEM_ARCHITECTURE.md)

- **최종 업데이트** / **버전**을 최신 작업일·Phase에 맞춘다.
- **참고 문서** 또는 **Refs**에 `WORK_LOG_*.md`, `BUGFIX_APPLIED_*.md` 링크 추가.
- **본문 내용**: 변경된 UI/코드에 맞게 해당 섹션 문구를 수정한다.  
  - 예: StoryHeader가 WHERE/WHEN/WHAT → Location/Schedule/Verification으로 바뀌었으면, 문서 전체에서 해당 용어·설명을 현재 UI와 일치하도록 고친다.  
  - 예: DatePicker/Gantt에 UTC 정렬이 적용되었으면, 해당 컴포넌트 설명에 "Selected Date UTC 정렬(dateToIsoUtc, toUtcNoon)"을 추가한다.  
  - 예: GlobalControlBar에 View 버튼이 추가되었으면, 본문에 View 버튼 동작(→ Schedule 스크롤)을 명시한다.  
  - 예: CompareDiffPanel에 Baseline/Compare as-of 표시가 추가되었으면, 본문에 그 내용을 반영한다.

### 2.3 계획/검증 (docs/plan/*.md)

- **갱신일** / **생성일**을 작업일과 맞춘다.
- Task 완료 시 체크 및 "완료일" 또는 "Phase X 적용" 표기.
- `docs/plan/tr-dashboard-verification-report.md`가 있으면 결과(PASS/FAIL) 반영.

### 2.4 인덱스/메타 (docs/INDEX.md, docs/README 등)

- **updated** (frontmatter 또는 본문) 를 최신 작업일로.
- 최신 WORK_LOG/BUGFIX/IMPLEMENTATION_SUMMARY를 인덱스 표에 포함.

### 2.5 가이드 (docs/guides/*.md)

- 관련 Phase/기능이 반영되면 "최종 반영: YYYY-MM-DD, Phase X" 한 줄 추가.
- Refs에 WORK_LOG/BUGFIX 링크 (해당 시점 문서만).

## 3. 실행 순서 (DocOps Autopilot 내)

1. **소스 수집**: WORK_LOG_*.md, BUGFIX_APPLIED_*.md, IMPLEMENTATION_SUMMARY.md, plan/*, 00_INBOX/chat/* 읽기.
2. **대상 문서 목록**: patch.md, AGENTS.md, docs/LAYOUT.md, docs/SYSTEM_ARCHITECTURE.md, docs/INDEX.md, docs/plan/*.md, docs/guides/*.md.
3. **문서별 반영**: 위 규칙에 따라 (1) "최종 업데이트" 날짜, Refs 링크, Phase/버그 요약 문구 추가·수정, **(2) 본문 내용을 최신 작업에 맞게 수정**(해당 섹션 문구·용어·동작 설명을 실제 UI/코드와 일치시킴).
4. **검증**: 반영 후 docops verify 실행.

## 4. 금지

- 소스에 없는 내용을 지어내지 않는다.
- 최신 작업 소스가 없으면 "최종 업데이트"만 현재일로 올리고, Refs는 기존 유지.
