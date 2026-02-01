/**
 * Schedule Data Loader
 *
 * option_c.json -> ScheduleActivity[]
 */

import type { Activity, ActivityType, GanttRow } from "@/lib/dashboard-data"
import type { AnchorType, ScheduleActivity } from "@/lib/ssot/schedule"
import { mapOptionCJsonToScheduleActivities } from "@/lib/ssot/utils/schedule-mapper"
import optionCDataRaw from "../../data/schedule/option_c.json"

export const scheduleActivities: ScheduleActivity[] = mapOptionCJsonToScheduleActivities(
  optionCDataRaw as { activities: Record<string, unknown>[] }
)

function mapAnchorTypeToActivityType(anchorType: AnchorType | undefined): ActivityType {
  switch (anchorType) {
    case "LOADOUT":
      return "loadout"
    case "SAIL_AWAY":
      return "transport"
    case "BERTHING":
      return "loadin"
    case "LOADIN":
      return "loadin"
    case "TURNING":
      return "turning"
    case "JACKDOWN":
      return "jackdown"
    default:
      return "mobilization"
  }
}

function scheduleActivityToActivity(activity: ScheduleActivity): Activity | null {
  if (activity.activity_id === null) return null

  const activityType = mapAnchorTypeToActivityType(activity.anchor_type)
  const activityName = activity.activity_name || activity.activity_id
  const label = `${activity.activity_id}: ${activityName}`

  return {
    start: activity.planned_start,
    end: activity.planned_finish,
    type: activityType,
    label,
  }
}

export function scheduleActivitiesToGanttRows(
  activities: ScheduleActivity[]
): GanttRow[] {
  const rows: GanttRow[] = []
  const level1Groups = new Map<string, ScheduleActivity[]>()

  for (const activity of activities) {
    const key = activity.level1
    if (!level1Groups.has(key)) {
      level1Groups.set(key, [])
    }
    level1Groups.get(key)!.push(activity)
  }

  for (const [level1, level1Activities] of level1Groups.entries()) {
    const level1Summary = level1Activities.find(
      (activity) => activity.activity_id === null && activity.level2 === null
    )
    if (level1Summary) {
      rows.push({
        name: level1Summary.activity_name || level1,
        isHeader: true,
      })
    }

    const level2Groups = new Map<string | null, ScheduleActivity[]>()
    for (const activity of level1Activities) {
      const key = activity.level2
      if (!level2Groups.has(key)) {
        level2Groups.set(key, [])
      }
      level2Groups.get(key)!.push(activity)
    }

    for (const [level2, level2Activities] of level2Groups.entries()) {
      if (level2 === null) continue

      const level2Summary = level2Activities.find((activity) => activity.activity_id === null)
      const rowName = level2Summary
        ? level2Summary.activity_name || level2
        : level2 || level1

      const rowActivities: Activity[] = []
      for (const activity of level2Activities) {
        if (activity.activity_id !== null) {
          const converted = scheduleActivityToActivity(activity)
          if (converted) {
            rowActivities.push(converted)
          }
        }
      }

      if (rowActivities.length > 0 || level2Summary) {
        rows.push({
          name: rowName,
          isHeader: false,
          activities: rowActivities.length > 0 ? rowActivities : undefined,
        })
      }
    }
  }

  return rows
}
