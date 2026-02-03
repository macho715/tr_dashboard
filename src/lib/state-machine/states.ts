/**
 * State Machine Definition (Contract v0.8.0)
 *
 * Allowed transitions from patch4.md section 5.4
 * Evidence gates: before_ready, before_start, after_end (mandatory)
 */

import type { ActivityState } from '../../types/ssot';

/** Allowed transitions: from -> to[] */
export const ALLOWED_TRANSITIONS: Record<ActivityState, ActivityState[]> = {
  draft: ['planned'],
  planned: ['ready', 'blocked', 'canceled'],
  ready: ['in_progress', 'blocked', 'canceled'],
  in_progress: ['paused', 'blocked', 'aborted', 'completed'],
  paused: ['in_progress', 'blocked', 'aborted'],
  blocked: ['ready', 'aborted'],
  completed: [], // Terminal state
  canceled: [], // Terminal state
  aborted: [] // Terminal state
};

/** Evidence gate stages per transition */
export const EVIDENCE_GATE_BY_TRANSITION: Record<string, string[]> = {
  'planned->ready': ['before_ready'],
  'ready->in_progress': ['before_start'],
  'blocked->ready': ['before_ready', 'before_start'], // Re-validate gates
  'in_progress->completed': ['after_end'], // Mandatory evidence
  'completed->verified': ['after_end'] // If VERIFIED exists
};

/** Guard: actual.start_ts blocks cancel (use aborted instead) */
export function canCancelFromState(state: ActivityState, hasActualStart: boolean): boolean {
  if (!['planned', 'ready'].includes(state)) {
    return false;
  }
  if (hasActualStart) {
    return false; // Must use aborted
  }
  return true;
}

/** Guard: aborted requires reason */
export function canAbortFromState(state: ActivityState): boolean {
  return ['in_progress', 'paused', 'blocked'].includes(state);
}

/** Guard: blocked requires blocker_code */
export function canBlockFromState(state: ActivityState): boolean {
  return ['planned', 'ready', 'in_progress', 'paused'].includes(state);
}

/** Check if transition is allowed */
export function isTransitionAllowed(
  from: ActivityState,
  to: ActivityState,
  context?: {
    hasActualStart?: boolean;
    hasActualEnd?: boolean;
    blockerCode?: string | null;
  }
): { allowed: boolean; reason?: string } {
  const allowedTo = ALLOWED_TRANSITIONS[from];
  if (!allowedTo.includes(to)) {
    return { allowed: false, reason: `Transition ${from}->${to} not in allowed adjacency` };
  }

  // completed is terminal
  if (from === 'completed') {
    return { allowed: false, reason: 'completed is terminal state' };
  }

  // canceled: only from planned/ready, no actual.start_ts
  if (to === 'canceled') {
    if (!canCancelFromState(from, context?.hasActualStart ?? false)) {
      return {
        allowed: false,
        reason: 'canceled only from planned/ready without actual.start_ts (use aborted)'
      };
    }
  }

  // aborted: only from in_progress/paused/blocked
  if (to === 'aborted') {
    if (!canAbortFromState(from)) {
      return { allowed: false, reason: 'aborted only from in_progress/paused/blocked' };
    }
  }

  // blocked: blocker_code required when entering blocked
  if (to === 'blocked' && context?.blockerCode == null) {
    return { allowed: false, reason: 'blocker_code required when entering blocked' };
  }

  return { allowed: true };
}

/** Get evidence gate stages for a transition */
export function getEvidenceGateStages(from: ActivityState, to: ActivityState): string[] {
  const key = `${from}->${to}`;
  return EVIDENCE_GATE_BY_TRANSITION[key] || [];
}
