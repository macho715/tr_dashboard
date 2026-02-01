"use client"

import { OperationOverviewRibbon } from "@/components/dashboard/operation-overview"
import { MilestoneTracker } from "@/components/dashboard/milestone-tracker"
import { AgiScheduleUpdaterBar } from "@/components/dashboard/agi-schedule-updater-bar"
import { AgiOpsDock } from "@/components/ops/AgiOpsDock"
import type { ImpactReport, ScheduleActivity } from "@/lib/ssot/schedule"

type OverviewSectionProps = {
  conflictCount: number
  activities: ScheduleActivity[]
  onApplyActivities: (nextActivities: ScheduleActivity[], impactReport: ImpactReport | null) => void
  onSetActivities: (nextActivities: ScheduleActivity[]) => void
  onFocusActivity?: (activityId: string) => void
}

/**
 * 운영 요약 섹션을 렌더링한다. Renders the operations overview section.
 */
export function OverviewSection({
  conflictCount,
  activities,
  onApplyActivities,
  onSetActivities,
  onFocusActivity,
}: OverviewSectionProps) {
  return (
    <section id="overview" aria-label="Operation Overview" className="space-y-4">
      <OperationOverviewRibbon conflictCount={conflictCount} />
      <MilestoneTracker />
      <div className="mt-6 space-y-6">
        <AgiOpsDock
          activities={activities}
          setActivities={onSetActivities}
          onFocusQuery={onFocusActivity}
        />
        <AgiScheduleUpdaterBar
          activities={activities}
          onApplyActivities={onApplyActivities}
          onFocusActivity={onFocusActivity}
        />
      </div>
    </section>
  )
}
