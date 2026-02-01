# Contract v0.8.0 Migration Plan

**Generated**: 2026-02-01  
**Source**: option_c.json (AGI Schedule format)  
**Target**: option_c.json (Contract v0.8.0 format)  
**Reference**: contract-optionc-v0.8.0.md, runbook-state-reflow-collision.md

---

## Executive Summary

**Current State**: AGI TR Schedule 형식 (flat activities array, 139 items)  
**Target State**: Contract v0.8.0 (entities.activities{} dict, SSOT compliance)  
**Impact**: Major structural change, backward compatibility break  
**Strategy**: Phased migration with dual-format support period

---

## Current vs Target Structure

### Current (AGI Schedule)
```json
{
  "document_metadata": {...},
  "activities": [
    {
      "level1": "MOBILIZATION",
      "level2": "SPMT",
      "activity_id": "A1000",
      "activity_name": "...",
      "duration": 1.0,
      "planned_start": "2026-01-26",
      "planned_finish": "2026-01-26"
    }
  ]
}
```

### Target (Contract v0.8.0)
```json
{
  "schema": {
    "name": "TR Dashboard SSOT",
    "version": "0.8.0",
    "scenario_id": "agi-tr-1-6",
    "timezone": "Asia/Dubai"
  },
  "policy": {
    "view_modes": ["live", "history", "approval", "compare"],
    "reflow": {
      "snap_direction": "forward",
      "tie_break": ["priority", "planned_start", "activity_id"],
      "calendar_granularity_min": 60
    }
  },
  "catalog": {
    "enums": {
      "activity_state": ["draft", "planned", "ready", "in_progress", "paused", "blocked", "done", "verified", "cancelled"],
      "lock_level": ["none", "soft", "hard", "baseline"],
      ...
    },
    "blocker_codes": {...},
    "evidence_types": {...},
    "activity_types": {...},
    "constraint_rules": {...},
    "resources": {...}
  },
  "entities": {
    "trips": {...},
    "trs": {...},
    "activities": {
      "A1000": {
        "activity_id": "A1000",
        "trip_id": "TRIP_01",
        "tr_id": "TR_01",
        "type": "transport",
        "title": "Mobilization of 1st set of SPMT",
        "state": "planned",
        "lock_level": "none",
        "reflow_pins": [],
        "blocker_code": "NONE",
        "blockers": [],
        "location": {...},
        "plan": {
          "start_ts": "2026-01-26T00:00:00+04:00",
          "duration_min": 1440,
          "end_ts": "2026-01-26T23:59:59+04:00",
          "priority": 100
        },
        "actual": {},
        "dependencies": [],
        "constraints": [],
        "resources": {...},
        "evidence_required": [],
        "evidence": [],
        "calc": {
          "es_ts": "2026-01-26T00:00:00+04:00",
          "ef_ts": "2026-01-26T23:59:59+04:00",
          "total_float_min": 0,
          "is_critical_path": true,
          "collision_ids": [],
          "collision_count": 0,
          "slack_bucket": "none"
        }
      }
    }
  },
  "collisions": {},
  "reflow_runs": [],
  "baselines": {
    "current_baseline_id": null,
    "items": {}
  },
  "history_events": []
}
```

---

## Migration Phases

### Phase 1: Schema Transformation (Priority: HIGH)
**Goal**: Convert AGI Schedule → Contract v0.8.0 structure  
**Duration**: 1-2 days

#### Tasks:
1. **Create schema/policy/catalog sections**
   - Define enums (activity_state, lock_level, etc.)
   - Define blocker_codes catalog
   - Define evidence_types catalog
   - Define activity_types catalog
   - Define resources catalog

2. **Transform activities array → entities.activities dict**
   - Map `activity_id` → key
   - Convert `planned_start`/`planned_finish` → `plan.start_ts`/`plan.end_ts` (ISO 8601 + timezone)
   - Convert `duration` (days) → `plan.duration_min`
   - Infer `state` (default: "planned")
   - Set default `lock_level: "none"`
   - Extract `trip_id`/`tr_id` from voyage mapping
   - Map `level1`/`level2` → `type`

3. **Create entities.trips and entities.trs**
   - Derive from voyages data
   - Link to activities via trip_id/tr_id

4. **Initialize empty registries**
   - collisions: {}
   - reflow_runs: []
   - baselines: { current_baseline_id: null, items: {} }
   - history_events: []

### Phase 2: Enrichment (Priority: MEDIUM)
**Goal**: Add missing Contract v0.8.0 fields  
**Duration**: 2-3 days

#### Tasks:
1. **Dependencies**
   - Parse existing schedule logic
   - Generate dependencies array (FS/SS/FF/SF + lag)

2. **Constraints**
   - Map weather windows → constraints
   - Map PTW/CERT → constraints
   - Map linkspan/barge → resource constraints

3. **Resources**
   - Map SPMT → resources.required
   - Map Linkspan → resources.required
   - Map Barge → resources.required

4. **Evidence Requirements**
   - Define evidence_required for each activity type
   - Map to before_start/before_complete/after_complete stages

### Phase 3: Validation (Priority: HIGH)
**Goal**: Ensure Contract v0.8.0 compliance  
**Duration**: 1 day

#### Tasks:
1. **Run validate_optionc.py CONTRACT**
   - Verify schema structure
   - Verify enum values (lowercase)
   - Verify required fields

