/**
 * Unit tests for Reflow Manager (Preview/Apply)
 */

import { describe, it, expect } from 'vitest';
import { loadSSOTSync } from '../../ssot-loader';
import { reflowPreview, reflowApply, type Approval } from '../reflow-manager';
import type { OptionC, Activity } from '../../../types/ssot';

/** Create SSOT with cycle A→B→C→A for T11.2 */
function createCycleDependency(cycleIds: string[]): OptionC {
  const baseTs = '2026-02-01T08:00:00+04:00';
  const activities: Record<string, Activity> = {};
  for (let i = 0; i < cycleIds.length; i++) {
    const id = cycleIds[i];
    const predId = cycleIds[(i + 1) % cycleIds.length]; // A→B→C→A: A depends on B, B on C, C on A
    activities[id] = {
      activity_id: id,
      type_id: 'test',
      trip_id: 'TRIP_CYCLE',
      tr_ids: ['TR_CYCLE'],
      title: `Activity ${id}`,
      state: 'planned',
      lock_level: 'none',
      blocker_code: null,
      evidence_required: [],
      evidence_ids: [],
      reflow_pins: [],
      plan: {
        start_ts: baseTs,
        end_ts: baseTs,
        duration_min: 60,
        duration_mode: 'elapsed',
        location: {
          from_location_id: 'LOC_TEST',
          to_location_id: 'LOC_TEST',
          route_id: null,
          geo_fence_ids: []
        },
        dependencies: [{ pred_activity_id: predId, type: 'fs', lag_min: 0 }],
        resources: [],
        constraints: [],
        notes: ''
      },
      actual: {
        start_ts: null,
        end_ts: null,
        progress_pct: 0,
        location_override: null,
        resource_assignments: [],
        notes: ''
      },
      calc: {
        es_ts: null,
        ef_ts: null,
        ls_ts: null,
        lf_ts: null,
        slack_min: null,
        critical_path: false,
        collision_ids: [],
        collision_severity_max: null,
        risk_score: 0,
        predicted_end_ts: null,
        reflow: { last_preview_run_id: null, last_apply_run_id: null }
      }
    } as Activity;
  }
  return {
    contract: { version: '0.8.0', ssot: { activity_is_source_of_truth: true } },
    constraint_rules: {} as any,
    activity_types: {},
    entities: {
      locations: { LOC_TEST: { location_id: 'LOC_TEST', name: 'Test', lat: 25, lon: 55 } },
      resource_pools: {},
      resources: {},
      trs: {
        TR_CYCLE: {
          tr_id: 'TR_CYCLE',
          name: 'TR Cycle',
          spec: {},
          calc: {}
        }
      },
      trips: {
        TRIP_CYCLE: {
          trip_id: 'TRIP_CYCLE',
          name: 'Trip Cycle',
          tr_ids: ['TR_CYCLE'],
          activity_ids: cycleIds,
          calc: {}
        }
      },
      evidence_items: {},
      activities
    },
    collisions: {},
    reflow_runs: [],
    baselines: { current_baseline_id: null, items: {} },
    history_events: []
  } as OptionC;
}

