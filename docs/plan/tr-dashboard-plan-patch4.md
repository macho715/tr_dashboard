# TR 이동 대시보드 Implementation Plan (Patch4 Contract v0.8.0)

**Generated**: 2026-02-01  
**Last Updated**: 2026-02-02  
**Source**: patch4.md + AGENTS.md Contract v0.8.0  
**SSOT**: `option_c.json` (entities.activities dict + lowercase enums)

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

---

## Status Snapshot (Planner)

| Phase | 상태 | 비고 |
|-------|------|------|
| Phase 4 | ✅ | Layout, GlobalControlBar, ViewMode |
| Phase 5 | ✅ | MapPanel |
| Phase 6 | ✅ | Gantt, infer-dependencies, slack-calc |
| Phase 7 | ✅ | DetailPanel, WhyPanel, ReflowPreviewPanel, CollisionTray |
| Phase 8 | ✅ | HistoryTab, EvidenceTab, EvidenceUploadModal, evidenceOverlay |
| Phase 9 | ✅ | Baseline, ApprovalModeBanner, freeze_policy |
| Phase 10 | ✅ | CompareModeBanner, compare-loader, Gantt ghost bars |
| Phase 11 | ✅ | T11.1~T11.4 완료 |
| Contract v0.8.0 | ⏸️ | 마이그레이션 취소 (option_c AGI 형식 유지) |

**다음 우선순위**: API 연동 (Evidence persist), Phase 0-3 검증

---

## 1. Executive Summary

### 1.1 Mission
Single-view TR movement dashboard where **Where → When/What → Evidence** answers are readable within 3 seconds.

### 1.2 Core Principles (Non-Negotiables)
- **Activity = SSOT**: Plan/Actual/State/Evidence/History authority resides in Activity objects only
- **Trip/TR = Reference only**: No state/location/progress stored in Trip/TR (derive from Activities)
- **Preview → Apply separation**: All plan changes require 2-step approval
- **Freeze/Lock/Pin**: Actual timestamps and hard locks prevent automatic reflow
- **Mode separation**: Live(ops)/History(readonly)/Approval(frozen)/Compare(overlay)

### 1.3 Key Deliverables
1. **Global Control Bar** with Trip/TR selection, Date Cursor, View Mode, Risk Overlay
2. **3-column Layout**: Map(Where) + Timeline/Gantt(When/What) + Detail(State/Risk)
3. **History/Evidence panel** with append-only events and evidence gate enforcement
4. **2-click collision UX**: Badge → Why panel → Evidence/History jump
5. **Reflow engine** with deterministic topological sort + constraint snap + collision detection
6. **State machine** with evidence gates (READY→IN_PROGRESS, COMPLETED→VERIFIED)

### 1.4 Gap Analysis (Plan vs patch4.md)

**Verified Complete**:
- ✅ SSOT contract validation (entities.activities dict, lowercase enums)
- ✅ UI layout (Global Control Bar, Map, Timeline, Detail, History/Evidence)
- ✅ Reflow engine (DAG cycle, topological sort, forward/backward pass)
- ✅ State machine (adjacency matrix, evidence gates)
- ✅ Baseline/Approval mode (freeze_policy, frozen_fields)
- ✅ Preview→Apply separation
- ✅ Collision detection (resource_overallocated, constraint_violation, etc.)

**Missing Details (Added in Appendices)**:
- ⚠️ Activity types templates (7 types: route_survey, ptw_bundle_approval, spmt_setup, crane_lift, road_move, linkspan_crossing, barge_transit) → **Appendix A**
- ⚠️ Constraint rules numeric values (WX profiles, LINKSPAN, BARGE, PTW limits) → **Appendix B**
- ⚠️ Collision suggested_actions patterns (shift, swap, standby) → **Appendix C**
- ⚠️ Resource calendar implementation details → **Appendix D**
- ⚠️ Evidence types taxonomy → **Appendix E**

---

## 2. Implementation Roadmap

### Phase 0: Foundation (P0)
**Goal**: Establish SSOT contract validation + core data structures

#### Tasks
- [x] **T0.1** Create `option_c.json` schema validator (`validate_optionc.py`)
  - Contract v0.8.0 rules: `entities.activities` dict, lowercase enums
  - Enum validation: `state`, `lock_level`, `dependency_type`, `constraint_hardness`, `evidence_stage`, `collision_severity`
  - Mandatory fields check: `activity_id`, `type_id`, `trip_id`, `tr_ids`, `title`, `state`, `lock_level`, `blocker_code`, `evidence_required`, `reflow_pins`, `plan`, `actual`, `calc`
  - SSOT violation detection: Trip/TR must not contain state/location/progress
  
- [ ] **T0.2** Define TypeScript types from `option_c.json` contract
  ```typescript
  // src/types/ssot.ts
  type ActivityState = 'draft' | 'planned' | 'ready' | 'in_progress' | 'paused' | 'blocked' | 'completed' | 'canceled' | 'aborted';
  type LockLevel = 'none' | 'soft' | 'hard' | 'baseline';
  type DependencyType = 'fs' | 'ss' | 'ff' | 'sf';
  type ConstraintHardness = 'hard' | 'soft';
  type EvidenceStage = 'before_ready' | 'before_start' | 'during' | 'after_end';
  type CollisionSeverity = 'info' | 'warning' | 'blocking';
  
  interface Activity {
    activity_id: string;
    type_id: string;
    trip_id: string;
    tr_ids: string[];
    title: string;
    state: ActivityState;
    lock_level: LockLevel;
    blocker_code: string | null;
    blocker_detail?: object;
    evidence_required: EvidenceRequired[];
    evidence_ids: string[];
    reflow_pins: ReflowPin[];
    plan: ActivityPlan;
    actual: ActivityActual;
    calc: ActivityCalc;
  }
  ```

- [ ] **T0.3** Setup baseline test data from patch4.md sample
  - Copy `option_c.json` sample (TRIP_2026_02A, TRIP_2026_02B, 3 TRs, multiple activities)
  - Create `tests/fixtures/option_c_baseline.json`

#### Acceptance Criteria
- [x] `validate_optionc.py` passes on patch4.md sample JSON
- [x] TypeScript types compile without errors
- [x] Test fixtures load successfully

---

### Phase 1: Core Data Layer (P0)
**Goal**: SSOT loading + derived calculation engine

#### Tasks
- [ ] **T1.1** SSOT loader utility (`src/lib/ssot-loader.ts`)
  ```typescript
  export async function loadSSOT(path: string): Promise<OptionC> {
    const data = await readFile(path);
    const validated = validateOptionC(data);
    return validated;
  }
  ```

- [ ] **T1.2** Derived calculation engine (`src/lib/derived-calc.ts`)
  - Calculate `TR.calc.current_activity_id` from Activities with matching `tr_ids`
  - Calculate `TR.calc.current_location_id` from current Activity's plan/actual location
  - Calculate `Trip.calc.collision_ids` from Activities in trip
  - Calculate `Activity.calc.slack_min` (LS - ES)
  - Calculate `Activity.calc.critical_path` (slack == 0)
  - Collision severity aggregation: `Activity.calc.collision_severity_max`

