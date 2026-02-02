/**
 * Baseline comparison (patch.md §5, Phase 9 T9.4)
 * Compare current plan vs baseline.snapshot, highlight drifts.
 */
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { Baseline } from "./types"

export interface DriftItem {
  activityId: string
  field: "start" | "end"
  baselineValue: string
  currentValue: string
}

export interface BaselineCompareResult {
  driftCount: number
  drifts: DriftItem[]
}

function toDateStr(iso: string): string {
  return iso.split("T")[0]
}

/**
 * Compare current activities vs baseline snapshot.
 * Returns drift count and list of drifted fields.
 */
export function compareWithBaseline(
  activities: ScheduleActivity[],
  baseline: Baseline
): BaselineCompareResult {
  const drifts: DriftItem[] = []
  const snapshot = baseline.snapshot?.entities?.activities_plan
  if (!snapshot) return { driftCount: 0, drifts }

  for (const act of activities) {
    if (!act.activity_id) continue
    const snap = snapshot[act.activity_id]
    if (!snap) continue

    const baselineStart = toDateStr(snap.start_ts)
    const baselineEnd = toDateStr(snap.end_ts)
    const currentStart = act.planned_start
    const currentEnd = act.planned_finish

    if (baselineStart !== currentStart) {
      drifts.push({
        activityId: act.activity_id,
        field: "start",
        baselineValue: baselineStart,
        currentValue: currentStart,
      })
    }
    if (baselineEnd !== currentEnd) {
      drifts.push({
        activityId: act.activity_id,
        field: "end",
        baselineValue: baselineEnd,
        currentValue: currentEnd,
      })
    }
  }

  return { driftCount: drifts.length, drifts }
}
