/**
 * Infer FS dependencies from level2 + chronological order.
 * Same level2 group, sorted by planned_start: each activity depends on previous (FS, lag 0).
 * SSOT: option_c.json - inferred deps are derived, not stored in SSOT.
 */
import type { ScheduleActivity, ScheduleDependency } from "@/lib/ssot/schedule"

export function inferDependencies(
  activities: ScheduleActivity[]
): ScheduleActivity[] {
  const leafActivities = activities.filter((a) => a.activity_id !== null)
  const activityById = new Map<string, ScheduleActivity>()
  for (const a of leafActivities) {
    if (a.activity_id) activityById.set(a.activity_id, a)
  }

  const byLevel2 = new Map<string, ScheduleActivity[]>()
  for (const a of leafActivities) {
    if (!a.activity_id) continue
    const key = `${a.level1}|${a.level2 ?? "ROOT"}`
    if (!byLevel2.has(key)) byLevel2.set(key, [])
    byLevel2.get(key)!.push(a)
  }

  const result = activities.map((a) => ({ ...a }))

  for (const group of byLevel2.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
    )
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i]
      const prev = sorted[i - 1]
      if (!curr.activity_id || !prev.activity_id) continue
      const dep: ScheduleDependency = {
        predecessorId: prev.activity_id,
        type: "FS",
        lagDays: 0,
      }
      const existing = curr.depends_on ?? []
      const hasDep = existing.some((d) => d.predecessorId === prev.activity_id)
      if (!hasDep) {
        const idx = result.findIndex((r) => r.activity_id === curr.activity_id)
        if (idx >= 0) {
          result[idx] = {
            ...result[idx],
            depends_on: [...existing, dep],
          }
        }
      }
    }
  }

  return result
}
