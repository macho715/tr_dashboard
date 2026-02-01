/**
 * Resource Conflict Detection Utility
 *
 * Detects resource conflicts (overlapping resource usage) in schedule activities.
 * Returns conflicts with enhanced fields for UI grouping and deduplication.
 */

import type { ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"
import { normalizeActivityId, parseUTCDate } from "@/lib/ssot/schedule"

export function detectResourceConflicts(
  activities: ScheduleActivity[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const resourceMap = new Map<string, Array<{ id: string; start: string; finish: string }>>()
  const seen = new Set<string>()

  for (const activity of activities) {
    if (!activity.resource_tags || activity.resource_tags.length === 0) continue
    const id = normalizeActivityId(activity)

    for (const resource of activity.resource_tags) {
      if (!resourceMap.has(resource)) {
        resourceMap.set(resource, [])
      }
      resourceMap.get(resource)!.push({
        id,
        start: activity.planned_start,
        finish: activity.planned_finish,
      })
    }
  }

  for (const [resource, acts] of resourceMap.entries()) {
    acts.sort(
      (a, b) => parseUTCDate(a.start).getTime() - parseUTCDate(b.start).getTime()
    )

    for (let i = 0; i < acts.length; i++) {
      const a1 = acts[i]
      const s1 = parseUTCDate(a1.start).getTime()
      const f1 = parseUTCDate(a1.finish).getTime()

      for (let j = i + 1; j < acts.length; j++) {
        const a2 = acts[j]
        const s2 = parseUTCDate(a2.start).getTime()
        const f2 = parseUTCDate(a2.finish).getTime()

        if (s2 >= f1) break

        const overlapStart = Math.max(s1, s2)
        const overlapEnd = Math.min(f1, f2)
        if (overlapStart >= overlapEnd) continue

        const aLow = a1.id < a2.id ? a1.id : a2.id
        const aHigh = a1.id < a2.id ? a2.id : a1.id
        const overlapStartISO = new Date(overlapStart).toISOString()
        const overlapEndISO = new Date(overlapEnd).toISOString()
        const conflictKey = `${resource}|${aLow}|${aHigh}|${overlapStartISO}|${overlapEndISO}`

        if (seen.has(conflictKey)) continue
        seen.add(conflictKey)

        const overlapMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60))

        conflicts.push({
          type: "RESOURCE",
          activity_id: aLow,
          message: `Resource conflict: ${resource} is required by both ${aLow} and ${aHigh}`,
          severity: "warn",
          related_activity_ids: [aLow, aHigh],
          resource,
          overlapStart: overlapStartISO,
          overlapEnd: overlapEndISO,
          overlapMinutes,
          conflictKey,
        })
      }
    }
  }

  conflicts.sort((a, b) => {
    if ((a.resource || "") !== (b.resource || "")) {
      return (a.resource || "").localeCompare(b.resource || "")
    }
    if ((a.overlapStart || "") !== (b.overlapStart || "")) {
      return (a.overlapStart || "").localeCompare(b.overlapStart || "")
    }
    return (b.overlapMinutes || 0) - (a.overlapMinutes || 0)
  })

  return conflicts
}