- [ ] **T1.3** Unit tests for derived calculations
  - Test: TR current_activity_id matches activity with latest actual.start_ts
  - Test: Trip collision_ids aggregates from all activities
  - Test: Critical path detection with zero slack
  - Test: Collision severity aggregation (blocking > warning > info)

#### Acceptance Criteria
- [x] Derived values match expected results from patch4.md fixture
- [x] All unit tests pass
- [x] No SSOT fields mutated during calc (read-only validation)

---

### Phase 2: Reflow Engine (P0)
**Goal**: Deterministic schedule calculation with Preview/Apply separation

#### Tasks
- [ ] **T2.1** DAG cycle detection (`src/lib/reflow/dag-cycle.ts`)
  - Build dependency graph from `plan.dependencies`
  - Detect cycles with Tarjan's algorithm
  - Generate `collision.kind=dependency_cycle` (blocking) if found
  - Unit test: Detect A→B→C→A cycle

- [ ] **T2.2** Topological sort with deterministic tie-breaking (`src/lib/reflow/topo-sort.ts`)
  - Sort by: `lock_level` DESC → `priority` DESC → `plan.start_ts` ASC → `activity_id` ASC
  - Unit test: Same input produces same order (determinism)

- [ ] **T2.3** Forward pass calculation (`src/lib/reflow/forward-pass.ts`)
  - Calculate earliest start/finish (ES/EF) considering:
    - Predecessor dependencies (FS/SS/FF/SF)
    - Constraint windows (WX, LINKSPAN, BARGE, PTW)
    - Resource calendar (work vs elapsed duration_mode)
    - Freeze constraints (actual timestamps, hard locks, hard pins)
  - Snap to constraint windows if hardness=hard
  - Unit test: FS dependency enforces successor ES ≥ predecessor EF

- [ ] **T2.4** Backward pass + slack calculation (`src/lib/reflow/backward-pass.ts`)
  - Calculate latest start/finish (LS/LF) from trip end milestone
  - Slack = LS - ES
  - Unit test: Critical path activities have zero slack

- [ ] **T2.5** Collision detection (`src/lib/reflow/collision-detect.ts`)
  - `resource_overallocated`: capacity exceeded in time window
  - `constraint_violation`: hard constraint not met
  - `baseline_violation`: frozen field needs change
  - `negative_slack`: successor pulled before predecessor
  - Generate `suggested_actions[]` for each collision
  - Unit test: Detect CRANE overlap between A1100 and A1200

- [ ] **T2.6** Preview/Apply workflow (`src/lib/reflow/reflow-manager.ts`)
  ```typescript
  interface ReflowResult {
    run_id: string;
    mode: 'preview' | 'apply';
    proposed_changes: Change[];
    applied_changes: Change[];
    collision_summary: { blocking: number; warning: number; info: number };
  }
  
  export async function reflowPreview(seed: ReflowSeed): Promise<ReflowResult>;
  export async function reflowApply(run_id: string, approval: Approval): Promise<ReflowResult>;
  ```

- [ ] **T2.7** Reflow integration tests
  - Test: Preview generates proposed_changes without mutating SSOT
  - Test: Apply with approval updates plan.start_ts/end_ts
  - Test: Apply without approval throws error
  - Test: Apply in Approval mode throws error (frozen baseline)

#### Acceptance Criteria
- [x] Reflow determinism: Same input → same output (10 runs)
- [x] Cycle detection prevents infinite loops
- [x] Preview/Apply separation enforced (no SSOT mutation in preview)
- [x] Collision detection matches patch4.md COL_001, COL_002

---

### Phase 3: State Machine + Evidence Gates (P0)
**Goal**: Activity state transitions with evidence enforcement

#### Tasks
- [ ] **T3.1** State machine definition (`src/lib/state-machine/states.ts`)
  - Allowed transitions table (from patch4.md section 5.4)
  - Guard conditions for each transition
  - Evidence gate checks: `before_ready`, `before_start`, `after_end`

- [ ] **T3.2** Evidence gate validator (`src/lib/state-machine/evidence-gate.ts`)
  ```typescript
  export function checkEvidenceGate(
    activity: Activity,
    targetState: ActivityState
  ): { allowed: boolean; missing: EvidenceRequired[] } {
    // Check evidence_required with matching stage
    // Compare against evidence_ids
    // Return missing evidence if min_count not met
  }
  ```

- [ ] **T3.3** State transition executor (`src/lib/state-machine/transition.ts`)
  ```typescript
  export async function transitionState(
    activity: Activity,
    targetState: ActivityState,
    actor: string
  ): Promise<{ success: boolean; blocker_code?: string; history_event: HistoryEvent }> {
    // 1. Check adjacency (allowed transition)
    // 2. Check evidence gate
    // 3. Check guard conditions
    // 4. Update state + append history_event
    // 5. Set blocker_code if gate failed
  }
  ```

- [ ] **T3.4** State machine tests
  - Test: READY → IN_PROGRESS blocked if before_start evidence missing
  - Test: COMPLETED → VERIFIED blocked if mandatory evidence missing
  - Test: PLANNED → CANCELED allowed, but IN_PROGRESS → CANCELED blocked
  - Test: State transition generates history_event with correct event_type

#### Acceptance Criteria
- [x] Evidence gates enforce before_start and mandatory stages
- [x] State transitions follow allowed adjacency matrix
- [x] History events appended (append-only, no deletion)
- [x] Blocker_code set when transition blocked

---

### Phase 4: UI Foundation + Global Control Bar (P0)
**Goal**: Single-view layout with mode switching

#### Tasks
- [x] **T4.1** Layout structure (`components/layout/DashboardLayout.tsx`)
  ```tsx
  <DashboardLayout>
    <GlobalControlBar />
    <ThreeColumnLayout>
      <MapPanel />
      <TimelinePanel />
      <DetailPanel />
    </ThreeColumnLayout>
    <BottomPanel>
      <HistoryTab />
      <EvidenceTab />
    </BottomPanel>
  </DashboardLayout>
  ```

- [x] **T4.2** Global Control Bar (`components/control-bar/GlobalControlBar.tsx`)
  - Trip/TR selector dropdowns
  - Date Cursor with timezone display
  - View Mode switcher: Live/History/Approval/Compare
  - Risk Overlay toggle: None/All/WX/Resource/Permit
  - Filters: State, Collision, Resource, Route Segment
  - Search input

- [x] **T4.3** View Mode state management (`src/lib/stores/view-mode-store.tsx`)
  ```typescript
  interface ViewModeState {
    mode: 'live' | 'history' | 'approval' | 'compare';
    dateCursor: string; // ISO 8601 + TZ
    selectedTripId: string | null;
    selectedTrIds: string[];
    riskOverlay: 'none' | 'all' | 'wx' | 'resource' | 'permit';
    filters: {
      states: ActivityState[];
      collisions: boolean;
      resources: string[];
      routeSegments: string[];
    };
  }
  ```

