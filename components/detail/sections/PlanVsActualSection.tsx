"use client"

import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { SlackResult } from "@/lib/utils/slack-calc"
import { diffUTCDays } from "@/lib/ssot/schedule"

type PlanVsActualSectionProps = {
  activity: ScheduleActivity
  slackResult?: SlackResult | null
}

/**
 * Plan vs Actual vs Calc (patch.md §5, Phase 7 T7.3)
 * Side-by-side table: Plan Start/End | Actual Start/End | Calc ES/EF/LS/LF
 * Slack display, predicted end (if delayed)
 */
export function PlanVsActualSection({ activity, slackResult }: PlanVsActualSectionProps) {
  const hasActual = activity.actual_start && activity.actual_finish
  const hasActualStart = !!activity.actual_start
  const startDelta =
    hasActual && activity.actual_start
      ? diffUTCDays(activity.planned_start, activity.actual_start)
      : null
  const finishDelta =
    hasActual && activity.actual_finish
      ? diffUTCDays(activity.planned_finish, activity.actual_finish)
      : null

  const formatDelta = (d: number) => {
    if (d === 0) return "—"
    const sign = d > 0 ? "+" : ""
    return `${sign}${d}d`
  }

  return (
    <div
      className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-3"
      data-testid="plan-vs-actual-section"
    >
      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
        Plan vs Actual vs Calc
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[260px] text-xs">
          <thead>
            <tr className="border-b border-slate-700/60 text-slate-400">
              <th className="py-1.5 pr-2 text-left font-medium">Plan</th>
              <th className="py-1.5 pr-2 text-left font-medium">Actual</th>
              <th className="py-1.5 text-left font-medium">Calc</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            <tr className="border-b border-slate-700/40">
              <td className="py-1.5 pr-2 align-top">
                <span className="font-mono">
                  {activity.planned_start} → {activity.planned_finish}
                </span>
              </td>
              <td className="py-1.5 pr-2 align-top">
                {hasActualStart ? (
                  <span className="font-mono">
                    {activity.actual_start ?? "—"} → {activity.actual_finish ?? "—"}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="py-1.5 align-top">
                {slackResult ? (
                  <span className="font-mono text-slate-300">
                    ES {slackResult.es.toISOString().split("T")[0]} EF{" "}
                    {slackResult.ef.toISOString().split("T")[0]}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
            </tr>
            {slackResult && (
              <tr className="border-b border-slate-700/40">
                <td className="py-1 pr-2 text-slate-500">—</td>
                <td className="py-1 pr-2 text-slate-500">—</td>
                <td className="py-1 font-mono text-slate-400">
                  LS {slackResult.ls.toISOString().split("T")[0]} LF{" "}
                  {slackResult.lf.toISOString().split("T")[0]}
                </td>
              </tr>
            )}
            {(startDelta !== null || finishDelta !== null || slackResult) && (
              <tr>
                <td className="py-1 pr-2 text-slate-500">Delta</td>
                <td className="py-1 pr-2">
                  {startDelta !== null || finishDelta !== null ? (
                    <span
                      className={
                        (startDelta ?? 0) > 0 || (finishDelta ?? 0) > 0
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }
                    >
                      Start {formatDelta(startDelta ?? 0)} / Finish {formatDelta(finishDelta ?? 0)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-1">
                  {slackResult ? (
                    <span
                      className={
                        slackResult.isCriticalPath
                          ? "font-semibold text-emerald-400"
                          : "text-emerald-300"
                      }
                    >
                      Slack {slackResult.slackDays}d
                      {slackResult.isCriticalPath && " (CP)"}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
