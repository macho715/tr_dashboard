/**
 * Baseline types (patch.md §5, Phase 9)
 * SSOT: option_c.json baselines.items
 */

export interface FreezePolicy {
  lock_level_on_apply?: string
  frozen_fields: string[]
  allow_actual_updates?: boolean
  allow_evidence_add?: boolean
  allow_notes_add?: boolean
  override_roles?: string[]
}

export interface SnapshotHash {
  algo: string
  value: string
}

export interface BaselineSnapshot {
  captured_at: string
  entities?: {
    activities_plan?: Record<string, { start_ts: string; end_ts: string }>
    trs_spec?: Record<string, unknown>
  }
  hash?: SnapshotHash
}

export interface Baseline {
  baseline_id: string
  name: string
  status?: string
  created_at: string
  created_by?: string
  scope?: { trip_ids?: string[] }
  freeze_policy: FreezePolicy
  snapshot: BaselineSnapshot
}

export interface BaselinesData {
  current_baseline_id: string | null
  items: Record<string, Baseline>
}