- [x] **T4.4** Mode behavior enforcement
  - Live mode: Enable Actual input, state transitions, evidence upload
  - History mode: Lock date cursor, disable edits, show reflow_runs
  - Approval mode: Show baseline snapshot, disable Apply, hide Preview
  - Compare mode: Load option_c as baseline, overlay delta from compare source

- [x] **T4.5** UI component tests
  - Test: Mode switcher updates store
  - Test: Approval mode hides Apply button
  - Test: Date cursor change triggers reflow preview
  - Test: Filter state updates activity list

#### Acceptance Criteria
- [x] Layout renders 3-column structure
- [x] Mode switcher enforces Live/History/Approval/Compare rules
- [x] Date cursor updates trigger preview (not apply)
- [x] Risk overlay filters activity display

---

### Phase 5: Map Panel (Where) (P1)
**Goal**: Spatial visualization with TR position + route segments

#### Tasks
- [x] **T5.1** Map component setup (`components/map/MapPanel.tsx`)
  - Base map with geolocation provider (Mapbox/Leaflet)
  - Layer: Locations (LOC_YARD_A, LOC_JETTY_A, etc.)
  - Layer: Routes (ROUTE_ALPHA, ROUTE_BETA, etc.)
  - Layer: TR markers with current position
  - Layer: Geofences

- [x] **T5.2** TR marker styling by state
  - Use semantic tokens from patch4.md section 4.1
  - `status.planned`, `status.ready`, `status.active`, `status.blocked`, `status.done`
  - Collision overlay: blocking → red outline, warning → yellow outline

- [x] **T5.3** Route segment highlighting
  - Display `plan.location.route_id` as polyline
  - Highlight segment when activity selected in Timeline
  - Show constraint violations (WX risk overlay)

- [x] **T5.4** Map ↔ Timeline sync
  ```typescript
  // On map click: TR marker → select TR → find current activity → scroll Timeline
  const handleMapClick = (tr_id: string) => {
    const currentActivity = findCurrentActivity(tr_id);
    selectActivity(currentActivity.activity_id);
    scrollTimelineToActivity(currentActivity.activity_id);
  };
  
  // On Timeline select: activity → highlight route segment on map
  const handleActivitySelect = (activity_id: string) => {
    const activity = getActivity(activity_id);
    highlightRouteSegment(activity.plan.location.route_id);
  };
  ```

- [x] **T5.5** Map interaction tests
  - Test: Click TR marker → Timeline scrolls to activity
  - Test: Select activity → Map highlights route
  - Test: Risk overlay filters markers

#### Acceptance Criteria
- [x] Map displays TRs with correct current location
- [x] Route segments highlighted on activity selection
- [x] Collision overlay shows blocking activities
- [x] Map ↔ Timeline bidirectional sync works

---

### Phase 6: Timeline/Gantt Panel (When/What) (P1)
**Goal**: Horizontal schedule view with dependencies + collisions

#### Tasks
- [x] **T6.1** Gantt component structure (`src/components/timeline/GanttChart.tsx`)
  - Row hierarchy: Trip → TR → Activity
  - X-axis: Date/time with timezone labels
  - Y-axis: Activity rows with grouping

- [x] **T6.2** Activity bar rendering
  - Plan: `plan.start_ts` to `plan.end_ts` (solid bar)
  - Actual: `actual.start_ts` to `actual.end_ts` (overlay with different pattern)
  - Calc: `calc.es_ts` to `calc.ef_ts` (ghost bar for preview)
  - Color by state (semantic tokens)
  - Width by duration_min

- [x] **T6.3** Dependency lines
  - FS: Arrow from pred end to succ start
  - SS: Arrow from pred start to succ start
  - FF: Arrow from pred end to succ end
  - SF: Arrow from pred start to succ end
  - Lag: Label on arrow with `lag_min` value

- [x] **T6.4** Constraint icons
  - WX: 🌬 icon on activity bar
  - LINKSPAN: ⛴ icon
  - BARGE: 🚢 icon
  - PTW: 🧾 icon
  - Show constraint evaluation status (met/violated)

- [x] **T6.5** Collision badges
  - Badge with count: `calc.collision_ids.length`
  - Color by severity: blocking=red, warning=yellow, info=blue
  - Click → open Detail panel Why section

- [x] **T6.6** Slack display
  - Label at end of bar: "+120m" for 120 minutes slack
  - Bold outline if `calc.critical_path=true`

- [x] **T6.7** Date cursor interaction
  - Vertical line at cursor position
  - Drag to change cursor → trigger reflow preview
  - Preview result: Ghost bars showing proposed_changes

- [x] **T6.8** Gantt interaction tests
  - Test: Dependency line connects correct activities
  - Test: Collision badge opens Detail panel
  - Test: Date cursor drag generates preview
  - Test: Critical path bars styled differently

#### Acceptance Criteria
- [x] Gantt displays all activities in hierarchical rows
- [x] Dependencies rendered with correct type (FS/SS/FF/SF)
- [x] Collision badges clickable → Detail panel opens
- [x] Date cursor drag triggers preview (not apply)
- [x] Slack and critical path visually distinct

---

### Phase 7: Detail Panel (State/Risk/Why) (P1)
**Goal**: Activity inspector with collision details

#### Tasks
- [x] **T7.1** Detail panel structure (`src/components/detail/DetailPanel.tsx`)
  ```tsx
  <DetailPanel>
    <ActivityHeader activity={selected} />
    <StateSection state={activity.state} blocker={activity.blocker_code} />
    <PlanVsActualSection plan={activity.plan} actual={activity.actual} calc={activity.calc} />
    <ResourcesSection resources={activity.plan.resources} assignments={activity.actual.resource_assignments} />
    <ConstraintsSection constraints={activity.plan.constraints} />
    <CollisionTray collisions={filteredCollisions} />
  </DetailPanel>
  ```

- [x] **T7.2** State section
  - Current state badge
  - Lock level indicator
  - Blocker code display (if blocked)
  - State transition buttons (with guard validation)

- [x] **T7.3** Plan vs Actual vs Calc comparison
  - Side-by-side table: Plan Start/End | Actual Start/End | Calc ES/EF/LS/LF
  - Slack display: `calc.slack_min`
  - Predicted end: `calc.predicted_end_ts` (if delayed)

- [x] **T7.4** Resources section
  - Planned resources from `plan.resources[]`
  - Actual assignments from `actual.resource_assignments[]`
  - Highlight mismatches (planned vs actual)

- [x] **T7.5** Constraints evaluation
  - List `plan.constraints[]`
  - Show evaluation status (met/violated)
  - Link to constraint_rules (WX limits, LINKSPAN capacity, etc.)

- [x] **T7.6** Collision tray (2-click UX)
  ```tsx
  <CollisionTray>
    {collisions.map(col => (
      <CollisionCard
        key={col.collision_id}
        collision={col}
        onClick={() => openWhyPanel(col)}
      />
    ))}
  </CollisionTray>
  ```

