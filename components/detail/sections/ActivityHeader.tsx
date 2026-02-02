"use client"

import { X } from "lucide-react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type ActivityHeaderProps = {
  activity: ScheduleActivity
  onClose: () => void
}

/**
 * Activity header (patch.md §5, Phase 7 T7.1)
 */
export function ActivityHeader({ activity, onClose }: ActivityHeaderProps) {
  return (
    <div className="flex items-start justify-between" data-testid="activity-header">
      <div>
        <h3 className="font-bold text-foreground">{activity.activity_id}</h3>
        <p className="mt-0.5 text-sm text-slate-400">{activity.activity_name}</p>
        {activity.level1 && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            {activity.level1}
            {activity.level2 && ` / ${activity.level2}`}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-slate-400 hover:text-foreground"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
