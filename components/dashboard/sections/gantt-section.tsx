"use client"

import type { Ref } from "react"
import { GanttChart, type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type { HighlightFlags, TimelineView } from "@/components/dashboard/timeline-controls"
import type { ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"

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
  conflicts?: ScheduleConflict[]
  onCollisionClick?: (conflict: ScheduleConflict) => void
  focusedActivityId?: string | null
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
  conflicts,
  onCollisionClick,
  focusedActivityId,
}: GanttSectionProps) {
  return (
    <section id="gantt" aria-label="Gantt Chart">
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
        conflicts={conflicts}
        onCollisionClick={onCollisionClick}
        focusedActivityId={focusedActivityId}
      />
    </section>
  )
}
