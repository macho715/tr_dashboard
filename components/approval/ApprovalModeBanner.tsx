"use client"

import { useEffect, useState } from "react"
import { Shield, Lock, Hash, GitCompare } from "lucide-react"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"
import { loadBaselineFromSsot } from "@/lib/baseline/baseline-loader"
import { compareWithBaseline } from "@/lib/baseline/baseline-compare"
import type { Baseline } from "@/lib/baseline/types"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type ApprovalModeBannerProps = {
  /** Current activities for drift comparison (optional) */
  activities?: ScheduleActivity[]
}

/**
 * Approval mode UI (patch.md §5, Phase 9 T9.3)
 * Display baseline name, created_at, frozen_fields, snapshot hash
 * Apply disabled in Approval mode (enforced by ViewModeProvider)
 */
export function ApprovalModeBanner({ activities = [] }: ApprovalModeBannerProps) {
  const viewMode = useViewModeOptional()
  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const driftResult = baseline && activities.length > 0
    ? compareWithBaseline(activities, baseline)
    : null

  useEffect(() => {
    if (viewMode?.state.mode !== "approval") return

    setLoading(true)
    setError(null)
    fetch("/api/ssot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.baselines?.current_baseline_id) {
          setBaseline(null)
          setError("No baseline configured")
          return
        }
        const result = loadBaselineFromSsot(data, data.baselines.current_baseline_id)
        setBaseline(result.baseline ?? null)
        setError(result.error ?? null)
      })
      .catch(() => setError("Failed to load baseline"))
      .finally(() => setLoading(false))
  }, [viewMode?.state.mode])

  if (viewMode?.state.mode !== "approval") return null

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
      data-testid="approval-mode-banner"
      role="region"
      aria-label="Approval mode"
    >
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-amber-200">Approval Mode (Read-only)</h3>
          <p className="mt-0.5 text-xs text-amber-200/80">
            Apply is disabled. Plan changes require approval.
          </p>
          {loading && (
            <p className="mt-2 text-xs text-slate-400">Loading baseline…</p>
          )}
          {error && !loading && (
            <p className="mt-2 text-xs text-amber-300/90">{error}</p>
          )}
          {baseline && !loading && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-200/90">
                <span className="font-semibold">{baseline.name}</span>
                <span className="text-slate-500">
                  Created {new Date(baseline.created_at).toLocaleDateString()}
                  {baseline.created_by && ` by ${baseline.created_by}`}
                </span>
              </div>
              {baseline.freeze_policy.frozen_fields?.length > 0 && (
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                  <div>
                    <span className="text-xs font-semibold text-slate-400">
                      Frozen fields:
                    </span>
                    <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-xs text-slate-500">
                      {baseline.freeze_policy.frozen_fields.slice(0, 5).map((f) => (
                        <li key={f} className="font-mono">
                          {f}
                        </li>
                      ))}
                      {baseline.freeze_policy.frozen_fields.length > 5 && (
                        <li className="text-slate-600">
                          +{baseline.freeze_policy.frozen_fields.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
              {baseline.snapshot.hash && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono">
                    {baseline.snapshot.hash.algo}: {baseline.snapshot.hash.value.slice(0, 16)}…
                  </span>
                </div>
              )}
              {driftResult && driftResult.driftCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-300/90">
                  <GitCompare className="h-3 w-3" />
                  <span>
                    Drift: {driftResult.driftCount} plan change
                    {driftResult.driftCount !== 1 ? "s" : ""} since approval
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
