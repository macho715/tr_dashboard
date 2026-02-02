"use client"

import { Calendar } from "lucide-react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type ConstraintsSectionProps = {
  activity: ScheduleActivity
}

const CONSTRAINT_LABELS: Record<string, string> = {
  START_NO_EARLIER_THAN: "Start no earlier than",
  FINISH_NO_LATER_THAN: "Finish no later than",
  MUST_START_ON: "Must start on",
  MUST_FINISH_ON: "Must finish on",
}

/**
 * Constraints section (patch.md §5, Phase 7 T7.5)
 * List constraints with type and date
 */
export function ConstraintsSection({ activity }: ConstraintsSectionProps) {
  const constraint = activity.constraint
  if (!constraint) return null

  const label = CONSTRAINT_LABELS[constraint.type] ?? constraint.type

  return (
    <div
      className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3"
      data-testid="constraints-section"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-sky-400">
        <Calendar className="h-3.5 w-3.5" />
        Constraints
      </div>
      <div className="rounded border border-sky-500/30 bg-sky-900/20 px-2 py-1.5 text-[11px] text-sky-200">
        <span className="font-medium">{label}:</span> {constraint.date}
        {constraint.reason && (
          <span className="mt-1 block text-sky-300/80">({constraint.reason})</span>
        )}
      </div>
    </div>
  )
}
