/**
 * Evidence Gate & Missing Required Evidence (patch.md §5.3, AGENTS.md §4.4)
 * Evidence requirements per state transition, automatic missing_required calculation
 */

import type { ScheduleActivity } from "@/lib/ssot/schedule"

export type EvidenceType =
  | "photo"
  | "video"
  | "document"
  | "signature"
  | "sensor_log"
  | "ptw"
  | "certificate"

export interface Evidence {
  evidence_id: string
  activity_id: string
  type: EvidenceType
  captured_at?: string
  geotag?: { lat: number; lon: number }
  url?: string
  metadata?: Record<string, unknown>
}

export interface EvidenceRequirement {
  required_types: EvidenceType[]
  min_count: number
  gate: "before_start" | "mandatory" // Evidence gate timing (patch.md §5.3)
}

/**
 * Evidence gate rules per state transition (AGENTS.md §4.4)
 */
export const EVIDENCE_GATES: Record<string, EvidenceRequirement> = {
  READY_TO_IN_PROGRESS: {
    required_types: ["photo", "signature"], // Start evidence
    min_count: 1,
    gate: "before_start",
  },
  COMPLETED_TO_VERIFIED: {
    required_types: ["photo", "video", "document"], // Completion evidence
    min_count: 1,
    gate: "mandatory",
  },
}

/**
 * Calculate missing required evidence (patch.md §5.3)
 * Returns array of missing evidence types and count
 */
export function calculateMissingEvidence(
  activity: ScheduleActivity,
  existingEvidence: Evidence[]
): { missing_types: EvidenceType[]; missing_count: number } {
  // Determine required evidence based on activity status
  let requirement: EvidenceRequirement | undefined

  if (activity.status === "ready" || activity.status === "in_progress") {
    requirement = EVIDENCE_GATES.READY_TO_IN_PROGRESS
  } else if (activity.status === "done") {
    requirement = EVIDENCE_GATES.COMPLETED_TO_VERIFIED
  }

  if (!requirement) {
    return { missing_types: [], missing_count: 0 }
  }

  const existingTypes = new Set(existingEvidence.map((e) => e.type))
  const missingTypes = requirement.required_types.filter(
    (t) => !existingTypes.has(t)
  )

  const missingCount = Math.max(
    0,
    requirement.min_count - existingEvidence.length
  )

  return { missing_types: missingTypes, missing_count: missingCount }
}

/**
 * Block state transition if evidence gate not met (AGENTS.md §4.4)
 */
export function validateEvidenceGate(
  fromState: string,
  toState: string,
  activity: ScheduleActivity,
  evidence: Evidence[]
): { allowed: boolean; reason?: string } {
  const gateKey = `${fromState.toUpperCase()}_TO_${toState.toUpperCase()}`
  const requirement = EVIDENCE_GATES[gateKey]

  if (!requirement) {
    return { allowed: true } // No evidence gate for this transition
  }

  const { missing_count } = calculateMissingEvidence(activity, evidence)

  if (missing_count > 0) {
    return {
      allowed: false,
      reason: `Evidence gate not met: ${missing_count} evidence(s) missing`,
    }
  }

  return { allowed: true }
}
