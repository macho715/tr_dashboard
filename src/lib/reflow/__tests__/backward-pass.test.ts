/**
 * Unit tests for Backward Pass
 */

import { describe, it, expect } from 'vitest';
import { backwardPass, identifyCriticalPath, calculateCriticalPathDuration } from '../backward-pass';
import type { Activity } from '../../../types/ssot';

function createMockActivity(
  id: string,
  dependencies: Array<{ pred_activity_id: string; type: 'fs' | 'ss'; lag_min: number }> = [],
  durationMin: number = 60
): Activity {
  return {
    activity_id: id,
    type_id: 'test',
    trip_id: 'TRIP_TEST',
    tr_ids: ['TR_TEST'],
    title: `Activity ${id}`,
    state: 'planned',
    lock_level: 'none',
    blocker_code: null,
    evidence_required: [],
    evidence_ids: [],
    reflow_pins: [],
    plan: {
      start_ts: null,
      end_ts: null,
      duration_min: durationMin,
      duration_mode: 'elapsed',
      location: {
        from_location_id: 'LOC_TEST',
        to_location_id: 'LOC_TEST',
        route_id: null,
        geo_fence_ids: []
      },
      dependencies,
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
  };
}

describe('Backward Pass', () => {
  describe('backwardPass', () => {
    it('should calculate LS/LF for single activity', () => {
      const activities = [
        createMockActivity('A', [], 60)
      ];
      
      const esefResults = new Map([
        ['A', {
          es_ts: '2026-02-05T08:00:00Z',
          ef_ts: '2026-02-05T09:00:00Z'
        }]
      ]);
      
      const result = backwardPass(activities, ['A'], esefResults);
      
      const aResult = result.activities.get('A')!;
      expect(aResult.lf_ts).toBe('2026-02-05T09:00:00.000Z');
      expect(aResult.slack_min).toBe(0);
      expect(aResult.critical_path).toBe(true);
    });
    
    it('should calculate slack for A→B chain', () => {
      const activities = [
        createMockActivity('A', [], 60),
        createMockActivity('B', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 0 }
        ], 60)
      ];
      
      const esefResults = new Map([
        ['A', {
          es_ts: '2026-02-05T08:00:00Z',
          ef_ts: '2026-02-05T09:00:00Z'
        }],
        ['B', {
          es_ts: '2026-02-05T09:00:00Z',
          ef_ts: '2026-02-05T10:00:00Z'
        }]
      ]);
      
      const result = backwardPass(activities, ['A', 'B'], esefResults);
      
      // Both should be on critical path (slack = 0)
      expect(result.activities.get('A')?.critical_path).toBe(true);
      expect(result.activities.get('B')?.critical_path).toBe(true);
      expect(result.activities.get('A')?.slack_min).toBe(0);
      expect(result.activities.get('B')?.slack_min).toBe(0);
    });
    
    it('should identify non-critical activity with slack', () => {
      // A→C, B→C diamond where B has slack
      const activities = [
        createMockActivity('A', [], 120), // 2 hours
        createMockActivity('B', [], 60),  // 1 hour (has slack)
        createMockActivity('C', [
          { pred_activity_id: 'A', type: 'fs', lag_min: 0 },
          { pred_activity_id: 'B', type: 'fs', lag_min: 0 }
        ], 60)
      ];
      
      const esefResults = new Map([
        ['A', {
          es_ts: '2026-02-05T08:00:00Z',
          ef_ts: '2026-02-05T10:00:00Z' // +120min
        }],
        ['B', {
          es_ts: '2026-02-05T08:00:00Z',
          ef_ts: '2026-02-05T09:00:00Z' // +60min
        }],
        ['C', {
          es_ts: '2026-02-05T10:00:00Z', // starts after A (later)
          ef_ts: '2026-02-05T11:00:00Z'
        }]
      ]);
      
      const result = backwardPass(activities, ['A', 'B', 'C'], esefResults);
      
      // A and C are critical (no slack)
      expect(result.activities.get('A')?.critical_path).toBe(true);
      expect(result.activities.get('C')?.critical_path).toBe(true);
      
      // B has slack (can delay up to 60min without affecting C)
      expect(result.activities.get('B')?.critical_path).toBe(false);
      expect(result.activities.get('B')?.slack_min).toBe(60);
    });
  });
  
  describe('identifyCriticalPath', () => {
    it('should return only critical activities', () => {
      const backwardResult = {
        activities: new Map([
          ['A', { ls_ts: '', lf_ts: '', slack_min: 0, critical_path: true }],
          ['B', { ls_ts: '', lf_ts: '', slack_min: 60, critical_path: false }],
          ['C', { ls_ts: '', lf_ts: '', slack_min: 0, critical_path: true }]
        ])
      };
      
      const critical = identifyCriticalPath(backwardResult);
      
      expect(critical).toEqual(['A', 'C']);
    });
  });
  
  describe('calculateCriticalPathDuration', () => {
    it('should calculate total project duration', () => {
      const esefResults = new Map([
        ['A', {
          es_ts: '2026-02-05T08:00:00Z',
          ef_ts: '2026-02-05T09:00:00Z'
        }],
        ['B', {
          es_ts: '2026-02-05T09:00:00Z',
          ef_ts: '2026-02-05T11:00:00Z' // latest finish
        }]
      ]);
      
      const duration = calculateCriticalPathDuration(esefResults);
      
      expect(duration).toBe(180); // 08:00 to 11:00 = 3 hours = 180 minutes
    });
  });
});
