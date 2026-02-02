"use client"

import { GitCompare } from "lucide-react"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"
import type { CompareResult } from "@/lib/compare/types"

type CompareModeBannerProps = {
  /** Delta from compare-loader (null when no compare source loaded) */
  compareResult?: CompareResult | null
}

/**
 * Compare mode UI (Phase 10 T10.2)
 * Shows diff summary: X activities shifted, Y collisions new
 */
export function CompareModeBanner({ compareResult }: CompareModeBannerProps) {
  const viewMode = useViewModeOptional()
  if (viewMode?.state.mode !== "compare") return null

  const s = compareResult?.summary
  const hasDelta = s && (s.addedCount + s.removedCount + s.changedCount > 0)

  return (
    <div
      className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4"
      data-testid="compare-mode-banner"
      role="region"
      aria-label="Compare mode"
    >
      <div className="flex items-start gap-3">
        <GitCompare className="h-5 w-5 shrink-0 text-cyan-400" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-cyan-200">Compare Mode</h3>
          <p className="mt-0.5 text-xs text-cyan-200/80">
            Baseline (option_c) vs scenario overlay. Read-only.
          </p>
          {compareResult && hasDelta && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              {s.addedCount > 0 && (
                <span className="text-emerald-400">+{s.addedCount} added</span>
              )}
              {s.removedCount > 0 && (
                <span className="text-red-400">−{s.removedCount} removed</span>
              )}
              {s.changedCount > 0 && (
                <span className="text-amber-400">
                  {s.totalShifted} shifted
                </span>
              )}
              {s.collisionsNew > 0 && (
                <span className="text-rose-400">
                  {s.collisionsNew} collisions new
                </span>
              )}
            </div>
          )}
          {compareResult && !hasDelta && (
            <p className="mt-2 text-xs text-slate-500">
              No differences between baseline and compare source.
            </p>
          )}
          {!compareResult && (
            <p className="mt-2 text-xs text-slate-500">
              Load scenario to compare.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