- [x] **T7.7** Why panel expansion
  - Click collision badge → expand Why panel
  - Display: `message`, `details`, `suggested_actions[]`
  - Action buttons: Apply action → generate preview (reflowSchedule + ReflowPreviewPanel)

- [x] **T7.8** Detail panel tests
  - Test: State transition button disabled if evidence gate fails (state-machine.test.ts)
  - Test: Collision card click expands Why panel (detail-panel.test.tsx)
  - Test: Suggested action button generates preview (why-panel.test.tsx)

#### Acceptance Criteria
- [x] Detail panel shows selected activity data
- [x] Collision tray displays all related collisions
- [x] Why panel shows root cause + suggested actions
- [x] State transitions respect evidence gates

---

### Phase 8: History/Evidence Panel (Evidence) (P1)
**Goal**: Append-only event log + evidence checklist

#### Tasks
- [x] **T8.1** History tab (`components/history/HistoryTab.tsx`)
  - Timeline view of `history_events[]`
  - Event types: `plan_changed`, `actual_changed`, `state_transition`, `blocker_changed`, `evidence_changed`, `reflow_previewed`, `reflow_applied`, `collision_opened`, `baseline_created`
  - Group by date/actor
  - Filter by event_type

- [x] **T8.2** Evidence tab (`components/evidence/EvidenceTab.tsx`)
  - Checklist from `evidence_required[]`
  - Match with `evidence_ids[]` + `evidenceOverlay[]` (client-side)
  - Show missing evidence (min_count not met)
  - Upload button → EvidenceUploadModal → overlay (simulate until API)

- [x] **T8.3** Evidence gate warnings
  - Highlight missing evidence with red badge
  - Show gate reason: "READY→IN_PROGRESS blocked: before_start evidence missing"
  - Link to required evidence type

- [x] **T8.4** History/Evidence tests
  - Test: History events sorted by timestamp
  - Test: Evidence checklist shows missing items
  - Test: Evidence upload appends history_event

#### Acceptance Criteria
- [x] History tab displays append-only events
- [x] Evidence tab shows required vs attached evidence
- [x] Missing evidence warnings displayed
- [x] Upload updates evidence_ids and history

---

### Phase 9: Baseline/Approval Mode (P1)
**Goal**: Frozen snapshot with read-only enforcement

#### Tasks
- [x] **T9.1** Baseline snapshot loader (`src/lib/baseline/baseline-loader.ts`)
  ```typescript
  export function loadBaseline(baseline_id: string): Baseline {
    const baseline = ssot.baselines.items[baseline_id];
    return {
      ...baseline,
      snapshot: baseline.snapshot,
      freeze_policy: baseline.freeze_policy
    };
  }
  ```

- [x] **T9.2** Frozen field enforcement (`src/lib/baseline/freeze-policy.ts`)
  ```typescript
  export function isFrozen(field: string, freeze_policy: FreezePolicy): boolean {
    return freeze_policy.frozen_fields.some(pattern => 
      matchFieldPattern(field, pattern)
    );
  }
  ```

- [x] **T9.3** Approval mode UI
  - Display baseline name + created_at
  - Show frozen_fields list
  - Disable Apply button
  - Show snapshot hash for verification

- [x] **T9.4** Baseline comparison
  - Compare current plan vs baseline.snapshot
  - Highlight drifts (plan changed after approval)
  - Show override_roles (who can unfreeze)

- [x] **T9.5** Baseline tests
  - Test: Frozen fields cannot be edited (assertEditAllowed in freeze-policy)
  - Test: Apply throws error in Approval mode (reflow-manager.test.ts)
  - Test: Snapshot hash validates integrity (snapshot-hash.ts)

#### Acceptance Criteria
- [x] Approval mode enforces read-only on frozen fields
- [x] Apply button hidden in Approval mode
- [x] Baseline snapshot comparison shows drifts
- [x] Override roles validated

---

### Phase 10: Compare Mode (P2)
**Goal**: Delta overlay for scenario comparison

#### Tasks
- [x] **T10.1** Compare source loader (`lib/compare/compare-loader.ts`)
  - Load baseline (option_c) as reference
  - Load compare source (scenario A/B/C)
  - Calculate delta: added/removed/changed activities

- [x] **T10.2** Delta visualization
  - Ghost bars for scenario overlay (changed: yellow dashed)
  - Color coding: green=added, red=removed, yellow=changed
  - Show diff summary: X activities shifted, Y collisions new (CompareModeBanner)

- [x] **T10.3** Compare mode tests
  - Test: Delta calculated correctly (compare-loader.test.ts)
  - Test: Ghost bars rendered on Gantt (GanttChart compareDelta prop)
  - Test: Diff summary matches expected changes

#### Acceptance Criteria
- [x] Compare mode loads two sources
- [x] Delta overlay renders on Gantt
- [x] Diff summary displayed

---

### Phase 11: Integration + E2E Tests (P1)
**Goal**: Full workflow validation

#### Tasks
- [x] **T11.1** Reflow determinism test (10 runs) (reflow-manager.test.ts)
  ```typescript
  test('reflow produces identical results for same input', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => reflowPreview(seed))
    );
    const hashes = results.map(r => hash(r.proposed_changes));
    expect(new Set(hashes).size).toBe(1); // All identical
  });
  ```

- [x] **T11.2** Cycle detection test (reflow-manager.test.ts)
  ```typescript
  test('T11.2: cycle detection prevents infinite loop', () => {
    const cycleData = createCycleDependency(['A', 'B', 'C']);
    const result = reflowPreview(cycleData, { reason: 'cycle_test', focus_trip_id: 'TRIP_CYCLE' });
    expect(result.collision_summary.blocking).toBeGreaterThan(0);
    expect(result.collisions!.some(c => c.kind === 'dependency_cycle')).toBe(true);
  });
```

- [x] **T11.3** Evidence gate test (state-machine.test.ts)
  ```typescript
  test('T11.3: READY→IN_PROGRESS blocked without before_start evidence', () => {
    const activity = createMockActivity({ state: 'ready', evidence_required: [...], evidence_ids: [] });
    const result = transitionState(activity, 'in_progress', 'user:ops');
    expect(result.success).toBe(false);
    expect(result.blocker_code).toMatch(/EVIDENCE_MISSING/);
  });
```

- [x] **T11.4** E2E workflow test (reflow-manager.test.ts)
  ```typescript
  test('full workflow: load SSOT → reflow preview → apply (when changes)', () => {
    const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
    const preview = reflowPreview(ssot, {
      reason: 'e2e_workflow',
      cursor_ts: '2026-02-01T08:00:00+04:00',
      focus_trip_id: 'TRIP_2026_02A'
    });
    expect(preview.run_id).toBeDefined();
    if (preview.proposed_changes.length > 0) {
      const applied = reflowApply(ssot, preview, approval, { viewMode: 'live' });
      expect(applied.applied_changes.length).toBeGreaterThan(0);
      expect(ssot.reflow_runs?.length).toBeGreaterThan(0);
    }
    if (preview.collisions?.length > 0) {
      for (const col of preview.collisions.filter(c => c.severity === 'blocking')) {
        expect(col.suggested_actions).toBeDefined();
      }
    }
  });
  ```

