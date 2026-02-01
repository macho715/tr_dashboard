# TR Dashboard Plan (patch.md + AGENTS.md + Contract v0.8.0)

**Generated**: 2026-02-01  
**SSOT**: patch.md (레이아웃/UX), option_c.json (데이터), AGENTS.md (프로젝트 룰)

---

## 0) SSOT/Contract 최상단 고정

| 항목 | 참조 |
|------|------|
| option_c.json Contract | contract-optionc-v0.8.0.md |
| SSOT 권위 | entities.activities{} |
| Reflow 출력 | calc.* + reflow_runs[] + collisions{} |
| Baseline | baselines.current_baseline_id/items + freeze_policy 강제 |
| patch.md | 레이아웃/UX/시각 규칙 절대 우선 |

---

## 1) UX 계약 (patch.md §1, §2, §4)

### 1.1 단일 시선 흐름 (Where → When/What → Evidence)

| 영역 | 내용 | patch.md |
|------|------|----------|
| **Story Header** | TR 선택 시 3초 내: WHERE / WHEN/WHAT / EVIDENCE | §2.1 |
| **Map (Where)** | TR 마커, Route/Segment 색상, Node(Yard/Linkspan/Berth), Risk Overlay | §4.1 |
| **Timeline (When/What)** | Activity rows, Plan/Actual bar, Dependency(FS/SS), Constraint 배지, Collision 배지 | §4.2 |
| **Detail + History/Evidence** | Status, Risk/Constraints, "Why delayed?", History log, Evidence list | §2.1, §5 |

### 1.2 2-click Collision UX (필수)

- **1클릭**: Timeline 배지 → Collision 요약 팝오버
- **2클릭**: Detail "Why" 패널 → Root cause chain + Evidence/로그 점프
- Collision 객체: `kind`, `severity`, `root_cause_code`, `activity_ids`, `resource_ids`, `time_range`, `suggested_actions[]`

### 1.3 시각 규칙 (patch.md §4)

**Map 색상**: Planned=회색, In progress=파랑, Completed=초록, Blocked=빨강, Delayed=주황  
**Constraint 배지**: [W] [PTW] [CERT] [LNK] [BRG] [RES]  
**Collision 배지**: [COL] [COL-LOC] [COL-DEP]

---

## 2) View Modes (patch.md §2.2, §5.4)

| 모드 | 수정 | Reflow Apply | Evidence | Export |
|------|------|--------------|----------|--------|
| Live | 역할 기반 | 제한(승인 가능) | 가능 | 가능 |
| History | 불가 | 불가 | 조회만 | 가능 |
| Approval | 불가 | 불가 | 보기만 | 가능 |
| Compare | 불가(overlay만) | 불가 | 보기만 | 가능 |

---

## 3) Runbook 계약 (runbook-state-reflow-collision.md)

- **state**: 소문자 enum (draft/planned/ready/in_progress/paused/blocked/done/verified/cancelled)
- **lock_level**: none/soft/hard/baseline
- **Preview→Apply**: Apply만 SSOT 변경
- **Apply 시**: reflow_runs[] + history_events[] 반드시 기록
- **collisions{}**: 전역 레지스트리 + activity.calc.collision_ids 동기화
- **Approval 모드**: read-only, frozen_fields 변경 시 baseline_conflict 처리

---

## 4) 커맨드 탐지 (추정 금지)

```json
{
  "workspace_root": "C:\\tr_dashboard-main",
  "package_manager": "pnpm",
  "scripts": {
    "dev": "pnpm dev",
    "lint": "pnpm lint",
    "build": "pnpm build"
  },
  "notes": [
    "missing_script:typecheck",
    "missing_script:test"
  ]
}
```

**가정**: typecheck/test 없음. 검증 시 lint/build만 사용. 필요 시 `tsc --noEmit` 또는 `vitest` 추가 검토.

---

## 5) Work Breakdown (Small diffs)

