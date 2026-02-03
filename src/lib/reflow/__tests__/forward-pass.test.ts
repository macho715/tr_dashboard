/**
 * Unit tests for Forward Pass
 */

import { describe, it, expect } from 'vitest';
import { forwardPass } from '../forward-pass';
import type { Activity, OptionC } from '../../../types/ssot';

function createMockActivity(
  id: string,
  dependencies: Array<{ pred_activity_id: string; type: 'fs' | 'ss'; lag_min: number }> = [],
  durationMin: number = 60,
  options: {
    actualStart?: string;
    lockLevel?: 'none' | 'soft' | 'hard' | 'baseline';
    durationMode?: 'elapsed' | 'work_hours';
    constraints?: Activity['plan']['constraints'];
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
      start_ts: null,
      end_ts: null,
      duration_min: durationMin,
      duration_mode: options.durationMode || 'elapsed',
      location: {
        from_location_id: 'LOC_TEST',
        to_location_id: 'LOC_TEST',
        route_id: null,
        geo_fence_ids: []
      },
      dependencies,
      resources: [],
      constraints: options.constraints || [],
      notes: ''
    },
    actual: {
      start_ts: options.actualStart || null,
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
    contract: {
      version: '0.8.0',
      ssot: { activity_is_source_of_truth: true }
    },
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

describe('Forward Pass', () => {
  const dateCursor = '2026-02-05T08:00:00+04:00';
  const ssot = createMinimalSSOT();
  
  describe('basic ES/EF calculation', () => {
    it('should calculate ES=dateCursor for activity with no dependencies', () => {
      const activities = [
        createMockActivity('A', [], 60)
      ];
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      const es = new Date(result.activities.get('A')!.es_ts);
      const expected = new Date(dateCursor);
      
      expect(es.getTime()).toBe(expected.getTime());
    });
    
    it('should calculate EF = ES + duration for elapsed mode', () => {
      const activities = [
        createMockActivity('A', [], 120) // 2 hours
      ];
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      const es = new Date(result.activities.get('A')!.es_ts);
      const ef = new Date(result.activities.get('A')!.ef_ts);
      
      const diffMin = (ef.getTime() - es.getTime()) / 60000;
      expect(diffMin).toBe(120);
    });
    
    it('should calculate ES from predecessor EF for FS dependency', () => {
      const activities = [
        createMockActivity('A', [], 60),
        createMockActivity('B', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 0 }
        ], 60)
      ];
      
      const result = forwardPass(activities, ['A', 'B'], dateCursor, ssot);
      
      const aEF = result.activities.get('A')!.ef_ts;
      const bES = result.activities.get('B')!.es_ts;
      
      expect(bES).toBe(aEF); // B starts when A finishes
    });
    
    it('should apply lag to FS dependency', () => {
      const activities = [
        createMockActivity('A', [], 60),
        createMockActivity('B', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 30 }
        ], 60)
      ];
      
      const result = forwardPass(activities, ['A', 'B'], dateCursor, ssot);
      
      const aEF = new Date(result.activities.get('A')!.ef_ts);
      const bES = new Date(result.activities.get('B')!.es_ts);
      
      const diffMin = (bES.getTime() - aEF.getTime()) / 60000;
      expect(diffMin).toBe(30);
    });
    
    it('should handle SS (start-to-start) dependency', () => {
      const activities = [
        createMockActivity('A', [], 120),
        createMockActivity('B', [
          { pred_activity_id: 'A', type: 'ss', lag_min: 30 }
        ], 60)
      ];
      
      const result = forwardPass(activities, ['A', 'B'], dateCursor, ssot);
      
      const aES = new Date(result.activities.get('A')!.es_ts);
      const bES = new Date(result.activities.get('B')!.es_ts);
      
      const diffMin = (bES.getTime() - aES.getTime()) / 60000;
      expect(diffMin).toBe(30); // B starts 30min after A starts
    });
    
    it('should take max of multiple predecessors', () => {
      const activities = [
        createMockActivity('A', [], 60),
        createMockActivity('B', [], 120),
        createMockActivity('C', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 0 },
          { pred_activity_id: 'B', type: 'fs', lag_min: 0 }
        ], 60)
      ];
      
      const result = forwardPass(activities, ['A', 'B', 'C'], dateCursor, ssot);
      
      const aEF = new Date(result.activities.get('A')!.ef_ts);
      const bEF = new Date(result.activities.get('B')!.ef_ts);
      const cES = new Date(result.activities.get('C')!.es_ts);
      
      // C starts after BOTH A and B finish
      // B finishes later (120min vs 60min), so C should start at B's EF
      expect(cES).toEqual(bEF);
    });
  });
  
  describe('freeze handling', () => {
    it('should freeze activity with actual.start_ts', () => {
      const frozenStart = '2026-02-05T10:30:00+04:00';
      
      const activities = [
        createMockActivity('A', [], 60, { actualStart: frozenStart })
      ];
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      expect(result.activities.get('A')?.es_ts).toBe(frozenStart);
      expect(result.frozen.has('A')).toBe(true);
    });
    
    it('should freeze activity with baseline lock_level', () => {
      const activities = [
        createMockActivity('A', [], 60, { lockLevel: 'baseline' })
      ];
      
      // Set plan.start_ts for baseline
      activities[0].plan.start_ts = '2026-02-05T09:00:00+04:00';
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      expect(result.activities.get('A')?.es_ts).toBe(activities[0].plan.start_ts);
      expect(result.frozen.has('A')).toBe(true);
    });
    
    it('should propagate frozen start to successors', () => {
      const frozenStart = '2026-02-05T10:00:00+04:00';
      
      const activities = [
        createMockActivity('A', [], 60, { actualStart: frozenStart }),
        createMockActivity('B', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 0 }
        ], 60)
      ];
      
      const result = forwardPass(activities, ['A', 'B'], dateCursor, ssot);
      
      const aEF = new Date(result.activities.get('A')!.ef_ts);
      const bES = new Date(result.activities.get('B')!.es_ts);
      
      // B should start after frozen A finishes
      expect(bES).toEqual(aEF);
    });
  });
  
  describe('constraint application', () => {
    it('should apply not_before constraint', () => {
      const notBefore = '2026-02-05T10:00:00+04:00';
      
      const activities = [
        createMockActivity('A', [], 60, {
          constraints: [{
            constraint_type: 'not_before',
            params: { target_ts: notBefore }
          }]
        })
      ];
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      const es = new Date(result.activities.get('A')!.es_ts);
      const notBeforeDate = new Date(notBefore);
      
      expect(es.getTime()).toBeGreaterThanOrEqual(notBeforeDate.getTime());
    });
    
    it('should apply within_window constraint', () => {
      const windowStart = '2026-02-05T11:00:00+04:00';
      
      const activities = [
        createMockActivity('A', [], 60, {
          constraints: [{
            constraint_type: 'within_window',
            params: {
              start_ts: windowStart,
              end_ts: '2026-02-05T17:00:00+04:00'
            }
          }]
        })
      ];
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      const es = new Date(result.activities.get('A')!.es_ts);
      const windowStartDate = new Date(windowStart);
      
      expect(es).toEqual(windowStartDate);
    });
    
    it('should apply strongest constraint when multiple exist', () => {
      const notBefore1 = '2026-02-05T09:00:00+04:00';
      const notBefore2 = '2026-02-05T11:00:00+04:00';
      
      const activities = [
        createMockActivity('A', [], 60, {
          constraints: [
            { constraint_type: 'not_before', params: { target_ts: notBefore1 } },
            { constraint_type: 'not_before', params: { target_ts: notBefore2 } }
          ]
        })
      ];
      
      const result = forwardPass(activities, ['A'], dateCursor, ssot);
      
      const es = new Date(result.activities.get('A')!.es_ts);
      const laterConstraint = new Date(notBefore2);
      
      expect(es).toEqual(laterConstraint);
    });
  });
  
  describe('chain propagation', () => {
    it('should correctly propagate through A→B→C chain', () => {
      const activities = [
        createMockActivity('A', [], 60),
        createMockActivity('B', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 0 }
        ], 90),
        createMockActivity('C', [
          { pred_activity_id: 'B', type: 'fs', lag_min: 30 }
        ], 120)
      ];
      
      const result = forwardPass(activities, ['A', 'B', 'C'], dateCursor, ssot);
      
      const aES = new Date(result.activities.get('A')!.es_ts);
      const aEF = new Date(result.activities.get('A')!.ef_ts);
      const bES = new Date(result.activities.get('B')!.es_ts);
      const bEF = new Date(result.activities.get('B')!.ef_ts);
      const cES = new Date(result.activities.get('C')!.es_ts);
      
      // Verify durations
      expect((aEF.getTime() - aES.getTime()) / 60000).toBe(60);
      expect((bEF.getTime() - bES.getTime()) / 60000).toBe(90);
      
      // Verify dependencies
      expect(bES).toEqual(aEF);
      expect((cES.getTime() - bEF.getTime()) / 60000).toBe(30);
    });
  });
});
