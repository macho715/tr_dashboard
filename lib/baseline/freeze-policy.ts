/**
 * Frozen field enforcement (patch.md §5, Phase 9 T9.2)
 * SSOT: option_c.json baselines.items[].freeze_policy
 */
import type { FreezePolicy } from "./types"

/**
 * Match field path against frozen_fields pattern.
 * Pattern supports * for single segment wildcard.
 * e.g. "entities.activities.*.plan.start_ts" matches "entities.activities.A1000.plan.start_ts"
 */
function matchFieldPattern(field: string, pattern: string): boolean {
  const fieldParts = field.split(".")
  const patternParts = pattern.split(".")

  if (fieldParts.length !== patternParts.length) return false

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "*") continue
    if (patternParts[i] !== fieldParts[i]) return false
  }
  return true
}

/**
 * Check if a field is frozen by the freeze policy.
 */
export function isFrozen(field: string, freeze_policy: FreezePolicy): boolean {
  if (!freeze_policy.frozen_fields?.length) return false
  return freeze_policy.frozen_fields.some((pattern) => matchFieldPattern(field, pattern))
}

/**
 * Validate that a field can be edited (not frozen).
 * Throws if the field is frozen (T9.5: frozen fields cannot be edited).
 */
export function assertEditAllowed(field: string, freeze_policy: FreezePolicy): void {
  if (isFrozen(field, freeze_policy)) {
    throw new Error(`Cannot edit frozen field: ${field}`)
  }
}
