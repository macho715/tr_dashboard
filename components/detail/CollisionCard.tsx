"use client"

import { ChevronRight } from "lucide-react"
import type { ScheduleConflict } from "@/lib/ssot/schedule"

type CollisionCardProps = {
  collision: ScheduleConflict
  onClick: () => void
}

const SEVERITY_STYLES: Record<ScheduleConflict["severity"], string> = {
  warn: "border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/15",
  error: "border-red-400/60 bg-red-500/10 hover:bg-red-500/15",
}

const TYPE_LABELS: Record<ScheduleConflict["type"], string> = {
  RESOURCE: "Resource",
  CONSTRAINT: "Constraint",
  LOCK_VIOLATION: "Lock",
  DEPENDENCY_CYCLE: "Dependency",
}

/**
 * Collision card (patch.md §4.2, Phase 7 T7.6)
 * 2-click: Card → Why panel
 */
export function CollisionCard({ collision, onClick }: CollisionCardProps) {
  const severityStyle = SEVERITY_STYLES[collision.severity]
  const typeLabel = TYPE_LABELS[collision.type]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${severityStyle}`}
      data-testid="collision-card"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{collision.activity_id}</span>
          <span className="rounded border border-slate-600/60 bg-slate-800/60 px-1.5 py-0.5 text-xs text-slate-400">
            {typeLabel}
          </span>
          {collision.root_cause_code && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-300">
              {collision.root_cause_code}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-slate-300">{collision.message}</p>
        {collision.resource && (
          <span className="mt-1 block text-xs text-slate-500">
            Resource: {collision.resource}
          </span>
        )}
        {collision.overlapStart && collision.overlapEnd && (
          <span className="mt-0.5 block text-xs text-slate-500">
            Overlap: {collision.overlapStart} ~ {collision.overlapEnd}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </button>
  )
}
