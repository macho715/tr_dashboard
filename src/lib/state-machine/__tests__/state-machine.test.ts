/**
 * Unit tests for State Machine + Evidence Gates
 */

import { describe, it, expect } from 'vitest';
import { isTransitionAllowed, getEvidenceGateStages } from '../states';
import { checkEvidenceGate } from '../evidence-gate';
import { transitionState } from '../transition';
import type { Activity, OptionC } from '../../../types/ssot';

function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    activity_id: 'ACT_TEST',
    type_id: 'test',
    trip_id: 'TRIP_TEST',
    tr_ids: ['TR_TEST'],
    title: 'Test Activity',
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
      dependencies: [],
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
    },
    ...overrides
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
      evidence_items: {
        EVD_001: {
          evidence_id: 'EVD_001',
          evidence_type: 'ptw_approval',
          title: 'PTW Approval',
          uri: 'file://ptw.pdf',
          captured_at: new Date().toISOString(),
          captured_by: 'user:ops',
          tags: []
        }
      },
      activities: {}
    },
    collisions: {},
    reflow_runs: [],
    baselines: { current_baseline_id: null, items: {} },
    history_events: []
  };
}

describe('State Machine', () => {
  describe('isTransitionAllowed', () => {
    it('should allow draft -> planned', () => {
      const result = isTransitionAllowed('draft', 'planned');
      expect(result.allowed).toBe(true);
    });

    it('should allow planned -> ready', () => {
      const result = isTransitionAllowed('planned', 'ready');
      expect(result.allowed).toBe(true);
    });

    it('should allow ready -> in_progress', () => {
      const result = isTransitionAllowed('ready', 'in_progress');
      expect(result.allowed).toBe(true);
    });

    it('should reject completed -> any (terminal)', () => {
      const result = isTransitionAllowed('completed', 'planned');
      expect(result.allowed).toBe(false);
    });

    it('should reject planned -> in_progress (not adjacent)', () => {
      const result = isTransitionAllowed('planned', 'in_progress');
      expect(result.allowed).toBe(false);
    });

    it('should allow planned -> canceled when no actual.start_ts', () => {
      const result = isTransitionAllowed('planned', 'canceled', {
        hasActualStart: false
      });
      expect(result.allowed).toBe(true);
    });

    it('should reject planned -> canceled when actual.start_ts exists', () => {
      const result = isTransitionAllowed('planned', 'canceled', {
        hasActualStart: true
      });
      expect(result.allowed).toBe(false);
    });

    it('should require blocker_code when entering blocked', () => {
      const result = isTransitionAllowed('ready', 'blocked', {
        blockerCode: null
      });
      expect(result.allowed).toBe(false);
    });

    it('should allow blocked when blocker_code provided', () => {
      const result = isTransitionAllowed('ready', 'blocked', {
        blockerCode: 'RESOURCE_UNAVAILABLE'
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('getEvidenceGateStages', () => {
    it('should return before_ready for planned->ready', () => {
      const stages = getEvidenceGateStages('planned', 'ready');
      expect(stages).toContain('before_ready');
    });

    it('should return before_start for ready->in_progress', () => {
      const stages = getEvidenceGateStages('ready', 'in_progress');
      expect(stages).toContain('before_start');
    });

    it('should return empty for transitions without gate', () => {
      const stages = getEvidenceGateStages('in_progress', 'paused');
      expect(stages).toEqual([]);
    });
  });

  describe('checkEvidenceGate', () => {
    it('should allow when no evidence_required', () => {
      const activity = createMockActivity({ state: 'ready' });
      const result = checkEvidenceGate(activity, 'in_progress');
      expect(result.allowed).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should block when before_start evidence missing', () => {
      const activity = createMockActivity({
        state: 'ready',
        evidence_required: [
          {
            evidence_type: 'ptw_approval',
            stage: 'before_start',
            min_count: 1,
            required: true,
            validity_min: null,
            tags: []
          }
        ],
        evidence_ids: []
      });

      const ssot = createMinimalSSOT();
      const result = checkEvidenceGate(activity, 'in_progress', undefined, ssot);

      expect(result.allowed).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.blocker_code).toBeDefined();
    });

    it('T7.8: State transition button disabled when evidence gate fails', () => {
      const activity = createMockActivity({
        state: 'ready',
        evidence_required: [
          {
            evidence_type: 'ptw_approval',
            stage: 'before_start',
            min_count: 1,
            required: true,
            validity_min: null,
            tags: []
          }
        ],
        evidence_ids: []
      });

      const result = checkEvidenceGate(activity, 'in_progress');

      expect(result.allowed).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      // UI should disable transition button when allowed=false
    });

    it('should allow when evidence_ids satisfy min_count', () => {
      const activity = createMockActivity({
        state: 'ready',
        evidence_required: [
          {
            evidence_type: 'ptw_approval',
            stage: 'before_start',
            min_count: 1,
            required: true,
            validity_min: null,
            tags: []
          }
        ],
        evidence_ids: ['EVD_001']
      });

      const ssot = createMinimalSSOT();
      const result = checkEvidenceGate(activity, 'in_progress', undefined, ssot);

      expect(result.allowed).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('transitionState', () => {
    it('should succeed for allowed transition', () => {
      const activity = createMockActivity({ state: 'draft' });
      const result = transitionState(activity, 'planned', 'user:ops');

      expect(result.success).toBe(true);
      expect(activity.state).toBe('planned');
      expect(result.history_event.event_type).toBe('state_transition');
      expect(result.history_event.details.success).toBe(true);
    });

    it('should block READY->IN_PROGRESS when before_start evidence missing', () => {
      const activity = createMockActivity({
        state: 'ready',
        evidence_required: [
          {
            evidence_type: 'ptw_approval',
            stage: 'before_start',
            min_count: 1,
            required: true,
            validity_min: null,
            tags: []
          }
        ],
        evidence_ids: []
      });

      const ssot = createMinimalSSOT();
      const result = transitionState(activity, 'in_progress', 'user:ops', { ssot });

      expect(result.success).toBe(false);
      expect(activity.state).toBe('ready');
      expect(result.blocker_code).toBeDefined();
    });

    it('should allow PLANNED->CANCELED when no actual.start_ts', () => {
      const activity = createMockActivity({ state: 'planned' });
      const result = transitionState(activity, 'canceled', 'user:ops');

      expect(result.success).toBe(true);
      expect(activity.state).toBe('canceled');
    });

    it('should block IN_PROGRESS->CANCELED (use aborted)', () => {
      const activity = createMockActivity({
        state: 'in_progress',
        actual: { ...createMockActivity().actual, start_ts: '2026-02-05T08:00:00Z' }
      });
      const result = transitionState(activity, 'canceled', 'user:ops');

      expect(result.success).toBe(false);
      expect(activity.state).toBe('in_progress');
    });

    it('should require abortReason for IN_PROGRESS->ABORTED', () => {
      const activity = createMockActivity({ state: 'in_progress' });

      const resultNoReason = transitionState(activity, 'aborted', 'user:ops');
      expect(resultNoReason.success).toBe(false);

      const resultWithReason = transitionState(activity, 'aborted', 'user:ops', {
        abortReason: 'incident_unsafe'
      });
      expect(resultWithReason.success).toBe(true);
      expect(activity.state).toBe('aborted');
    });

    it('should set blocker_code when entering blocked', () => {
      const activity = createMockActivity({ state: 'ready' });
      const result = transitionState(activity, 'blocked', 'user:ops', {
        blockerCode: 'RESOURCE_UNAVAILABLE'
      });

      expect(result.success).toBe(true);
      expect(activity.state).toBe('blocked');
      expect(activity.blocker_code).toBe('RESOURCE_UNAVAILABLE');
    });

    it('should clear blocker_code when leaving blocked', () => {
      const activity = createMockActivity({
        state: 'blocked',
        blocker_code: 'RESOURCE_UNAVAILABLE'
      });
      const result = transitionState(activity, 'ready', 'user:ops');

      expect(result.success).toBe(true);
      expect(activity.state).toBe('ready');
      expect(activity.blocker_code).toBeNull();
    });
  });
});