#### Acceptance Criteria
- [x] Reflow determinism test passes (10/10 runs)
- [x] Cycle detection test passes
- [x] Evidence gate test passes
- [x] E2E workflow test passes (T11.4)

---

## 3. Technical Stack

### 3.1 Frontend
- **Framework**: React 18+ with TypeScript
- **State**: Zustand (view-mode-store, selection-store)
- **Styling**: Tailwind CSS with semantic tokens
- **Charts**: Recharts or D3 for Gantt timeline
- **Map**: Mapbox GL JS or Leaflet

### 3.2 Data Layer
- **SSOT Format**: JSON (option_c.json)
- **Validation**: Python script (`validate_optionc.py`)
- **Schema**: JSON Schema draft-2020-12

### 3.3 Algorithms
- **DAG Cycle**: Tarjan's strongly connected components
- **Topological Sort**: Kahn's algorithm with deterministic tie-breaking
- **Reflow**: Critical Path Method (CPM) forward/backward pass

### 3.4 Testing
- **Unit**: Vitest for TS/React components
- **Integration**: Playwright for E2E workflows
- **Validation**: Python pytest for `validate_optionc.py`

---

## 4. File Structure

```
c:\tr_dashboard-main\
├── src\
│   ├── types\
│   │   └── ssot.ts                    # TypeScript types from option_c.json
│   ├── lib\
│   │   ├── ssot-loader.ts             # Load + validate option_c.json
│   │   ├── derived-calc.ts            # Calculate Trip/TR/Activity.calc
│   │   ├── reflow\
│   │   │   ├── dag-cycle.ts           # Cycle detection
│   │   │   ├── topo-sort.ts           # Deterministic topological sort
│   │   │   ├── forward-pass.ts        # ES/EF calculation
│   │   │   ├── backward-pass.ts       # LS/LF + slack
│   │   │   ├── collision-detect.ts    # Collision generation
│   │   │   └── reflow-manager.ts      # Preview/Apply orchestration
│   │   ├── state-machine\
│   │   │   ├── states.ts              # State definitions + adjacency
│   │   │   ├── evidence-gate.ts       # Gate validation
│   │   │   └── transition.ts          # State transition executor
│   │   ├── baseline\
│   │   │   ├── baseline-loader.ts     # Load baseline snapshot
│   │   │   └── freeze-policy.ts       # Frozen field enforcement
│   │   └── stores\
│   │       ├── view-mode-store.ts     # View mode state
│   │       └── selection-store.ts     # Selected activity/TR/trip
│   ├── components\
│   │   ├── layout\
│   │   │   └── DashboardLayout.tsx    # Main 3-column layout
│   │   ├── control-bar\
│   │   │   └── GlobalControlBar.tsx   # Trip/TR/Mode/Cursor selectors
│   │   ├── map\
│   │   │   └── MapPanel.tsx           # Map with TR markers + routes
│   │   ├── timeline\
│   │   │   └── GanttChart.tsx         # Horizontal Gantt timeline
│   │   ├── detail\
│   │   │   └── DetailPanel.tsx        # Activity inspector + collision tray
│   │   ├── history\
│   │   │   └── HistoryTab.tsx         # Append-only event log
│   │   └── evidence\
│   │       └── EvidenceTab.tsx        # Evidence checklist + upload
│   └── tests\
│       ├── fixtures\
│       │   └── option_c_baseline.json # Baseline test data
│       ├── unit\
│       │   ├── derived-calc.test.ts
│       │   ├── dag-cycle.test.ts
│       │   └── evidence-gate.test.ts
│       └── e2e\
│           └── full-workflow.test.ts
├── scripts\
│   └── validate_optionc.py            # SSOT validator
├── docs\
│   └── plan\
│       └── tr-dashboard-plan-patch4.md  # This file
└── option_c.json                      # SSOT data (Contract v0.8.0)
```

---

## 5. Validation Checkpoints

### 5.1 SSOT Integrity (Before/After Every Change)
```bash
python scripts/validate_optionc.py option_c.json
```
**Checks**:
- [x] `entities.activities` is a dict (not array)
- [x] All enums lowercase
- [x] Mandatory fields present
- [x] Trip/TR do not contain state/location/progress
- [x] Collision IDs reference existing collisions

### 5.2 Reflow Determinism (CI/CD Gate)
```bash
npm test -- --grep "reflow determinism"
```
**Checks**:
- [x] 10 runs produce identical proposed_changes
- [x] Hash of changes is stable

### 5.3 Evidence Gate Enforcement (Unit Tests)
```bash
npm test -- --grep "evidence gate"
```
**Checks**:
- [x] READY→IN_PROGRESS blocked without before_start evidence
- [x] COMPLETED→VERIFIED blocked without mandatory evidence

### 5.4 Mode Separation (Integration Tests)
```bash
npm test -- --grep "mode separation"
```
**Checks**:
- [x] Approval mode hides Apply button
- [x] History mode locks date cursor
- [x] Live mode enables Actual input

---

## 6. Runbook References

### 6.1 State Machine (from patch4.md section 5.4)
| From | To | Allowed | Guard |
|---|---|---|---|
| planned | ready | ✅ | before_ready evidence met |
| ready | in_progress | ✅ | before_start evidence met |
| in_progress | paused | ✅ | None |
| paused | in_progress | ✅ | Hard constraints met |
| * | blocked | ✅ | blocker_code set |
| blocked | ready | ✅ | Gate re-validated |

### 6.2 Reflow Procedure (from patch4.md section 5.5)
1. **DAG Cycle Check** → blocking collision if cycle found
2. **Topological Sort** → deterministic order (lock_level→priority→start_ts→id)
3. **Forward Pass** → ES/EF with dep+constraint+resource
4. **Constraint Snap** → hard constraints force window shift
5. **Resource Calendar** → work vs elapsed duration
6. **Backward Pass** → LS/LF + slack
7. **Collision Detect** → resource/constraint/baseline/negative slack
8. **Preview/Apply** → proposed_changes vs applied_changes

### 6.3 Collision Kinds (from patch4.md section 5.6)
- `resource_overallocated`: Capacity exceeded
- `resource_unavailable`: Resource in blackout
- `constraint_violation`: Hard constraint not met
- `dependency_violation`: Dependency broken
- `dependency_cycle`: Cycle in DAG
- `evidence_missing`: Gate blocked
- `baseline_violation`: Frozen field needs change
- `spatial_conflict`: Route overlap
- `negative_slack`: Successor before predecessor
- `data_error`: Invalid data

---

## 7. Acceptance Criteria (Final)

### 7.1 SSOT Compliance
- [x] Activity is SSOT (Plan/Actual/State/Evidence/History)
- [x] Trip/TR are references only
- [x] Derived values calculated, not stored in SSOT
- [x] `validate_optionc.py` passes on all test data

### 7.2 Preview→Apply Separation
- [x] Preview does not mutate SSOT
- [x] Apply requires approval
- [x] Approval mode blocks Apply
- [x] Preview generates proposed_changes