2. **Functional Testing**
   - Reflow preview/apply
   - Collision detection
   - Baseline freeze
   - Evidence gate transitions

### Phase 4: Integration (Priority: HIGH)
**Goal**: Update codebase to consume Contract v0.8.0  
**Duration**: 2-3 days

#### Tasks:
1. **Update data loaders**
   - scheduleActivities: entities.activities → ScheduleActivity[]
   - voyages: entities.trips + entities.trs

2. **Update reflow engine**
   - Use entities.activities dict
   - Update plan.start_ts/plan.end_ts
   - Update calc.* fields

3. **Update collision detection**
   - Write to collisions registry
   - Update calc.collision_ids

4. **Update UI components**
   - StoryHeader: use entities.activities
   - GanttChart: use calc.*
   - WhyPanel: use collisions registry

---

## Mapping Rules

### Date Format
```
AGI: "2026-01-26" (YYYY-MM-DD)
→ Contract: "2026-01-26T00:00:00+04:00" (ISO 8601 + Asia/Dubai)
```

### Duration
```
AGI: 1.0 (days)
→ Contract: 1440 (minutes)
```

### State
```
AGI: (implicit from scheduled)
→ Contract: "planned" (default), infer from actual.start_ts
```

### Activity Type
```
AGI: level1 + level2
MOBILIZATION/SPMT → "mobilization"
TR1/Load-out → "load_out"
TR1/Transit → "transit"
TR1/Load-in → "load_in"
```

### Trip/TR Mapping
```
AGI: (implicit from voyage data)
→ Contract:
  - MOBILIZATION → TRIP_00
  - TR1 → TRIP_01, TR_01
  - TR2 → TRIP_02, TR_02
  - ...
  - TR6 → TRIP_06, TR_06
  - DEMOBILIZATION → TRIP_99
```

---

## Backward Compatibility Strategy

### Option A: Dual Format Support (Recommended)
- Keep both formats during migration
- `data/schedule/option_c.json` (Contract v0.8.0)
- `data/schedule/option_c_legacy.json` (AGI Schedule)
- Loader detects format and converts on-the-fly
- Deprecate legacy after 2-4 weeks

### Option B: Hard Cutover
- Single migration PR
- All components updated simultaneously
- Higher risk, faster completion

**Recommendation**: Option A (Dual Format) for safer migration

---

## Validation Checklist

- [ ] Schema structure matches contract-optionc-v0.8.0.md
- [ ] All enums are lowercase
- [ ] entities.activities is dict (not array)
- [ ] plan.start_ts/end_ts are ISO 8601 + timezone
- [ ] calc.* fields present for all activities
- [ ] collisions registry structure correct
- [ ] reflow_runs structure correct
- [ ] baselines structure correct
- [ ] history_events structure correct
- [ ] validate_optionc.py CONTRACT: PASS
- [ ] Reflow preview/apply works
- [ ] Collision detection works
- [ ] UI renders correctly
- [ ] Build passes

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during migration | HIGH | LOW | Backup + validation script |
| UI breaks due to format change | HIGH | MEDIUM | Dual format support + gradual rollout |
| Reflow logic incompatibility | MEDIUM | MEDIUM | Comprehensive testing + preview mode |
| Performance degradation (dict vs array) | LOW | LOW | Benchmark before/after |
| Validation script false positives | MEDIUM | MEDIUM | Manual review + schema refinement |

---

## Timeline

| Phase | Duration | Dependencies | Deliverables |
|-------|----------|--------------|--------------|
| Phase 1: Schema Transformation | 1-2 days | None | option_c_v0.8.0.json (initial) |
| Phase 2: Enrichment | 2-3 days | Phase 1 | option_c_v0.8.0.json (full) |
| Phase 3: Validation | 1 day | Phase 2 | Validation report, bug fixes |
| Phase 4: Integration | 2-3 days | Phase 3 | Updated codebase, build passing |
| **Total** | **6-9 days** | | Full Contract v0.8.0 compliance |

---

## Implementation Order

1. **Create migration script** (`scripts/migrate-to-v0.8.0.ts`)
2. **Transform schema** (Phase 1)
3. **Validate structure** (validate_optionc.py)
4. **Enrich data** (Phase 2)
5. **Validate again** (validate_optionc.py)
6. **Update loaders** (Phase 4.1)
7. **Update engines** (Phase 4.2-4.3)
8. **Update UI** (Phase 4.4)
9. **End-to-end testing**
10. **Deploy with dual format support**

---

## Success Criteria

✅ validate_optionc.py CONTRACT: PASS  
✅ All 9 tasks (Task 1-9) still working  
✅ Reflow preview/apply functional  
✅ Collision detection functional  
✅ Baseline freeze functional  
✅ Evidence gate transitions functional  
✅ UI rendering correct  
✅ Build passing  
✅ Performance within acceptable range (<10% degradation)

---

## Next Action

**Start Phase 1: Create migration script**

```bash
# Create migration script
touch scripts/migrate-to-v0.8.0.ts

# Run migration
pnpm tsx scripts/migrate-to-v0.8.0.ts

# Validate output
VALIDATION_MODE=CONTRACT python .cursor/skills/tr-dashboard-ssot-guard/scripts/validate_optionc.py
```

---

## References

- contract-optionc-v0.8.0.md
- runbook-state-reflow-collision.md
- tr-dashboard-plan.md
- tr-dashboard-verification-report.md
