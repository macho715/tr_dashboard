/**
 * Baseline snapshot loader (patch.md §5, Phase 9 T9.1)
 * Loads baseline from SSOT API response.
 */
import type { Baseline, BaselinesData } from "./types"

export interface LoadBaselineResult {
  baseline: Baseline | null
  error?: string
}

/**
 * Load baseline by id from SSOT data.
 * SSOT data should have baselines.items[baseline_id].
 */
export function loadBaselineFromSsot(
  ssotData: { baselines?: BaselinesData },
  baselineId: string
): LoadBaselineResult {
  const baselines = ssotData.baselines
  if (!baselines?.items) {
    return { baseline: null, error: "No baselines in SSOT" }
  }

  const baseline = baselines.items[baselineId]
  if (!baseline) {
    return { baseline: null, error: `Baseline ${baselineId} not found` }
  }

  return {
    baseline: {
      ...baseline,
      snapshot: baseline.snapshot ?? { captured_at: baseline.created_at },
      freeze_policy: baseline.freeze_policy ?? { frozen_fields: [] },
    },
  }
}