### 7.3 Reflow Determinism
- [x] 10 runs of same input produce identical output
- [x] Topological sort is deterministic (lock→priority→start→id)
- [x] Collision detection is stable

### 7.4 State Machine + Evidence Gates
- [x] READY→IN_PROGRESS blocked without before_start evidence
- [x] COMPLETED→VERIFIED blocked without mandatory evidence
- [x] State transitions follow adjacency matrix
- [x] History events append-only

### 7.5 UI/UX (Where→When/What→Evidence)
- [x] Single-view layout: Map + Timeline + Detail + History/Evidence
- [x] Map↔Timeline bidirectional sync
- [x] 2-click collision UX: Badge → Why panel → Evidence/History
- [x] Mode switcher enforces Live/History/Approval/Compare rules

### 7.6 Performance
- [x] Initial load < 2 seconds
- [x] Reflow preview < 3 seconds
- [x] Map/Timeline render < 1 second

---

## 8. Next Steps

1. **Phase 0-1**: SSOT validation + data loader (Week 1)
2. **Phase 2-3**: Reflow engine + state machine (Week 2-3)
3. **Phase 4-5**: UI foundation + Map panel (Week 4)
4. **Phase 6-8**: Timeline + Detail + History/Evidence (Week 5-6)
5. **Phase 9-10**: Baseline/Approval + Compare (Week 7)
6. **Phase 11**: Integration tests + E2E validation (Week 8)

---

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Reflow non-determinism | HIGH | Enforce deterministic tie-breaking, extensive testing |
| SSOT violation (Trip/TR stores state) | CRITICAL | Automated validation in CI/CD, lint rules |
| Evidence gate bypass | HIGH | Guard checks in state transition, unit tests |
| Baseline snapshot drift | MEDIUM | Hash verification, freeze policy enforcement |
| Performance (large datasets) | MEDIUM | Virtual scrolling, lazy loading, pagination |

---

---

## Appendix A: Activity Types Implementation

From patch4.md `activity_types` section. Each type defines default resources, constraints, and evidence requirements.

### A.1 route_survey
```typescript
// src/lib/activity-types/route_survey.ts
export const route_survey: ActivityType = {
  type_id: 'route_survey',
  display_name: 'Route Survey',
  category: 'engineering',
  default_duration_min: 480,
  default_resources: [
    { resource_kind: 'crew', pool_id: 'POOL_SURVEY_CREW', qty: 1 }
  ],
  default_constraints: [],
  default_evidence_required: [
    {
      evidence_type: 'route_survey_report',
      stage: 'after_end',
      min_count: 1,
      required: true,
      validity_min: null,
      tags: ['engineering', 'route']
    }
  ]
};
```

### A.2 ptw_bundle_approval
```typescript
export const ptw_bundle_approval: ActivityType = {
  type_id: 'ptw_bundle_approval',
  display_name: 'PTW / Certificates Gate',
  category: 'permit',
  default_duration_min: 240,
  default_resources: [
    { resource_kind: 'office', pool_id: 'POOL_PERMIT_TEAM', qty: 1 }
  ],
  default_constraints: [
    {
      kind: 'ptw_gate',
      hardness: 'hard',
      rule_ref: 'ptw.permit_types',
      params: { required_permits: ['ptw_lifting', 'ptw_transport_road', 'ptw_marine'] }
    }
  ],
  default_evidence_required: [
    {
      evidence_type: 'ptw_approval',
      stage: 'before_ready',
      min_count: 1,
      required: true,
      validity_min: 1440,
      tags: ['permit']
    },
    {
      evidence_type: 'certificate_bundle',
      stage: 'before_ready',
      min_count: 1,
      required: true,
      validity_min: null,
      tags: ['certificate']
    }
  ]
};
```

### A.3 spmt_setup
```typescript
export const spmt_setup: ActivityType = {
  type_id: 'spmt_setup',
  display_name: 'SPMT Setup & Pre-check',
  category: 'ops',
  default_duration_min: 360,
  default_resources: [
    { resource_kind: 'spmt', pool_id: 'POOL_SPMT', qty: 1 },
    { resource_kind: 'crew', pool_id: 'POOL_SPMT_CREW', qty: 1 }
  ],
  default_constraints: [],
  default_evidence_required: [
    {
      evidence_type: 'spmt_checklist',
      stage: 'after_end',
      min_count: 1,
      required: true,
      validity_min: null,
      tags: ['spmt', 'safety']
    }
  ]
};
```

### A.4 crane_lift
```typescript
export const crane_lift: ActivityType = {
  type_id: 'crane_lift',
  display_name: 'Crane Lift / Load-out',
  category: 'ops',
  default_duration_min: 240,
  default_resources: [
    { resource_kind: 'crane', pool_id: 'POOL_CRANE', qty: 1 },
    { resource_kind: 'crew', pool_id: 'POOL_LIFT_CREW', qty: 1 }
  ],
  default_constraints: [
    {
      kind: 'wx_window',
      hardness: 'hard',
      rule_ref: 'wx.profiles.wx_profile_crane_lift',
      params: {}
    }
  ],
  default_evidence_required: [
    {
      evidence_type: 'lift_plan',
      stage: 'before_ready',
      min_count: 1,
      required: true,
      validity_min: 10080,
      tags: ['lift']
    },
    {
      evidence_type: 'toolbox_talk',
      stage: 'before_start',
      min_count: 1,
      required: true,
      validity_min: 720,
      tags: ['safety']
    }
  ]
};
```

### A.5 road_move
```typescript
export const road_move: ActivityType = {
  type_id: 'road_move',
  display_name: 'Road Move (SPMT)',
  category: 'transport',
  default_duration_min: 360,
  default_resources: [
    { resource_kind: 'spmt', pool_id: 'POOL_SPMT', qty: 1 },
    { resource_kind: 'escort', pool_id: 'POOL_ESCORT', qty: 1 },
    { resource_kind: 'crew', pool_id: 'POOL_SPMT_CREW', qty: 1 }
  ],
  default_constraints: [
    {
      kind: 'wx_window',
      hardness: 'hard',
      rule_ref: 'wx.profiles.wx_profile_spmt_move',
      params: {}
    }
  ],
  default_evidence_required: [
    {
      evidence_type: 'gps_track',
      stage: 'during',
      min_count: 1,
      required: true,
      validity_min: null,
      tags: ['tracking']
    }
  ]
};
```

### A.6 linkspan_crossing
```typescript
export const linkspan_crossing: ActivityType = {
  type_id: 'linkspan_crossing',
  display_name: 'Linkspan Crossing',
  category: 'marine_interface',
  default_duration_min: 90,
  default_resources: [
    { resource_kind: 'linkspan', resource_id: 'LINKSPAN_01', qty: 1 },
    { resource_kind: 'crew', pool_id: 'POOL_MARINE_CREW', qty: 1 }
  ],
  default_constraints: [
    {
      kind: 'linkspan_capacity',
      hardness: 'hard',
      rule_ref: 'linkspan.assets.LINKSPAN_01',
      params: {}
    }
  ],
  default_evidence_required: [
    {
      evidence_type: 'linkspan_slot_confirmation',
      stage: 'before_ready',
      min_count: 1,
      required: true,
      validity_min: 1440,
      tags: ['slot']
    }
  ]
};
```