describe('Reflow Manager', () => {
  describe('reflowPreview', () => {
    it('should run preview without mutating SSOT', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const original = JSON.stringify(ssot);

      const result = reflowPreview(ssot, {
        reason: 'date_cursor_changed',
        cursor_ts: '2026-02-05T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // SSOT should not be mutated
      expect(JSON.stringify(ssot)).toBe(original);

      // Result should have required fields
      expect(result.run_id).toBeDefined();
      expect(result.mode).toBe('preview');
      expect(result.proposed_changes).toBeDefined();
      expect(Array.isArray(result.proposed_changes)).toBe(true);
      expect(result.applied_changes).toEqual([]);
      expect(result.collision_summary).toBeDefined();
      expect(result.collision_summary.blocking).toBeGreaterThanOrEqual(0);
      expect(result.collision_summary.warning).toBeGreaterThanOrEqual(0);
      expect(result.collision_summary.info).toBeGreaterThanOrEqual(0);
    });

    it('should return proposed_changes when ES/EF differs from plan', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');

      const result = reflowPreview(ssot, {
        reason: 'date_cursor_changed',
        cursor_ts: '2026-02-01T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // May or may not have proposed changes depending on data
      expect(Array.isArray(result.proposed_changes)).toBe(true);
      for (const change of result.proposed_changes) {
        expect(change).toHaveProperty('activity_id');
        expect(change).toHaveProperty('path');
        expect(change).toHaveProperty('from');
        expect(change).toHaveProperty('to');
        expect(change).toHaveProperty('reason_code');
      }
    });

    it('should handle empty activities', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_minimal.json');

      const result = reflowPreview(ssot, {
        reason: 'initial_load',
        focus_trip_id: 'NONEXISTENT'
      });

      expect(result.proposed_changes).toEqual([]);
      expect(result.collision_summary).toEqual({ blocking: 0, warning: 0, info: 0 });
    });

    it('Phase 0-3: reflow produces identical results for same input (10 runs)', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const seed = {
        reason: 'determinism_test',
        cursor_ts: '2026-02-05T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      };

      const results = Array.from({ length: 10 }, () =>
        reflowPreview(JSON.parse(JSON.stringify(ssot)), seed)
      );

      const hashes = results.map((r) =>
        JSON.stringify(
          r.proposed_changes
            .slice()
            .sort((a, b) =>
              (a.activity_id + a.path).localeCompare(b.activity_id + b.path)
            )
        )
      );
      expect(new Set(hashes).size).toBe(1);
    });

    it('T11.2: cycle detection prevents infinite loop', () => {
      const cycleData = createCycleDependency(['A', 'B', 'C']);
      const result = reflowPreview(cycleData, {
        reason: 'cycle_test',
        focus_trip_id: 'TRIP_CYCLE'
      });

      expect(result.collision_summary.blocking).toBeGreaterThan(0);
      expect(result.collisions).toBeDefined();
      expect(result.collisions!.some((c) => c.kind === 'dependency_cycle')).toBe(true);
    });
  });

  describe('reflowApply', () => {
    it('should apply changes with approval', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const preview = reflowPreview(ssot, {
        reason: 'date_cursor_changed',
        cursor_ts: '2026-02-01T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      if (preview.proposed_changes.length === 0) {
        return; // Skip if no changes to apply
      }

      const approval: Approval = {
        approved_by: 'user:pm',
        approved_at: new Date().toISOString()
      };

      const result = reflowApply(ssot, preview, approval, { viewMode: 'live' });

      expect(result.mode).toBe('apply');
      expect(result.applied_changes.length).toBeGreaterThan(0);
      expect(ssot.reflow_runs.length).toBeGreaterThan(0);
    });

    it('should throw without approval', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const preview = reflowPreview(ssot, {
        reason: 'test',
        focus_trip_id: 'TRIP_2026_02A'
      });

      expect(() => {
        reflowApply(ssot, preview, null as any, { viewMode: 'live' });
      }).toThrow('approval');

      expect(() => {
        reflowApply(ssot, preview, { approved_by: '', approved_at: '' }, { viewMode: 'live' });
      }).toThrow('approval');
    });

    it('should throw in Approval mode', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const preview = reflowPreview(ssot, {
        reason: 'test',
        focus_trip_id: 'TRIP_2026_02A'
      });

      const approval: Approval = {
        approved_by: 'user:pm',
        approved_at: new Date().toISOString()
      };

      expect(() => {
        reflowApply(ssot, preview, approval, { viewMode: 'approval' });
      }).toThrow('Approval mode');
    });
  });

  describe('T11.4 E2E workflow', () => {
    it('full workflow: load SSOT → reflow preview → apply (when changes)', () => {
      // 1. Load SSOT
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');

      // 2. Generate reflow preview
      const preview = reflowPreview(ssot, {
        reason: 'e2e_workflow',
        cursor_ts: '2026-02-01T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // 3. Verify preview structure
      expect(preview.run_id).toBeDefined();
      expect(preview.mode).toBe('preview');
      expect(preview.collision_summary).toBeDefined();
      expect(preview.proposed_changes).toBeDefined();
      expect(Array.isArray(preview.proposed_changes)).toBe(true);

      // 4. If proposed_changes > 0: apply with approval
      if (preview.proposed_changes.length > 0) {
        const approval: Approval = {
          approved_by: 'user:e2e',
          approved_at: new Date().toISOString()
        };
        const applied = reflowApply(ssot, preview, approval, { viewMode: 'live' });

        expect(applied.mode).toBe('apply');
        expect(applied.applied_changes.length).toBeGreaterThan(0);
        expect(ssot.reflow_runs?.length).toBeGreaterThan(0);
      }

      // 5. If collisions: verify structure (suggested_actions when blocking)
      if (preview.collisions && preview.collisions.length > 0) {
        const blocking = preview.collisions.filter((c) => c.severity === 'blocking');
        for (const col of blocking) {
          expect(col.kind).toBeDefined();
          expect(col.activity_ids).toBeDefined();
          expect(col.suggested_actions).toBeDefined();
        }
      }
    });
  });

  describe('Preview/Apply separation', () => {
    it('should not mutate SSOT in preview', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const before = JSON.parse(JSON.stringify(ssot));

      reflowPreview(ssot, {
        reason: 'test',
        cursor_ts: '2026-02-05T10:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // Deep compare - entities.activities should be unchanged
      expect(JSON.stringify(ssot.entities.activities)).toBe(
        JSON.stringify(before.entities.activities)
      );
    });
  });
});