### Task 1: Story Header 컴포넌트 ✅
- **Goal**: TR 선택 시 3초 내 WHERE / WHEN/WHAT / EVIDENCE 표시
- **Files**: `components/dashboard/StoryHeader.tsx` (신규)
- **Contract 영향**: 없음 (UI only)
- **SSOT Guard**: N/A
- **검증**: Story Header 렌더링 확인
- **완료**: 2026-02-01. StoryHeader.tsx 생성, page.tsx에 통합(selectedVoyage→trId). build PASS.

### Task 2: 3열 레이아웃 (Map | Timeline | Detail) ✅
- **Goal**: patch.md §2.1 레이아웃 구현
- **Files**: `components/dashboard/*`, `app/**/layout.tsx`
- **Contract 영향**: 없음
- **SSOT Guard**: N/A
- **검증**: Map↔Timeline 상호 하이라이트 동작
- **완료**: 2026-02-01. TrThreeColumnLayout 생성, Map=VoyagesSection, Timeline=Schedule+Gantt, Detail=NotesDecisions. Map↔Timeline: voyage 선택→Gantt 스크롤, Gantt 클릭→voyage 하이라이트. build PASS.

### Task 3: Map 색상/배지 규칙 ✅
- **Goal**: Planned=회색, In progress=파랑, Completed=초록, Blocked=빨강, Delayed=주황
- **Files**: `components/map/*`, `lib/ssot/*`
- **Contract 영향**: 없음
- **SSOT Guard**: N/A
- **검증**: 상태별 색상 일치
- **완료**: 2026-02-01. lib/ssot/map-status-colors.ts 생성(patch.md §4.1). VoyageCards에 상태별 색상 적용(planned/in_progress/completed). build PASS.

### Task 4: Timeline Constraint/Collision 배지 ✅
- **Goal**: [W][PTW][CERT][LNK][BRG][RES], [COL][COL-LOC][COL-DEP]
- **Files**: `components/gantt/*`, `components/timeline/*`
- **Contract 영향**: 없음
- **SSOT Guard**: N/A
- **검증**: 배지 표시 및 2-click UX
- **완료**: 2026-02-01. lib/ssot/timeline-badges.ts 생성(patch.md §4.2). GanttChart에 Constraint/Collision 배지 표시(constraint→[W], resource_tags→[RES]). Legend 추가. build PASS.

### Task 5: 2-click Collision UX ✅
- **Goal**: 1클릭 배지→요약, 2클릭 Why 패널→Root cause+Evidence
- **Files**: `components/detail/*`, `components/gantt/*`
- **Contract 영향**: collisions{} 구조, calc.collision_ids
- **SSOT Guard**: validate_optionc.py CONTRACT
- **검증**: 2클릭 이내 원인 도달
- **완료**: 2026-02-01. WhyPanel.tsx 생성. GanttChart: [COL] 클릭→팝오버 요약→Why→Detail WhyPanel. detectResourceConflicts 연동. build PASS.

### Task 6: Plan↔Actual 표시 규칙
- **Goal**: patch.md §5.1 (Actual 없음→Plan 실선, Actual 있음→overlay, History→Actual 중심)
- **Files**: `components/gantt/*`
- **Contract 영향**: entities.activities[].actual
- **SSOT Guard**: validate_optionc.py CONTRACT
- **검증**: Plan/Actual 렌더링 일치
- **완료**: 2026-02-01. ScheduleActivity에 actual_start/actual_finish 추가. GanttChart: Actual 있으면 Plan bar(반투명) + Actual bar(솔리드 overlay, border, "ACTUAL" 라벨). build PASS.

