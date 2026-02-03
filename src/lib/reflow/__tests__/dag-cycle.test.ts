/**
 * Unit tests for DAG Cycle Detection
 */

import { describe, it, expect } from 'vitest';
import { detectDependencyCycles, wouldCreateCycle } from '../dag-cycle';
import type { Activity } from '../../../types/ssot';

function createMockActivity(
  id: string,
  dependencies: { pred_activity_id: string; type: 'fs' }[]
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
      duration_min: 60,
      duration_mode: 'elapsed',
      location: {
        from_location_id: 'LOC_TEST',
        to_location_id: 'LOC_TEST',
        route_id: null,
        geo_fence_ids: []
      },
      dependencies: dependencies.map(d => ({ ...d, lag_min: 0 })),
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

describe('DAG Cycle Detection', () => {
  describe('detectDependencyCycles', () => {
    it('should detect no cycle in linear chain', () => {
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }]),
        createMockActivity('C', [{ pred_activity_id: 'B', type: 'fs' }])
      ];
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      
      expect(result.hasCycle).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.collision).toBeNull();
    });
    
    it('should detect simple A→B→A cycle', () => {
      const activities = [
        createMockActivity('A', [{ pred_activity_id: 'B', type: 'fs' }]),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }])
      ];
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      
      expect(result.hasCycle).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
      
      // Check collision
      expect(result.collision).not.toBeNull();
      expect(result.collision?.kind).toBe('dependency_cycle');
      expect(result.collision?.severity).toBe('blocking');
    });
    
    it('should detect A→B→C→A cycle', () => {
      const activities = [
        createMockActivity('A', [{ pred_activity_id: 'C', type: 'fs' }]),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }]),
        createMockActivity('C', [{ pred_activity_id: 'B', type: 'fs' }])
      ];
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      
      expect(result.hasCycle).toBe(true);
      
      // Check collision message includes cycle path
      expect(result.collision?.message).toContain('→');
      expect(result.collision?.details.cycles).toBeDefined();
    });
    
    it('should generate suggested actions for breaking cycle', () => {
      const activities = [
        createMockActivity('A', [{ pred_activity_id: 'B', type: 'fs' }]),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }])
      ];
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      
      expect(result.collision?.suggested_actions).toBeDefined();
      expect(result.collision?.suggested_actions.length).toBeGreaterThan(0);
      
      // Each action should be remove_dependency
      for (const action of result.collision!.suggested_actions) {
        expect(action.kind).toBe('remove_dependency');
        expect(action.params).toHaveProperty('pred_activity_id');
        expect(action.params).toHaveProperty('succ_activity_id');
      }
    });
    
    it('should handle complex graph with multiple cycles', () => {
      // Diamond with back edges creating multiple cycles
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }]),
        createMockActivity('C', [{ pred_activity_id: 'A', type: 'fs' }]),
        createMockActivity('D', [
          { pred_activity_id: 'B', type: 'fs' },
          { pred_activity_id: 'C', type: 'fs' }
        ]),
        // Back edge creating cycle
        createMockActivity('E', [{ pred_activity_id: 'D', type: 'fs' }]),
        createMockActivity('A_alt', [{ pred_activity_id: 'E', type: 'fs' }])
      ];
      
      // Modify A to depend on A_alt to create cycle
      activities[0].plan.dependencies.push({
        pred_activity_id: 'A_alt',
        type: 'fs',
        lag_min: 0
      });
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      
      expect(result.hasCycle).toBe(true);
    });
    
    it('should handle graph with no dependencies', () => {
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', []),
        createMockActivity('C', [])
      ];
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      
      expect(result.hasCycle).toBe(false);
    });
  });
  
  describe('wouldCreateCycle', () => {
    it('should return false for valid new dependency', () => {
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }])
      ];
      
      const newDep = {
        pred_activity_id: 'B',
        succ_activity_id: 'C'
      };
      
      const wouldCycle = wouldCreateCycle(activities, newDep);
      
      expect(wouldCycle).toBe(false);
    });
    
    it('should return true if new dependency creates cycle', () => {
      const activities = [
        createMockActivity('A', []),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }]),
        createMockActivity('C', [{ pred_activity_id: 'B', type: 'fs' }])
      ];
      
      // Adding C→A would create cycle
      const newDep = {
        pred_activity_id: 'C',
        succ_activity_id: 'A'
      };
      
      const wouldCycle = wouldCreateCycle(activities, newDep);
      
      expect(wouldCycle).toBe(true);
    });
    
    it('should return true if new dependency creates self-loop', () => {
      const activities = [
        createMockActivity('A', [])
      ];
      
      // Self-loop: A→A
      const newDep = {
        pred_activity_id: 'A',
        succ_activity_id: 'A'
      };
      
      const wouldCycle = wouldCreateCycle(activities, newDep);
      
      expect(wouldCycle).toBe(true);
    });
  });
  
  describe('collision format', () => {
    it('should include all required collision fields', () => {
      const activities = [
        createMockActivity('A', [{ pred_activity_id: 'B', type: 'fs' }]),
        createMockActivity('B', [{ pred_activity_id: 'A', type: 'fs' }])
      ];
      
      const result = detectDependencyCycles(activities, 'TRIP_TEST');
      const collision = result.collision!;
      
      // Contract v0.8.0 required fields
      expect(collision).toHaveProperty('collision_id');
      expect(collision).toHaveProperty('kind');
      expect(collision).toHaveProperty('severity');
      expect(collision).toHaveProperty('status');
      expect(collision).toHaveProperty('trip_id');
      expect(collision).toHaveProperty('activity_ids');
      expect(collision).toHaveProperty('resource_ids');
      expect(collision).toHaveProperty('rule_refs');
      expect(collision).toHaveProperty('message');
      expect(collision).toHaveProperty('details');
      expect(collision).toHaveProperty('suggested_actions');
      
      // Verify values
      expect(collision.kind).toBe('dependency_cycle');
      expect(collision.severity).toBe('blocking');
      expect(collision.trip_id).toBe('TRIP_TEST');
      expect(collision.activity_ids).toContain('A');
      expect(collision.activity_ids).toContain('B');
    });
  });
});
