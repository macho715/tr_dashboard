# TR Dashboard Verification Report

**Generated**: 2026-02-03 (tr-dashboard-autopilot run)  
**Plan**: tr-dashboard-plan.md  
**Contract**: option_c.json (v0.8.0)

**운영 규모**: 1 Trip당 1 TR 운송, 총 7 Trip, SPMT 1기 운영

---

## Executive Summary

| Gate | Status | Notes |
|------|--------|-------|
| **Lint** | FAIL | 244 problems (4 errors, 240 warnings) |
| **Typecheck** | FAIL | Multiple TS errors (app, components, lib, src, vis-timeline-gantt) |
| **Test** | PASS | 170 tests, 23 files |
| **SSOT** | PASS | validate_optionc.py: Activities 16, Trips 2, TRs 3, Collisions 2 |

**Overall**: FAIL (lint + typecheck must pass for merge)

---

## Lint (FAIL)

- **Exit**: 1
- **Errors (4)**:
  - `vis-timeline-gantt/components/ui/sidebar.tsx:663` – `Math.random` in render (react-hooks/purity)
  - Plus 3 other rule violations (set-state-in-effect, etc.)
- **Warnings (240)**: unused vars, setState-in-effect, exhaustive-deps, no-explicit-any, etc. across app, components, lib, src, tr_dashboard-main, vis-timeline-gantt.

---

## Typecheck (FAIL)

- **Exit**: 2
- **Scope**: app (page.tsx trips/trs typing, voyage `.id`), components (JSX namespace, EvidenceTab/HistoryEvidencePanel props, VisTimelineGantt animation options, MapContent/leaflet, GanttChart chartAreaRef), lib (reflow-engine DEFAULT_REFLOW_OPTIONS, baseline-loader, evidence-gate, schedule-mapper, pipeline-runner), src (tests, reflow types, ssot types), vis-timeline-gantt (path aliases, types).

---

## Test (PASS)

- **Exit**: 0
- **Result**: 170 tests, 23 test files
- **Coverage**: ssot-loader, dag-cycle, collision-detect, topo-sort, gantt-utils, backward/forward-pass, history-evidence, derived-calc, freeze-policy, state-machine, view-mode-store, map-status-colors, slack-calc, visTimelineMapper, reflow-manager, baseline, schedule, detail-panel, why-panel, etc.

---

## SSOT (PASS)

- **Command**: `pnpm run validate:ssot` → `python scripts/validate_optionc.py tests/fixtures/option_c_baseline.json`
- **Result**: VALIDATION PASSED (Activities: 16, Trips: 2, TRs: 3, Collisions: 2)

---

## Next Steps (Implementer)

1. **Lint**: Fix 4 errors first (e.g. sidebar.tsx purity, setState-in-effect); then reduce critical warnings.
2. **Typecheck**: Fix errors in main app (page.tsx, components used by dashboard), then lib, then src/vis-timeline-gantt if in scope.
3. Re-run: `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:run`, `pnpm run validate:ssot`, `pnpm run build`.

---

## Commands (from package.json)

- `pnpm run lint` – eslint .
- `pnpm run typecheck` – tsc --noEmit
- `pnpm run test` / `pnpm run test:run` – vitest
- `pnpm run validate:ssot` – python scripts/validate_optionc.py tests/fixtures/option_c_baseline.json
- `pnpm run build` – next build
