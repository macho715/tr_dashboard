/**
 * Compare source loader (Phase 10 T10.1)
 * Load baseline (option_c) as reference, compare source (scenario A/B/C)
 * Calculate delta: added/removed/changed activities
 */

import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { ActivityDelta, CompareResult } from "./types"

function toMap(activities: ScheduleActivity[]): Map<string, ScheduleActivity> {
  const map = new Map<string, ScheduleActivity>()
  for (const a of activities) {
    if (a.activity_id) map.set(a.activity_id, a)
  }
  return map
}

/**
 * Calculate delta between baseline and compare activities.
 * Baseline = SSOT (option_c). Compare = scenario A/B/C.
 */
export function calculateDelta(
  baseline: ScheduleActivity[],
  compare: ScheduleActivity[],
  baselineConflicts: number = 0,
  compareConflicts: number = 0
): CompareResult {
  const baselineMap = toMap(baseline)
  const compareMap = toMap(compare)

  const added: ActivityDelta[] = []
  const removed: ActivityDelta[] = []
  const changed: ActivityDelta[] = []

  for (const [id, comp] of compareMap) {
    const base = baselineMap.get(id)
    if (!base) {
      added.push({ activity_id: id, kind: "added", compare: comp })
    } else if (
      base.planned_start !== comp.planned_start ||
      base.planned_finish !== comp.planned_finish
    ) {
      changed.push({
        activity_id: id,
        kind: "changed",
        baseline: base,
        compare: comp,
        startDiff: base.planned_start !== comp.planned_start
          ? { from: base.planned_start, to: comp.planned_start }
          : undefined,
        endDiff: base.planned_finish !== comp.planned_finish
          ? { from: base.planned_finish, to: comp.planned_finish }
          : undefined,
      })
    }
  }

  for (const [id, base] of baselineMap) {
    if (!compareMap.has(id)) {
      removed.push({ activity_id: id, kind: "removed", baseline: base })
    }
  }

  const totalShifted = changed.length
  const collisionsNew = Math.max(0, compareConflicts - baselineConflicts)

  return {
    added,
    removed,
    changed,
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      changedCount: changed.length,
      totalShifted,
      collisionsNew,
    },
  }
}
