/**
 * GanttRow[] → vis-timeline { groups, items } mapper
 *
 * SSOT: option_c.json → scheduleActivitiesToGanttRows → ganttRowsToVisData
 * Date parsing: parseUTCDate (lib/ssot/schedule.ts) for consistency.
 * Task 8: compareDelta → baseline ghost bars (className: baseline-ghost)
 */

import type { GanttRow } from "@/lib/dashboard-data"
import { parseUTCDate } from "@/lib/ssot/schedule"
import type { CompareResult } from "@/lib/compare/types"

export interface VisGroup {
  id: string
  content: string
  order?: number
}

export interface VisItem {
  id: string
  group: string
  content: string
  start: Date
  end: Date
  type: "range"
  className?: string
  title?: string
}

export interface VisTimelineData {
  groups: VisGroup[]
  items: VisItem[]
}

/**
 * Extract activity_id from label (format: "A1000: Activity name")
 */
function extractActivityId(label: string): string {
  const colonIdx = label.indexOf(":")
  return colonIdx >= 0 ? label.slice(0, colonIdx).trim() : label
}

/**
 * Map GanttRow[] to vis-timeline groups and items.
 * Uses parseUTCDate for date consistency (Bug #1 prevention).
 * Task 8: When compareDelta has changed items with compare, adds ghost bars (baseline-ghost).
 */
export function ganttRowsToVisData(
  rows: GanttRow[],
  compareDelta?: CompareResult | null
): VisTimelineData {
  const groups: VisGroup[] = []
  const items: VisItem[] = []
  const activityIdToGroupId = new Map<string, string>()

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx]
    const groupId = `group_${rowIdx}`
    groups.push({
      id: groupId,
      content: row.name,
      order: rowIdx,
    })

    if (row.isHeader) continue

    const rowActivities = row.activities ?? []
    for (const activity of rowActivities) {
      const activityId = extractActivityId(activity.label)
      activityIdToGroupId.set(activityId, groupId)
      const start = parseUTCDate(activity.start)
      const end = parseUTCDate(activity.end)
      const typeClass = `gantt-type-${activity.type}`

      items.push({
        id: activityId,
        group: groupId,
        content: activity.label,
        start,
        end,
        type: "range",
        className: typeClass,
        title: activity.label,
      })
    }
  }

  if (compareDelta?.changed?.length) {
    for (const d of compareDelta.changed) {
      if (!d.compare) continue
      const groupId = activityIdToGroupId.get(d.activity_id)
      if (!groupId) continue
      const start = parseUTCDate(d.compare.planned_start)
      const end = parseUTCDate(d.compare.planned_finish)
      items.push({
        id: `ghost_${d.activity_id}`,
        group: groupId,
        content: `(Compare) ${d.activity_id}`,
        start,
        end,
        type: "range",
        className: "baseline-ghost",
        title: `Compare: baseline position for ${d.activity_id}`,
      })
    }
  }

  return { groups, items }
}
