/**
 * Unit tests for Topological Sort
 */

import { describe, it, expect } from 'vitest';
import { topologicalSort, verifyTopologicalDeterminism } from '../topo-sort';
import type { Activity } from '../../../types/ssot';

function createMockActivity(
  id: string,
  dependencies: string[] = [],
  lockLevel: 'none' | 'soft' | 'hard' | 'baseline' = 'none',
  startTs: string | null = null
): Activity {
  return {
    activity_id: id,
    type_id: 'test',
    trip_id: 'TRIP_TEST',
    tr_ids: ['TR_TEST'],
    title: `Activity ${id}`,
    state: 'planned',
    lock_level: lockLevel,
    blocker_code: null,
    evidence_required: [],
    evidence_ids: [],
    reflow_pins: [],
    plan: {
      start_ts: startTs,
      end_ts: null,
      duration_min: 60,
      duration_mode: 'elapsed',
      location: {
        from_location_id: 'LOC_TEST',
        to_location_id: 'LOC_TEST',
        route_id: null,
        geo_fence_ids: []
      },
      dependencies: dependencies.map(pred => ({
        pred_activity_id: pred,
        type: 'fs' as const,
        lag_min: 0
      })),
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

describe('Topological Sort', () => {
  describe('topologicalSort', () => {
    it('should sort linear chain A→B→C', () => {
      const activities = [
        createMockActivity('C', ['B']),
        createMockActivity('A', []),
        createMockActivity('B', ['A'])
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.success).toBe(true);
      expect(result.sorted).toEqual(['A', 'B', 'C']);
    });
    
    it('should sort diamond dependency A→B,C→D', () => {
      const activities = [
        createMockActivity('D', ['B', 'C']),
        createMockActivity('B', ['A']),
        createMockActivity('C', ['A']),
        createMockActivity('A', [])
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.success).toBe(true);
      expect(result.sorted[0]).toBe('A');
      expect(result.sorted[3]).toBe('D');
      // B and C can be in any order, but should be deterministic
    });
    
    it('should apply deterministic tie-breaking by lock_level', () => {
      // Two activities with no dependencies
      // hard lock should come before none lock
      const activities = [
        createMockActivity('Z_NONE', [], 'none'),
        createMockActivity('A_HARD', [], 'hard')
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.success).toBe(true);
      expect(result.sorted[0]).toBe('A_HARD'); // hard comes first
      expect(result.sorted[1]).toBe('Z_NONE');
    });
    
    it('should apply tie-breaking by start_ts when lock_level equal', () => {
      const activities = [
        createMockActivity('B', [], 'none', '2026-02-05T10:00:00+04:00'),
        createMockActivity('A', [], 'none', '2026-02-05T08:00:00+04:00')
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.success).toBe(true);
      expect(result.sorted[0]).toBe('A'); // Earlier start_ts comes first
    });
    
    it('should apply tie-breaking by activity_id when all else equal', () => {
      const activities = [
        createMockActivity('Z', [], 'none', null),
        createMockActivity('A', [], 'none', null),
        createMockActivity('M', [], 'none', null)
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.success).toBe(true);
      expect(result.sorted).toEqual(['A', 'M', 'Z']); // Alphabetical
    });
    
    it('should handle empty activity list', () => {
      const result = topologicalSort([]);
      
      expect(result.success).toBe(true);
      expect(result.sorted).toEqual([]);
    });
    
    it('should detect cycle and return error', () => {
      const activities = [
        createMockActivity('A', ['B']),
        createMockActivity('B', ['A'])
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('cycle');
    });
  });
  
  describe('verifyTopologicalDeterminism', () => {
    it('should verify determinism over 10 runs', () => {
      const activities = [
        createMockActivity('D', ['B', 'C']),
        createMockActivity('B', ['A']),
        createMockActivity('C', ['A']),
        createMockActivity('A', [])
      ];
      
      const verification = verifyTopologicalDeterminism(activities, 10);
      
      expect(verification.deterministic).toBe(true);
      expect(verification.uniqueResults).toBe(1);
    });
    
    it('should maintain determinism with complex graph', () => {
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', ['A']),
        createMockActivity('C', ['A']),
        createMockActivity('D', ['B']),
        createMockActivity('E', ['B']),
        createMockActivity('F', ['C']),
        createMockActivity('G', ['D', 'E', 'F'])
      ];
      
      const verification = verifyTopologicalDeterminism(activities, 20);
      
      expect(verification.deterministic).toBe(true);
      expect(verification.uniqueResults).toBe(1);
    });
    
    it('should produce same result with shuffled input', () => {
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', ['A']),
        createMockActivity('C', ['B'])
      ];
      
      // Get result with original order
      const result1 = topologicalSort(activities);
      
      // Shuffle
      const shuffled = [...activities].reverse();
      const result2 = topologicalSort(shuffled);
      
      expect(result1.sorted).toEqual(result2.sorted);
    });
  });
  
  describe('priority ordering', () => {
    it('should prioritize baseline > hard > soft > none', () => {
      const activities = [
        createMockActivity('D_NONE', [], 'none'),
        createMockActivity('C_SOFT', [], 'soft'),
        createMockActivity('A_BASELINE', [], 'baseline'),
        createMockActivity('B_HARD', [], 'hard')
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.sorted).toEqual(['A_BASELINE', 'B_HARD', 'C_SOFT', 'D_NONE']);
    });
    
    it('should use start_ts as secondary sort', () => {
      const activities = [
        createMockActivity('C', [], 'none', '2026-02-05T10:00:00+04:00'),
        createMockActivity('A', [], 'none', '2026-02-05T08:00:00+04:00'),
        createMockActivity('B', [], 'none', '2026-02-05T09:00:00+04:00')
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.sorted).toEqual(['A', 'B', 'C']);
    });
    
    it('should use activity_id as final tie-breaker', () => {
      const activities = [
        createMockActivity('Z', [], 'none', '2026-02-05T10:00:00+04:00'),
        createMockActivity('A', [], 'none', '2026-02-05T10:00:00+04:00'),
        createMockActivity('M', [], 'none', '2026-02-05T10:00:00+04:00')
      ];
      
      const result = topologicalSort(activities);
      
      expect(result.sorted).toEqual(['A', 'M', 'Z']);
    });
  });
});
