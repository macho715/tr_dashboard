# vis-timeline-gantt 통합 계획 (TR Planner)

**생성일**: 2026-02-02  
**SSOT**: option_c.json, patch.md, AGENTS.md  
**목표**: vis-timeline-gantt의 Gantt 기능을 TR 이동 대시보드에 통합하여 When/What 뷰 강화

---

## 0) SSOT/Contract 최상단 고정

- option_c.json Contract 준수 (activities: level1, level2, activity_id, planned_start, planned_finish)
- SSOT 권위: entities.activities{} — vis-timeline은 **표시 전용**, SSOT 우회 금지
- Plan 변경 시 Preview→Apply 분리 (Approval 모드에서는 Apply 불가)
- Freeze: actual_start/actual_finish 존재 시 해당 시각 리플로우 금지

---

## 1) 현황 비교

| 항목 | vis-timeline-gantt | TR Dashboard (현재) |
|------|--------------------|---------------------|
| 라이브러리 | vis-timeline, vis-data | 커스텀 CSS/SVG (gantt-chart.tsx) |
| 그룹 구조 | Groups + nestedGroups | level1 → level2 (scheduleActivitiesToGanttRows) |
| 아이템 | id, group, start, end, content, progress | Activity (start, end, type, label) |
| 편집 | editable.updateTime, updateGroup | 읽기 전용 (Preview→Apply 별도) |
| 줌/팬 | ZoomIn/Out, ChevronLeft/Right, Fit All | TimelineControls (Day/Week) |
| 데이터 | 하드코딩 샘플 | option_c.json → scheduleActivities |

---

## 2) 통합 전략

### 2.1 아키텍처

```
option_c.json (SSOT)
       ↓
mapOptionCToVisTimeline(activities)
       ↓
DataSet<Item> + DataSet<Group>
       ↓
vis-timeline Timeline
       ↓
onSelect → Map 하이라이트 / Detail 패널
onTimeChange → Preview (Apply는 권한 필요)
```

### 2.2 데이터 매핑

| option_c | vis-timeline |
|----------|---------------|
| level1 (MOBILIZATION 등) | Group (nestedGroups: level2 그룹들) |
| level2 (SPMT, MARINE 등) | Sub-group |
| activity_id + planned_start/finish | Item (id, group, start, end) |
| actual_start/finish | Freeze 플래그 → editable: false |
| status (planned/in_progress/done/blocked) | className (색상) |
| constraint (PTW, CERT 등) | item template에 배지 |

### 2.3 View Mode별 편집 정책

| Mode | editable.updateTime | editable.updateGroup |
|------|---------------------|----------------------|
| Live | 권한 있으면 true (Freeze 제외) | false |
| History | false | false |
| Approval | false | false |
| Compare | false | false |

---

## 3) Work Breakdown (작은 단위 Task)

### Task 1: 의존성 추가
- **Goal**: vis-timeline, vis-data 패키지 설치
- **Files**: package.json
- **Data Contract**: 영향 없음
- **Tests**: `pnpm install && pnpm build` 통과
- **SSOT validator**: 해당 없음

### Task 2: SSOT→vis-timeline 매퍼 작성
- **Goal**: option_c.activities → DataSet<Group> + DataSet<Item> 변환 함수
- **Files**: lib/ssot/vis-timeline-mapper.ts (신규)
- **Data Contract**: ScheduleActivity → vis-timeline Item/Group 스키마
- **Tests**: 단위 테스트 (level1/level2/activity_id 매핑 검증)
- **SSOT validator**: 매퍼는 읽기 전용, option_c 변경 없음

### Task 3: GanttTimeline 컴포넌트 TR 도메인화
- **Goal**: vis-timeline-gantt/gantt-timeline.tsx를 TR 데이터 소비하도록 수정
- **Files**: components/dashboard/vis-gantt-timeline.tsx (신규), gantt-timeline.css 복사
- **Data Contract**: ScheduleActivity[] props, onActivitySelect, onTimeChange 콜백
- **Tests**: 렌더링 테스트 (activities 주입 시 아이템 수 검증)
- **SSOT validator**: 해당 없음