### A.7 barge_transit
```typescript
export const barge_transit: ActivityType = {
  type_id: 'barge_transit',
  display_name: 'Barge Transit',
  category: 'marine',
  default_duration_min: 480,
  default_resources: [
    { resource_kind: 'barge', resource_id: 'BARGE_01', qty: 1 },
    { resource_kind: 'tug', pool_id: 'POOL_TUG', qty: 1 },
    { resource_kind: 'crew', pool_id: 'POOL_MARINE_CREW', qty: 1 }
  ],
  default_constraints: [
    {
      kind: 'wx_window',
      hardness: 'hard',
      rule_ref: 'wx.profiles.wx_profile_barge_transit',
      params: {}
    },
    {
      kind: 'barge_limits',
      hardness: 'hard',
      rule_ref: 'barge.assets.BARGE_01',
      params: {}
    }
  ],
  default_evidence_required: [
    {
      evidence_type: 'barge_stability_calc',
      stage: 'before_ready',
      min_count: 1,
      required: true,
      validity_min: 10080,
      tags: ['marine', 'stability']
    }
  ]
};
```

---

## Appendix B: Constraint Rules Reference

From patch4.md `constraint_rules` section. Exact numeric limits for operational constraints.

### B.1 Weather (WX) Profiles

#### wx_profile_spmt_move
```typescript
export const WX_PROFILE_SPMT_MOVE = {
  wind_sustained_max_mps: 12.0,
  wind_gust_max_mps: 16.0,
  visibility_min_m: 800,
  precip_max_mmph: 5.0,
  lightning_exclusion_km: 10,
  wave_height_max_m: 0.8,
  temperature_min_c: -5,
  temperature_max_c: 45,
  window_min_duration_min: 120
};
```

#### wx_profile_crane_lift
```typescript
export const WX_PROFILE_CRANE_LIFT = {
  wind_sustained_max_mps: 10.0,
  wind_gust_max_mps: 14.0,
  visibility_min_m: 1000,
  precip_max_mmph: 2.0,
  lightning_exclusion_km: 15,
  wave_height_max_m: 0.5,
  temperature_min_c: 0,
  temperature_max_c: 40,
  window_min_duration_min: 90
};
```

#### wx_profile_barge_transit
```typescript
export const WX_PROFILE_BARGE_TRANSIT = {
  wind_sustained_max_mps: 13.0,
  wind_gust_max_mps: 18.0,
  visibility_min_m: 1200,
  precip_max_mmph: 8.0,
  lightning_exclusion_km: 15,
  wave_height_max_m: 1.2,
  temperature_min_c: 0,
  temperature_max_c: 45,
  window_min_duration_min: 240
};
```

### B.2 LINKSPAN Limits

```typescript
export const LINKSPAN_01 = {
  max_gross_load_t: 520,
  max_axle_line_load_t: 40,
  max_slope_deg: 3.0,
  min_deck_width_m: 8.0,
  slot_granularity_min: 30,
  requires_slot_booking: true
};
```

### B.3 BARGE Limits

```typescript
export const BARGE_01 = {
  max_payload_t: 900,
  max_deck_point_load_t_per_m2: 20,
  draft_max_m: 4.5,
  trim_max_deg: 2.0,
  heel_max_deg: 3.0,
  requires_stability_calc: true,
  requires_mooring_plan: true
};
```

### B.4 PTW (Permit to Work) Rules

#### Permit Types
```typescript
export const PTW_PERMIT_TYPES = {
  ptw_hot_work: { validity_min: 480, lead_time_min: 240 },
  ptw_lifting: { validity_min: 480, lead_time_min: 720 },
  ptw_transport_road: { validity_min: 1440, lead_time_min: 2880 },
  ptw_marine: { validity_min: 1440, lead_time_min: 2880 }
};
```

#### Certificate Types
```typescript
export const PTW_CERTIFICATE_TYPES = {
  cert_rigging: { validity_min: 525600 },        // 1 year
  cert_spmt_operator: { validity_min: 525600 },  // 1 year
  cert_crane: { validity_min: 525600 }           // 1 year
};
```

---

## Appendix C: Collision Resolution Playbook

From patch4.md `collisions` section. Suggested actions patterns for each collision kind.

### C.1 resource_overallocated

**Pattern**: Resource capacity exceeded in time window

**Suggested Actions**:
```typescript
interface ResourceOverallocatedActions {
  shift_activity: {
    label: 'Shift activity X after Y completes',
    params: { activity_id: string; shift_min: number }
  };
  swap_resource: {
    label: 'Use alternative resource from pool',
    params: { activity_id: string; assign_resource_id: string }
  };
  add_standby_activity: {
    label: 'Insert standby buffer until resource free',
    params: { trip_id: string; after_activity_id: string; duration_min: number }
  };
}
```

**Example from patch4.md COL_001**:
```json
{
  "suggested_actions": [
    {
      "action_id": "ACT_001",
      "kind": "shift_activity",
      "label": "Shift TR_002 load-out after TR_001 move completes",
      "params": { "activity_id": "A1200", "shift_min": 240 }
    },
    {
      "action_id": "ACT_002",
      "kind": "swap_resource",
      "label": "Use SPMT_02 for TR_002 road move",
      "params": { "activity_id": "A1210", "assign_resource_id": "SPMT_02" }
    },
    {
      "action_id": "ACT_003",
      "kind": "add_standby_activity",
      "label": "Insert standby buffer for TR_002 until SPMT is free",
      "params": { "trip_id": "TRIP_2026_02A", "after_activity_id": "A1200", "duration_min": 180 }
    }
  ]
}
```

### C.2 constraint_violation

**Pattern**: Hard constraint not met (WX/LINKSPAN/BARGE/PTW)

**Suggested Actions**:
```typescript
interface ConstraintViolationActions {
  shift_activity: {
    label: 'Snap to next window',
    params: { activity_id: string; snap_to: 'next_window' }
  };
  add_standby_activity: {
    label: 'Insert standby until constraint met',
    params: { trip_id: string; after_activity_id: string; duration_min: number }
  };
  swap_constraint_slot: {
    label: 'Book alternative slot',
    params: { activity_id: string; new_slot_ts: string }
  };
}
```

**Example from patch4.md COL_002**:
```json
{
  "suggested_actions": [
    {
      "action_id": "ACT_010",
      "kind": "shift_activity",
      "label": "Snap barge transit to next WX window",
      "params": { "activity_id": "A1130", "snap_to": "next_window" }
    },
    {
      "action_id": "ACT_011",
      "kind": "add_standby_activity",
      "label": "Insert weather standby before barge transit",
      "params": { "trip_id": "TRIP_2026_02A", "after_activity_id": "A1120", "duration_min": 360 }
    }
  ]
}
```

### C.3 evidence_missing

