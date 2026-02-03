"use client"

import type { DateChange } from "@/lib/ssot/schedule"
import { RotateCcw } from "lucide-react"

const severityStyles: Record<string, string> = {
  warn: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  info: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-200",
}

type ChangeImpactItem = DateChange & { appliedAt: string }

type Props = {
  changes: ChangeImpactItem[]
  onUndo?: () => void
}

function getSeverity(deltaDays: number) {
  if (deltaDays >= 1) return "warn"
  if (deltaDays <= -1) return "critical"
  return "info"
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ChangeImpactStack({ changes, onUndo }: Props) {
  const hasChanges = changes.length > 0
  return (
    <div className="mt-6 rounded-2xl border border-accent/15 bg-card/80 p-5 backdrop-blur-lg">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Change Impact</div>
          <p className="text-xs text-slate-500">
            Recent schedule changes from previews
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border border-slate-700/60 px-2 py-1 text-xs text-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onUndo}
          disabled={!hasChanges}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Undo
        </button>
      </div>
      <div className="space-y-3">
        {hasChanges ? (
          changes.map((change) => {
            const deltaLabel = change.delta_days.toFixed(2)
            const severity = getSeverity(change.delta_days)
            const stableKey = `${change.activity_id}-${change.old_start}-${change.new_start}-${change.appliedAt}`
            return (
              <div
                key={stableKey}
                className={
                  "rounded-xl border p-3 shadow-sm " + severityStyles[severity]
                }
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    {change.activity_id} date shift
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatTimestamp(change.appliedAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  Start {change.old_start} → {change.new_start} ({deltaLabel}d)
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Finish {change.old_finish} → {change.new_finish}
                </p>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700/60 p-4 text-xs text-slate-500">
            No applied preview changes yet.
          </div>
        )}
      </div>
    </div>
  )
}
