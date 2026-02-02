"use client"

import { AlertTriangle, X } from "lucide-react"
import type { ScheduleConflict, SuggestedAction } from "@/lib/ssot/schedule"

type WhyPanelProps = {
  collision: ScheduleConflict | null
  onClose: () => void
  onViewInTimeline?: (collision: ScheduleConflict, activityId?: string) => void
  onJumpToEvidence?: (collision: ScheduleConflict) => void
  onRelatedActivityClick?: (activityId: string) => void
  onApplyAction?: (collision: ScheduleConflict, action: SuggestedAction) => void
}

/**
 * Why panel (patch.md §4.2, Phase 7 T7.7)
 * 2-click: Detail "Why" 패널 → Root cause + Evidence + suggested_actions
 */
export function WhyPanel({
  collision,
  onClose,
  onViewInTimeline,
  onJumpToEvidence,
  onRelatedActivityClick,
  onApplyAction,
}: WhyPanelProps) {
  if (!collision) return null

  const severityStyles: Record<ScheduleConflict["severity"], string> = {
    warn: "border-amber-400/60 bg-amber-500/15 text-amber-200",
    error: "border-red-400/60 bg-red-500/15 text-red-200",
  }

  const severityLabels: Record<ScheduleConflict["severity"], string> = {
    warn: "Warning",
    error: "Critical",
  }

  const typeLabels: Record<ScheduleConflict["type"], string> = {
    RESOURCE: "Resource",
    CONSTRAINT: "Constraint",
    LOCK_VIOLATION: "Lock",
    DEPENDENCY_CYCLE: "Dependency",
  }

  const suggestedActions = collision.suggested_actions ?? []

  return (
    <div
      className="rounded-xl border border-red-500/30 bg-red-900/20 p-3"
      data-testid="why-panel"
      role="region"
      aria-label="Why delayed"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
          <AlertTriangle className="h-4 w-4" />
          Why delayed?
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm font-medium text-foreground">{collision.message}</p>
      {collision.root_cause_code && (
        <p className="mt-1 text-[11px] text-slate-400">
          Root cause: <code className="rounded bg-slate-800/60 px-1">{collision.root_cause_code}</code>
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase">
        <span
          className={`rounded-full border px-2 py-0.5 tracking-wide ${severityStyles[collision.severity]}`}
        >
          {severityLabels[collision.severity]}
        </span>
        <span className="rounded-full border border-slate-600/60 bg-slate-800/60 px-2 py-0.5 text-slate-200">
          {typeLabels[collision.type]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-slate-800/70 px-3 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-700/80"
          onClick={() => onViewInTimeline?.(collision, collision.activity_id)}
        >
          View in Timeline
        </button>
        <button
          type="button"
          className="rounded border border-slate-600/60 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-slate-400/80 hover:text-foreground"
          onClick={() => onJumpToEvidence?.(collision)}
        >
          Jump to Evidence
        </button>
      </div>
      {suggestedActions.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-slate-300">Suggested actions</div>
          <ul className="mt-1.5 space-y-1">
            {suggestedActions.map((action, idx) => (
              <li key={`${action.kind}-${idx}`}>
                <button
                  type="button"
                  className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/25"
                  onClick={() => onApplyAction?.(collision, action)}
                >
                  {action.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {collision.related_activity_ids && collision.related_activity_ids.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-slate-300">
            Related activities
          </div>
          <ul className="mt-1 space-y-1">
            {collision.related_activity_ids.map((activityId) => (
              <li key={activityId}>
                <button
                  type="button"
                  className="text-[11px] font-medium text-cyan-200 hover:text-cyan-100"
                  onClick={() => onRelatedActivityClick?.(activityId)}
                >
                  {activityId}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {collision.resource && (
        <p className="mt-0.5 text-xs text-slate-400">Resource: {collision.resource}</p>
      )}
      {collision.overlapStart && collision.overlapEnd && (
        <p className="mt-0.5 text-xs text-slate-400">
          Overlap: {collision.overlapStart} ~ {collision.overlapEnd}
        </p>
      )}
    </div>
  )
}