### Task 4: 아이템 템플릿 TR 도메인 적용
- **Goal**: Constraint 배지 [W][PTW][CERT][LNK][BRG][RES], Collision 배지 [COL] 반영
- **Files**: components/dashboard/vis-gantt-timeline.tsx, lib/ssot/timeline-badges.ts
- **Data Contract**: getConstraintBadges, getCollisionBadges 기존 활용
- **Tests**: 배지 렌더링 스냅샷
- **SSOT validator**: 해당 없음

### Task 5: GanttSection에 vis-timeline 옵션 통합
- **Goal**: 기존 GanttChart와 vis-timeline 뷰 전환 (또는 vis-timeline으로 교체)
- **Files**: components/dashboard/sections/gantt-section.tsx, app/page.tsx
- **Data Contract**: 동일 (scheduleActivities)
- **Tests**: E2E 또는 통합 테스트 (뷰 전환 시 렌더링)
- **SSOT validator**: 해당 없음

### Task 6: Map↔Timeline 상호 하이라이트
- **Goal**: Timeline 선택 → Map 지오펜스 하이라이트, Map 선택 → Timeline 스크롤/하이라이트
- **Files**: components/dashboard/vis-gantt-timeline.tsx, Map 컴포넌트, 상위 레이아웃
- **Data Contract**: activity_id 기반 선택 상태 공유
- **Tests**: 상호 하이라이트 동작 검증
- **SSOT validator**: 해당 없음

### Task 7: View Mode + Freeze 반영
- **Goal**: Live/History/Approval/Compare 모드에 따라 editable, Freeze(actual 존재) 반영
- **Files**: components/dashboard/vis-gantt-timeline.tsx, lib/contexts/view-mode-context.tsx (존재 시)
- **Data Contract**: ViewMode, actual_start/actual_finish
- **Tests**: 모드별 editable 검증, Freeze 시 드래그 불가 검증
- **SSOT validator**: 해당 없음

### Task 8: 2-click Collision UX 연동
- **Goal**: Timeline 아이템 클릭 → Collision 배지 → 2클릭 시 Why 패널
- **Files**: vis-gantt-timeline.tsx, WhyPanel, DetailPanel
- **Data Contract**: ScheduleConflict, root_cause_code, suggested_actions
- **Tests**: 2-click 시 Why 패널 표시 검증
- **SSOT validator**: 해당 없음

### Task 9: TimelineControls 통합
- **Goal**: Day/Week 뷰, Zoom In/Out, Today, Fit All 버튼 통합
- **Files**: timeline-controls.tsx, vis-gantt-timeline.tsx
- **Data Contract**: TimelineView (Day/Week)
- **Tests**: 뷰 전환 시 scale 변경 검증
- **SSOT validator**: 해당 없음

### Task 10: CSS/테마 정리
- **Goal**: gantt-timeline.css를 TR 대시보드 테마(다크/라이트)에 맞게 조정
- **Files**: gantt-timeline.css, globals.css
- **Data Contract**: 영향 없음
- **Tests**: 시각적 회귀 (선택)
- **SSOT validator**: 해당 없음

---

## 4) 커맨드 탐지

```bash
# scripts/detect_project_commands.py 실행 결과 기반
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

---

## 5) DoD (Definition of Done)

- [ ] option_c.json에서만 데이터 소비 (SSOT 준수)
- [ ] Plan 변경 시 Preview→Apply 분리 유지
- [ ] actual_start/actual_finish 존재 시 해당 아이템 Freeze (드래그 불가)
- [ ] View Mode(Live/History/Approval/Compare)에 따른 편집 권한
- [ ] 2-click Collision UX (배지→Why 패널)
- [ ] Map↔Timeline 상호 하이라이트
- [ ] lint/typecheck/test/build PASS
- [ ] validate_optionc.py PASS (option_c 변경 시)

---

## 6) 참조

- AGENTS.md §1 (SSOT, Plan 변경, Freeze, 모드 분리)
- patch.md §2 (레이아웃), §4 (배지, 2-click), §5 (Plan/Actual)
- vis-timeline-gantt/gantt-timeline.tsx (기존 구현)
- lib/data/schedule-data.ts (scheduleActivitiesToGanttRows)
- lib/ssot/timeline-badges.ts (getConstraintBadges, getCollisionBadges)