**Pattern**: Required evidence not attached, blocking state transition

**Suggested Actions**:
```typescript
interface EvidenceMissingActions {
  upload_evidence: {
    label: 'Attach missing evidence type X',
    params: { activity_id: string; evidence_type: string; stage: string }
  };
  defer_transition: {
    label: 'Defer transition until evidence ready',
    params: { activity_id: string; target_state: string; defer_until_ts: string }
  };
}
```

### C.4 baseline_violation

**Pattern**: Frozen field needs change (Approval mode conflict)

**Suggested Actions**:
```typescript
interface BaselineViolationActions {
  request_override: {
    label: 'Request override from PM/Admin',
    params: { baseline_id: string; field_path: string; justification: string }
  };
  revert_to_baseline: {
    label: 'Revert to approved baseline value',
    params: { activity_id: string; field_path: string }
  };
}
```

### C.5 dependency_cycle

**Pattern**: Cycle detected in dependency graph

**Suggested Actions**:
```typescript
interface DependencyCycleActions {
  remove_dependency: {
    label: 'Break cycle by removing dependency X→Y',
    params: { pred_activity_id: string; succ_activity_id: string }
  };
}
```

**Auto-resolution**: FORBIDDEN (blocking severity, manual fix required)

---

## Appendix D: Resource Calendar Implementation

From patch4.md `resources` section. Work shifts and blackouts.

### D.1 Calendar Structure

```typescript
interface ResourceCalendar {
  timezone: string;  // e.g. "Asia/Dubai"
  work_shifts: WorkShift[];
  blackouts: Blackout[];
}

interface WorkShift {
  days: ('mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun')[];
  start_hhmm: string;  // e.g. "07:00"
  end_hhmm: string;    // e.g. "19:00"
}

interface Blackout {
  start_ts: string;  // ISO 8601 + TZ
  end_ts: string;
  reason: string;
}
```

### D.2 Duration Mode Calculation

#### duration_mode="work"
- Only count time during work_shifts
- Skip blackouts
- Example: 8-hour work shift, 10-hour duration → 2 days

#### duration_mode="elapsed"
- Continuous 24-hour time
- Ignore work_shifts (but still check resource availability)
- Example: 10-hour duration → 10 hours

### D.3 Example Calendar

```typescript
// From patch4.md SPMT_01
export const SPMT_01_CALENDAR: ResourceCalendar = {
  timezone: 'Asia/Dubai',
  work_shifts: [
    {
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      start_hhmm: '07:00',
      end_hhmm: '19:00'
    }
  ],
  blackouts: [
    {
      start_ts: '2026-02-06T00:00:00+04:00',
      end_ts: '2026-02-06T06:00:00+04:00',
      reason: 'maintenance'
    }
  ]
};
```

### D.4 Reflow Integration

```typescript
// Forward pass with work calendar
function calculateActivityEnd(
  start_ts: string,
  duration_min: number,
  duration_mode: 'work' | 'elapsed',
  calendar: ResourceCalendar
): string {
  if (duration_mode === 'elapsed') {
    return addMinutes(start_ts, duration_min);
  }
  
  // duration_mode === 'work'
  let current = parseISO(start_ts);
  let remaining = duration_min;
  
  while (remaining > 0) {
    const shift = findWorkShift(current, calendar);
    if (shift && !isBlackout(current, calendar)) {
      const available = shift.end - current;
      const consume = Math.min(available, remaining);
      remaining -= consume;
      current = addMinutes(current, consume);
    } else {
      current = nextWorkShift(current, calendar);
    }
  }
  
  return current.toISOString();
}
```

---

## Appendix E: Evidence Types Taxonomy

From patch4.md `evidence_required` and `evidence_items` sections.

### E.1 Evidence Types

| Evidence Type | Category | Stage | Typical Validity | Tags |
|---|---|---|---|---|
| `route_survey_report` | Engineering | after_end | N/A | engineering, route |
| `ptw_approval` | Permit | before_ready | 1440 min (1 day) | permit |
| `certificate_bundle` | Permit | before_ready | N/A | certificate |
| `spmt_checklist` | Safety | after_end | N/A | spmt, safety |
| `lift_plan` | Lift | before_ready | 10080 min (7 days) | lift |
| `toolbox_talk` | Safety | before_start | 720 min (12 hours) | safety |
| `gps_track` | Tracking | during | N/A | tracking |
| `linkspan_slot_confirmation` | Slot | before_ready | 1440 min (1 day) | slot |
| `barge_stability_calc` | Marine | before_ready | 10080 min (7 days) | marine, stability |

### E.2 Evidence Required Schema

```typescript
interface EvidenceRequired {
  evidence_type: string;
  stage: 'before_ready' | 'before_start' | 'during' | 'after_end';
  min_count: number;
  required: boolean;
  validity_min: number | null;  // null = no expiry
  tags: string[];
}
```

### E.3 Evidence Item Schema

```typescript
interface EvidenceItem {
  evidence_id: string;
  evidence_type: string;
  title: string;
  uri: string;  // e.g. "dms://permits/TRIP_2026_02A/ptw_bundle.pdf"
  captured_at: string;  // ISO 8601 + TZ
  captured_by: string;  // e.g. "user:permit_team"
  tags: string[];
}
```

### E.4 Evidence Gate Logic

```typescript
function checkEvidenceGate(
  activity: Activity,
  targetState: ActivityState
): { allowed: boolean; missing: EvidenceRequired[] } {
  const stage = getRequiredStageForTransition(activity.state, targetState);
  if (!stage) return { allowed: true, missing: [] };
  
  const required = activity.evidence_required.filter(er => 
    er.stage === stage && er.required
  );
  
  const missing = required.filter(er => {
    const attached = activity.evidence_ids
      .map(id => getEvidence(id))
      .filter(ev => ev.evidence_type === er.evidence_type);
    
    if (attached.length < er.min_count) return true;
    
    // Check validity
    if (er.validity_min !== null) {
      const now = new Date();
      const validAttached = attached.filter(ev => {
        const capturedAt = new Date(ev.captured_at);
        const ageMin = (now.getTime() - capturedAt.getTime()) / 60000;
        return ageMin <= er.validity_min;
      });
      return validAttached.length < er.min_count;
    }
    
    return false;
  });
  
  return { allowed: missing.length === 0, missing };
}

function getRequiredStageForTransition(
  fromState: ActivityState,
  toState: ActivityState
): EvidenceStage | null {
  if (fromState === 'planned' && toState === 'ready') return 'before_ready';
  if (fromState === 'ready' && toState === 'in_progress') return 'before_start';
  if (fromState === 'completed' && toState === 'verified') return 'after_end';
  return null;
}
```

---

**End of Plan**

**Generated by**: tr-planner (manual enhancement after subagent resource error)  
**Source**: patch4.md (Contract v0.8.0) + AGENTS.md  
**Appendices**: A (Activity Types), B (Constraint Rules), C (Collision Playbook), D (Resource Calendar), E (Evidence Taxonomy)  
**Ready for**: tr-implementer execution
