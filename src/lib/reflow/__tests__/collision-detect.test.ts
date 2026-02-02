/**
 * Unit tests for Collision Detection
 */

import { describe, it, expect } from 'vitest';
import { detectCollisions } from '../collision-detect';
import type { Activity, OptionC } from '../../../types/ssot';

function createMockActivity(
  id: string,
  options: {
    resources?: Array<{ resource_id?: string; pool_id?: string; resource_kind: string; qty: number }>;
    constraints?: Array<{ constraint_type: string; params?: Record<string, any> }>;
    lockLevel?: 'none' | 'baseline';
    actualStart?: string | null;
    planStart?: string | null;
  } = {}
): Activity {
  return {
    activity_id: id,
    type_id: 'test',
    trip_id: 'TRIP_TEST',
    tr_ids: ['TR_TEST'],
    title: `Activity ${id}`,
    state: 'planned',
    lock_level: options.lockLevel || 'none',
    blocker_code: null,
    evidence_required: [],
    evidence_ids: [],
    reflow_pins: [],
    plan: {
      start_ts: options.planStart ?? null,
      end_ts: null,
      duration_min: 60,
      duration_mode: 'elapsed',
      location: {
        from_location_id: 'LOC_TEST',
        to_location_id: 'LOC_TEST',
        route_id: null,
        geo_fence_ids: []
      },
      dependencies: [],
      resources: options.resources || [],
      constraints: options.constraints || [],
      notes: ''
    },
    actual: {
      start_ts: options.actualStart ?? null,
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
  };
}

function createMinimalSSOT(): OptionC {
  return {
    contract: { version: '0.8.0', ssot: { activity_is_source_of_truth: true } },
    constraint_rules: {} as any,
    activity_types: {},
    entities: {
      locations: {},
      resource_pools: {},
      resources: {},
      trs: {},
      trips: {},
      evidence_items: {},
      activities: {}
    },
    collisions: {},
    reflow_runs: [],
    baselines: { current: null, history: [] },
    history_events: []
  };
}

describe('Collision Detection', () => {
  const ssot = createMinimalSSOT();

  describe('resource_overallocated', () => {
    it('should detect overlap when same resource used in overlapping windows', () => {
      const activities = [
        createMockActivity('A', {
          resources: [{ resource_id: 'CRANE_01', resource_kind: 'crane', qty: 1 }]
        }),
        createMockActivity('B', {
          resources: [{ resource_id: 'CRANE_01', resource_kind: 'crane', qty: 1 }]
        })
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T10:00:00Z' }],
        ['B', { es_ts: '2026-02-05T09:00:00Z', ef_ts: '2026-02-05T11:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '', lf_ts: '', slack_min: 0 }],
        ['B', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const resourceCollisions = result.collisions.filter(c => c.kind === 'resource_overallocated');
      expect(resourceCollisions.length).toBeGreaterThan(0);
      expect(resourceCollisions[0].resource_ids).toContain('CRANE_01');
      expect(resourceCollisions[0].activity_ids).toContain('A');
      expect(resourceCollisions[0].activity_ids).toContain('B');
    });

    it('should not detect overlap when time windows do not overlap', () => {
      const activities = [
        createMockActivity('A', {
          resources: [{ resource_id: 'CRANE_01', resource_kind: 'crane', qty: 1 }]
        }),
        createMockActivity('B', {
          resources: [{ resource_id: 'CRANE_01', resource_kind: 'crane', qty: 1 }]
        })
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T09:00:00Z' }],
        ['B', { es_ts: '2026-02-05T10:00:00Z', ef_ts: '2026-02-05T11:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '', lf_ts: '', slack_min: 0 }],
        ['B', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const resourceCollisions = result.collisions.filter(c => c.kind === 'resource_overallocated');
      expect(resourceCollisions.length).toBe(0);
    });
  });

  describe('negative_slack', () => {
    it('should detect negative slack collision', () => {
      const activities = [
        createMockActivity('A'),
        createMockActivity('B')
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T09:00:00Z' }],
        ['B', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T09:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '2026-02-05T07:00:00Z', lf_ts: '2026-02-05T08:00:00Z', slack_min: -60 }],
        ['B', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const slackCollisions = result.collisions.filter(c => c.kind === 'negative_slack');
      expect(slackCollisions.length).toBe(1);
      expect(slackCollisions[0].activity_ids).toContain('A');
      expect(slackCollisions[0].details.slack_min).toBe(-60);
    });
  });

  describe('constraint_violation', () => {
    it('should detect not_before violation', () => {
      const activities = [
        createMockActivity('A', {
          constraints: [
            { kind: 'not_before', hardness: 'hard', rule_ref: '', params: { target_ts: '2026-02-05T10:00:00Z' } }
          ]
        })
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T09:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const constraintCollisions = result.collisions.filter(c => c.kind === 'constraint_violation');
      expect(constraintCollisions.length).toBe(1);
      expect(constraintCollisions[0].details.constraint_type).toBe('not_before');
    });

    it('should detect not_after violation', () => {
      const activities = [
        createMockActivity('A', {
          constraints: [
            { kind: 'not_after', hardness: 'hard', rule_ref: '', params: { target_ts: '2026-02-05T09:00:00Z' } }
          ]
        })
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T11:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const constraintCollisions = result.collisions.filter(c => c.kind === 'constraint_violation');
      expect(constraintCollisions.length).toBe(1);
      expect(constraintCollisions[0].details.constraint_type).toBe('not_after');
    });
  });

  describe('baseline_violation', () => {
    it('should detect baseline violation when ES differs from frozen start', () => {
      const activities = [
        createMockActivity('A', {
          lockLevel: 'baseline',
          planStart: '2026-02-05T10:00:00Z'
        })
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T09:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const baselineCollisions = result.collisions.filter(c => c.kind === 'baseline_violation');
      expect(baselineCollisions.length).toBeGreaterThan(0);
    });
  });

  describe('suggested_actions', () => {
    it('should include suggested_actions for resource_overallocated', () => {
      const activities = [
        createMockActivity('A', {
          resources: [{ resource_id: 'CRANE_01', resource_kind: 'crane', qty: 1 }]
        }),
        createMockActivity('B', {
          resources: [{ resource_id: 'CRANE_01', resource_kind: 'crane', qty: 1 }]
        })
      ];

      const esefResults = new Map([
        ['A', { es_ts: '2026-02-05T08:00:00Z', ef_ts: '2026-02-05T10:00:00Z' }],
        ['B', { es_ts: '2026-02-05T09:00:00Z', ef_ts: '2026-02-05T11:00:00Z' }]
      ]);

      const lslfResults = new Map([
        ['A', { ls_ts: '', lf_ts: '', slack_min: 0 }],
        ['B', { ls_ts: '', lf_ts: '', slack_min: 0 }]
      ]);

      const result = detectCollisions({
        activities,
        esefResults,
        lslfResults,
        tripId: 'TRIP_TEST',
        ssot
      });

      const resourceCollision = result.collisions.find(c => c.kind === 'resource_overallocated');
      expect(resourceCollision?.suggested_actions).toBeDefined();
      expect(resourceCollision!.suggested_actions.length).toBeGreaterThan(0);
      expect(resourceCollision!.suggested_actions.some(a => a.kind === 'shift_activity')).toBe(true);
      expect(resourceCollision!.suggested_actions.some(a => a.kind === 'swap_resource')).toBe(true);
    });
  });
});
