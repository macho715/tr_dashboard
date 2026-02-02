"use client"

import type { ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"
import type { SlackResult } from "@/lib/utils/slack-calc"
import { ActivityHeader } from "./sections/ActivityHeader"
import { StateSection } from "./sections/StateSection"
import { PlanVsActualSection } from "./sections/PlanVsActualSection"
import { ResourcesSection } from "./sections/ResourcesSection"
import { ConstraintsSection } from "./sections/ConstraintsSection"
import { CollisionTray } from "./CollisionTray"

type DetailPanelProps = {
  activity: ScheduleActivity | null
  slackResult?: SlackResult | null
  conflicts: ScheduleConflict[]
  onClose: () => void
  onCollisionClick: (collision: ScheduleConflict) => void
}

/**
 * Detail panel (patch.md §5, Phase 7)
 * Activity inspector: ActivityHeader, State, Plan vs Actual vs Calc, Resources, Constraints, Collision tray
 * Structured layout: State | Plan vs Actual | Resources | Constraints | Collision tray
 */
export function DetailPanel({
  activity,
  slackResult,
  conflicts,
  onClose,
  onCollisionClick,
}: DetailPanelProps) {
  if (!activity || !activity.activity_id) {
    return (
      <div
        className="rounded-xl border border-dashed border-slate-600/60 bg-slate-900/20 p-6 text-center text-sm text-slate-500"
        data-testid="detail-panel-empty"
      >
        Select an activity from the Gantt or Map to view details
      </div>
    )
  }

  const activityConflicts = conflicts.filter(
    (c) =>
      c.activity_id === activity.activity_id ||
      c.related_activity_ids?.includes(activity.activity_id!)
  )

  return (
    <div
      className="rounded-xl border border-accent/20 bg-card/90 p-4 backdrop-blur-sm"
      data-testid="detail-panel"
      role="region"
      aria-label="Activity detail"
    >
      <div className="space-y-4">
        <ActivityHeader activity={activity} onClose={onClose} />
        <div className="space-y-3 divide-y divide-slate-700/50">
          <div className="pt-0">
            <StateSection activity={activity} />
          </div>
          <div className="pt-3">
            <PlanVsActualSection activity={activity} slackResult={slackResult} />
          </div>
          <div className="pt-3">
            <ResourcesSection activity={activity} />
          </div>
          <div className="pt-3">
            <ConstraintsSection activity={activity} />
          </div>
          <div className="pt-3">
            <CollisionTray collisions={activityConflicts} onCollisionClick={onCollisionClick} />
          </div>
        </div>
      </div>
    </div>
  )
}
