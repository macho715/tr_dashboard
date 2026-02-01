"use client"

import type { Ref } from "react"
import { GanttChart, type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type { HighlightFlags, TimelineView } from "@/components/dashboard/timeline-controls"
import type { DateChange, ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"

type GanttSectionProps = {
  ganttRef: Ref<GanttChartHandle>
  activities: ScheduleActivity[]
  conflicts: ScheduleConflict[]
  resourceFilter: string
  onResourceFilterChange: (resource: string) => void
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  jumpTrigger: number
  onJumpRequest: () => void
  changeImpactItems: Array<DateChange & { appliedAt: string }>
  onUndoChangeImpact: () => void
}

export function GanttSection({
  ganttRef,
  activities,
  conflicts,
  resourceFilter,
  onResourceFilterChange,
  view,
  onViewChange,
  highlightFlags,
  onHighlightFlagsChange,
  jumpDate,
  onJumpDateChange,
  jumpTrigger,
  onJumpRequest,
  changeImpactItems,
  onUndoChangeImpact,
}: GanttSectionProps) {
  return (
    <section id="gantt" aria-label="Gantt Chart">
      <GanttChart
        ref={ganttRef}
        activities={activities}
        conflicts={conflicts}
        resourceFilter={resourceFilter}
        onResourceFilterChange={onResourceFilterChange}
        view={view}
        onViewChange={onViewChange}
        highlightFlags={highlightFlags}
        onHighlightFlagsChange={onHighlightFlagsChange}
        jumpDate={jumpDate}
        onJumpDateChange={onJumpDateChange}
        jumpTrigger={jumpTrigger}
        onJumpRequest={onJumpRequest}
        changeImpactItems={changeImpactItems}
        onUndoChangeImpact={onUndoChangeImpact}
      />
    </section>
  )
}
