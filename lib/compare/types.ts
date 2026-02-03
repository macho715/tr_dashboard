/**
 * Compare Mode types (Phase 10)
 * Delta overlay for scenario comparison
 */

import type { ScheduleActivity } from "@/lib/ssot/schedule"

export type DeltaKind = "added" | "removed" | "changed"

export interface ActivityDelta {
  activity_id: string
  kind: DeltaKind
  baseline?: ScheduleActivity
  compare?: ScheduleActivity
  /** For changed: start/end date diff */
  startDiff?: { from: string; to: string }
  endDiff?: { from: string; to: string }
}

export interface CompareResult {
  added: ActivityDelta[]
  removed: ActivityDelta[]
  changed: ActivityDelta[]
  summary: {
    addedCount: number
    removedCount: number
    changedCount: number
    totalShifted: number
    collisionsNew: number
  }
}
