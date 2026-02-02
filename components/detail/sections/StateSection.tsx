"use client"

import { Lock, AlertCircle } from "lucide-react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type StateSectionProps = {
  activity: ScheduleActivity
}

const STATUS_STYLES: Record<string, string> = {
  planned: "border-sky-400/60 bg-sky-500/15 text-sky-200",
  in_progress: "border-cyan-400/60 bg-cyan-500/15 text-cyan-200",
  blocked: "border-red-400/60 bg-red-500/15 text-red-200",
  done: "border-emerald-400/60 bg-emerald-500/15 text-emerald-200",
}

/**
 * State section (patch.md §5, Phase 7 T7.2)
 * Current state badge, lock level, blocker display
 */
export function StateSection({ activity }: StateSectionProps) {
  const status = activity.status ?? "planned"
  const statusStyle = STATUS_STYLES[status] ?? "border-slate-500/60 bg-slate-500/15 text-slate-200"
  const blockerCode = activity.blocker_code

  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-3" data-testid="state-section">
      <div className="text-[11px] font-semibold uppercase text-slate-500">State</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyle}`}
        >
          {status.replace("_", " ")}
        </span>
        {activity.is_locked && (
          <span className="flex items-center gap-1 rounded-full border border-fuchsia-400/60 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] text-fuchsia-200">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      {status === "blocked" && (
        <div className="mt-2 flex items-start gap-2 rounded border border-red-500/30 bg-red-900/20 px-2 py-1.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3 shrink-0 text-red-400" />
          <div className="text-[11px] text-red-200">
            {blockerCode ? (
              <span>
                <strong>Blocker:</strong> {blockerCode}
              </span>
            ) : (
              <span>Activity is blocked. Resolve dependencies or constraints.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
