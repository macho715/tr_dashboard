"use client"

import { AlertTriangle, X } from "lucide-react"
import type { ScheduleConflict } from "@/lib/ssot/schedule"

type WhyPanelProps = {
  collision: ScheduleConflict | null
  onClose: () => void
}

/**
 * Why panel (patch.md §4.2)
 * 2-click: Detail "Why" 패널 → Root cause + Evidence
 */
export function WhyPanel({ collision, onClose }: WhyPanelProps) {
  if (!collision) return null

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
      {collision.related_activity_ids && collision.related_activity_ids.length > 0 && (
        <p className="mt-1 text-xs text-slate-400">
          Activities: {collision.related_activity_ids.join(", ")}
        </p>
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
