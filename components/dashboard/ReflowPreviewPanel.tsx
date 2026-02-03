"use client"

import { FileSearch, X, Check } from "lucide-react"
import type { DateChange } from "@/lib/ssot/schedule"

type ReflowPreviewPanelProps = {
  changes: DateChange[]
  conflicts: { message: string; severity?: string }[]
  onApply: () => void
  onCancel: () => void
  canApply?: boolean
}

/**
 * Reflow Preview UI (Phase 7 T7.7)
 * Shows proposed changes from suggested action → reflow preview
 */
export function ReflowPreviewPanel({
  changes,
  conflicts,
  onApply,
  onCancel,
  canApply = true,
}: ReflowPreviewPanelProps) {
  const hasChanges = changes.length > 0
  const hasBlocking = conflicts.some((c) => c.severity === "error" || c.severity === "blocking")

  return (
    <div
      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3"
      data-testid="reflow-preview-panel"
      role="region"
      aria-label="Reflow preview"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <FileSearch className="h-4 w-4" />
          Preview
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-foreground"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {hasChanges ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-300">
            Proposed changes ({changes.length})
          </div>
          <ul className="space-y-1.5 max-h-32 overflow-y-auto">
            {changes.map((c) => (
              <li
                key={`${c.activity_id}-${c.old_start}-${c.new_start}`}
                className="rounded border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 text-xs"
              >
                <span className="font-medium text-foreground">{c.activity_id}</span>
                <span className="text-slate-400">: </span>
                <span className="text-slate-300">
                  {c.old_start} → {c.new_start}
                </span>
                {c.delta_days !== 0 && (
                  <span className="ml-1 text-emerald-400">
                    ({c.delta_days > 0 ? "+" : ""}{c.delta_days}d)
                  </span>
                )}
              </li>
            ))}
          </ul>
          {conflicts.length > 0 && (
            <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
              {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} detected
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onApply}
              disabled={!canApply || hasBlocking}
            >
              <Check className="h-3.5 w-3.5" />
              Apply
            </button>
            <button
              type="button"
              className="rounded border border-slate-600/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-500"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No date changes proposed.</p>
      )}
    </div>
  )
}