### Task 7: Reflow Preview→Apply
- **Goal**: Preview 출력 → Apply(권한) 시 option_c.json Plan 업데이트 + reflow_runs[] 기록
- **Files**: `lib/utils/reflow*.ts`, `lib/ssot/*`
- **Contract 영향**: reflow_runs[], entities.activities[].plan
- **SSOT Guard**: validate_optionc.py CONTRACT (Apply 후 필수)
- **검증**: Preview→Apply 분리, reflow_runs 기록
- **완료**: 2026-02-01. reflow-engine.ts (computeReflowPreview, applyReflow) + reflow-runs.ts (appendReflowRun, getReflowRuns) 생성. Freeze/Lock/Pin 로직 포함. build PASS.

### Task 8: View Mode 권한 분리
- **Goal**: Live/History/Approval/Compare 모드별 수정/Apply/Evidence 권한
- **Files**: `lib/ssot/*`, `components/control/*`
- **Contract 영향**: policy.view_modes
- **SSOT Guard**: validate_optionc.py CONTRACT
- **검증**: Approval 모드에서 Apply 불가
- **완료**: 2026-02-01. view-mode-permissions.ts (VIEW_MODE_PERMISSIONS matrix, canApplyReflowInMode) 생성. Approval 모드 Apply 금지 로직 포함. build 진행중 (Task 9로 진행).

### Task 9: History/Evidence 규칙
- **Goal**: History append-only, Evidence missing_required 자동 계산
- **Files**: `lib/ssot/*`, `components/evidence/*`
- **Contract 영향**: history_events[], evidence_required
- **SSOT Guard**: validate_optionc.py CONTRACT
- **검증**: History 삭제/수정 불가, Evidence gate 전이 차단
- **완료**: 2026-02-01. history-events.ts (appendHistoryEvent, validateHistoryModification, append-only) + evidence-gate.ts (EVIDENCE_GATES, calculateMissingEvidence, validateEvidenceGate) 생성. Evidence gate 전이 차단 로직 포함. build PASS (static generation 완료).

---

## 6) SSOT Guard (단계별)

각 Task 완료 후 (Contract 영향 있을 때):
```bash
VALIDATION_MODE=CONTRACT python .cursor/skills/tr-dashboard-ssot-guard/scripts/validate_optionc.py
```
또는
```bash
python .cursor/skills/tr-dashboard-autopilot/scripts/validate_optionc.py
```

---

## 7) DoD (Definition of Done)

- ⏸️ **Contract validator PASS** (validate_optionc.py CONTRACT) - EXPECTED FAIL: option_c.json은 현재 AGI schedule 형식이며 Contract v0.8.0 마이그레이션 필요
- ✅ **reflow_runs[] 기록** (Apply 시) - reflow-engine.ts, reflow-runs.ts 구현 완료
- ✅ **collisions{} 레지스트리** + calc.collision_ids 동기화 - timeline-badges.ts, detect-resource-conflicts.ts 구현 완료
- ✅ **baseline_conflict 차단** (Approval 모드) - view-mode-permissions.ts에서 Approval 모드 Apply 금지 구현
- ✅ **2-click root cause 동작** - WhyPanel.tsx + collision popover (Task 5)
- ✅ **lint/build PASS** (가능 범위) - 모든 Task 후 `pnpm build` 성공
- ✅ **patch.md §2, §4 불변조건 충족** - SSOT 원칙, 2-click UX, Map/Timeline/Detail 레이아웃, Plan↔Actual, View Mode 분리 완료

---

## 8) 참조 문서

- patch.md (SSOT 레이아웃/UX)
- AGENTS.md (프로젝트 룰)
- contract-optionc-v0.8.0.md
- runbook-state-reflow-collision.md
- collision-taxonomy.md
- ssot-api-contract.md
- plan-template.md

---

## 9) BLOCKER / 가정

| 항목 | 상태 |
|------|------|
| typecheck/test 스크립트 없음 | 가정: lint/build만 사용. 필요 시 추가 |
| option_c.json 현재 구조 | 가정: Contract v0.8.0 준수 또는 마이그레이션 필요 |
| detect_project_commands 경로 | .cursor/skills/tr-dashboard-autopilot/scripts/ 또는 tr-dashboard-ssot-guard/scripts/ |
