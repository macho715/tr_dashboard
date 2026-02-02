/**
 * Evidence Gate Validator (Contract v0.8.0)
 *
 * Checks evidence_required with matching stage against evidence_ids
 * Blocks state transition if min_count not met for required evidence
 */

import type { Activity, ActivityState, EvidenceRequired, OptionC } from '../../types/ssot';
import { getEvidenceGateStages } from './states';

export interface EvidenceGateResult {
  allowed: boolean;
  missing: EvidenceRequired[];
  blocker_code?: string;
}

/**
 * Check evidence gate for a state transition
 *
 * @param activity - Activity with evidence_required and evidence_ids
 * @param targetState - Target state for transition
 * @param fromState - Current state (default: activity.state)
 * @param ssot - Optional SSOT for evidence_items lookup
 * @returns allowed, missing evidence, blocker_code if blocked
 */
export function checkEvidenceGate(
  activity: Activity,
  targetState: ActivityState,
  fromState?: ActivityState,
  ssot?: OptionC
): EvidenceGateResult {
  const from = fromState ?? activity.state;
  const stages = getEvidenceGateStages(from, targetState);

  if (stages.length === 0) {
    return { allowed: true, missing: [] };
  }

  const missing: EvidenceRequired[] = [];

  for (const stage of stages) {
    const requiredForStage = activity.evidence_required.filter(
      (er) => er.stage === stage && er.required
    );

    for (const req of requiredForStage) {
      const matchingCount = countMatchingEvidence(
        activity.evidence_ids,
        req.evidence_type,
        ssot
      );
      if (matchingCount < req.min_count) {
        missing.push(req);
      }
    }
  }

  if (missing.length > 0) {
    const blockerCode = inferBlockerCode(missing[0]);
    return {
      allowed: false,
      missing,
      blocker_code: blockerCode
    };
  }

  return { allowed: true, missing: [] };
}

/**
 * Count evidence_ids that match the evidence_type
 * Uses ssot.entities.evidence_items when available
 */
function countMatchingEvidence(
  evidenceIds: string[],
  evidenceType: string,
  ssot?: OptionC
): number {
  if (evidenceIds.length === 0) return 0;

  if (ssot?.entities?.evidence_items) {
    let count = 0;
    for (const id of evidenceIds) {
      const item = ssot.entities.evidence_items[id];
      if (item && item.evidence_type === evidenceType) {
        count++;
      }
    }
    return count;
  }

  // Fallback: assume all evidence_ids count if we can't lookup
  // (Conservative: require explicit match when ssot available)
  return 0;
}

/**
 * Infer blocker code from missing evidence type
 */
function inferBlockerCode(missing: EvidenceRequired): string {
  const type = missing.evidence_type.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return `EVIDENCE_MISSING_${type}`;
}
