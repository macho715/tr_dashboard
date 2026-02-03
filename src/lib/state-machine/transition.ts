/**
 * State Transition Executor (Contract v0.8.0)
 *
 * 1. Check adjacency (allowed transition)
 * 2. Check evidence gate
 * 3. Check guard conditions
 * 4. Update state + append history_event
 * 5. Set blocker_code if gate failed
 */

import type {
  Activity,
  ActivityState,
  HistoryEvent,
  OptionC
} from '../../types/ssot';
import { isTransitionAllowed } from './states';
import { checkEvidenceGate } from './evidence-gate';

export interface TransitionResult {
  success: boolean;
  blocker_code?: string;
  history_event: HistoryEvent;
}

/**
 * Execute state transition
 *
 * @param activity - Activity to transition (MUTATED on success)
 * @param targetState - Target state
 * @param actor - Actor performing transition
 * @param options - ssot for evidence lookup, abortReason for aborted
 * @returns success, blocker_code if blocked, history_event
 */
export function transitionState(
  activity: Activity,
  targetState: ActivityState,
  actor: string,
  options?: {
    ssot?: OptionC;
    abortReason?: string;
    blockerCode?: string;
  }
): TransitionResult {
  const fromState = activity.state;
  const ts = new Date().toISOString();
  const eventId = `HE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const historyEvent: HistoryEvent = {
    event_id: eventId,
    ts,
    actor,
    event_type: 'state_transition',
    entity_ref: {
      entity_type: 'activity',
      entity_id: activity.activity_id
    },
    details: {
      from_state: fromState,
      to_state: targetState,
      success: false
    }
  };

  // 1. Check adjacency
  const adjResult = isTransitionAllowed(fromState, targetState, {
    hasActualStart: activity.actual.start_ts != null,
    hasActualEnd: activity.actual.end_ts != null,
    blockerCode: options?.blockerCode ?? (targetState === 'blocked' ? activity.blocker_code : null)
  });

  if (!adjResult.allowed) {
    historyEvent.details.reason = adjResult.reason;
    return {
      success: false,
      blocker_code: 'TRANSITION_NOT_ALLOWED',
      history_event: historyEvent
    };
  }

  // 2. Check evidence gate (skip for blocked, canceled, aborted)
  if (!['blocked', 'canceled', 'aborted'].includes(targetState)) {
    const gateResult = checkEvidenceGate(
      activity,
      targetState,
      fromState,
      options?.ssot
    );

    if (!gateResult.allowed) {
      historyEvent.details.reason = 'evidence_gate_failed';
      historyEvent.details.missing_evidence = gateResult.missing.map((m) => m.evidence_type);
      return {
        success: false,
        blocker_code: gateResult.blocker_code ?? 'EVIDENCE_MISSING',
        history_event: historyEvent
      };
    }
  }

  // 3. Guard: aborted requires reason
  if (targetState === 'aborted' && !options?.abortReason) {
    historyEvent.details.reason = 'abort requires reason';
    return {
      success: false,
      blocker_code: 'ABORT_REASON_REQUIRED',
      history_event: historyEvent
    };
  }

  // 4. Update state
  activity.state = targetState;

  if (targetState === 'blocked' && options?.blockerCode) {
    activity.blocker_code = options.blockerCode;
  } else if (targetState !== 'blocked') {
    activity.blocker_code = null;
  }

  // 5. Success history event
  historyEvent.details.success = true;

  return {
    success: true,
    history_event: historyEvent
  };
}
