"use client"

import type { Ref } from "react"
import { GanttChart, type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type { HighlightFlags, TimelineView } from "@/components/dashboard/timeline-controls"
import type { ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"
import type { CompareResult } from "@/lib/compare/types"

type GanttSectionProps = {
  ganttRef: Ref<GanttChartHandle>
  activities: ScheduleActivity[]
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  jumpTrigger: number
  onJumpRequest: () => void
  onActivityClick?: (activityId: string, start: string) => void
  onActivityDeselect?: () => void
  conflicts?: ScheduleConflict[]
  onCollisionClick?: (conflict: ScheduleConflict) => void
  focusedActivityId?: string | null
  compareDelta?: CompareResult | null
  projectEndDate: string
}

export function GanttSection({
  ganttRef,
  activities,
  view,
  onViewChange,
  highlightFlags,
  onHighlightFlagsChange,
  jumpDate,
  onJumpDateChange,
  jumpTrigger,
  onJumpRequest,
  onActivityClick,
  onActivityDeselect,
  conflicts,
  onCollisionClick,
  focusedActivityId,
  compareDelta,
  projectEndDate,
}: GanttSectionProps) {
  return (
    <section id="gantt" aria-label="Gantt Chart" className="flex flex-1 flex-col min-h-0">
      <GanttChart
        ref={ganttRef}
        activities={activities}
        view={view}
        onViewChange={onViewChange}
        highlightFlags={highlightFlags}
        onHighlightFlagsChange={onHighlightFlagsChange}
        jumpDate={jumpDate}
        onJumpDateChange={onJumpDateChange}
        jumpTrigger={jumpTrigger}
        onJumpRequest={onJumpRequest}
        onActivityClick={onActivityClick}
        onActivityDeselect={onActivityDeselect}
        conflicts={conflicts}
        onCollisionClick={onCollisionClick}
        focusedActivityId={focusedActivityId}
        compareDelta={compareDelta}
        projectEndDate={projectEndDate}
      />
    </section>
  )
}
