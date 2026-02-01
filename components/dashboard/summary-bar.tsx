"use client"

import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  CalendarClock,
} from "lucide-react"
import { kpiData } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"
import type { OpsState } from "@/lib/ops/agi-schedule/types"
import { summarizePipeline } from "@/lib/utils/pipeline-summary"

type SummaryBarProps = {
  ops: OpsState
  viewMode: "standard" | "compact" | "fullscreen"
  onViewModeChange: (mode: "standard" | "compact" | "fullscreen") => void
}

/**
 * 상단 고정 요약 바를 렌더링한다. Renders the sticky summary bar.
 */
export function SummaryBar({
  ops,
  viewMode,
  onViewModeChange,
}: SummaryBarProps) {
  const { formattedDate, dayNumber } = useDate()
  const pipeline = summarizePipeline(ops.pipeline)

  const primaryKpis = kpiData.slice(0, 3).map((kpi) => {
    const numericValue = Number(kpi.value)
    const displayValue = Number.isNaN(numericValue)
      ? kpi.value
      : numericValue.toFixed(2)
    return { ...kpi, displayValue }
  })

  const riskBadge = (() => {
    if (ops.goNoGo?.gate === "NO-GO") {
      return {
        label: "High Risk",
        tone: "bg-rose-500/20 text-rose-200",
        icon: ShieldAlert,
      }
    }
    if (ops.goNoGo?.gate === "CONDITIONAL" || pipeline.status === "WARN") {
      return {
        label: "Elevated",
        tone: "bg-amber-500/20 text-amber-200",
        icon: AlertTriangle,
      }
    }
    return {
      label: "Normal",
      tone: "bg-emerald-500/20 text-emerald-200",
      icon: ShieldCheck,
    }
  })()

  const RiskIcon = riskBadge.icon

  return (
    <div className="sticky top-3 z-30 mb-6 rounded-2xl border border-accent/20 bg-card/90 p-4 backdrop-blur-xl shadow-glow">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Gauge className="h-5 w-5 text-cyan-400" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Daily Summary
            </div>
            <div className="text-sm font-semibold text-foreground">
              {formattedDate} · Day {dayNumber.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-wrap gap-3">
          {primaryKpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-accent/15 bg-slate-900/50 px-4 py-2"
            >
              <div className="text-[10px] uppercase tracking-widest text-slate-400">
                {kpi.label}
              </div>
              <div className="text-lg font-semibold text-cyan-200">{kpi.displayValue}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-accent/15 bg-slate-900/50 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CalendarClock className="h-4 w-4 text-cyan-300" />
              Notice Updated
            </div>
            <div className="text-sm font-semibold text-slate-200">{ops.notice.date}</div>
          </div>
          <div className="rounded-xl border border-accent/15 bg-slate-900/50 px-4 py-2">
            <div className="text-xs text-slate-400">Weather Updated</div>
            <div className="text-sm font-semibold text-slate-200">
              {new Date(ops.weather.lastUpdated).toISOString().slice(0, 10)}
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 ${riskBadge.tone}`}
          >
            <RiskIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              {riskBadge.label}
            </span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(["standard", "compact", "fullscreen"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={
                "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest " +
                (viewMode === mode
                  ? "border-cyan-400/60 bg-cyan-500/20 text-cyan-200"
                  : "border-slate-700/60 text-slate-400 hover:text-slate-200")
              }
            >
              {mode}
            </button>
          ))}
          <div
            className={
              "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest " +
              (pipeline.status === "PASS"
                ? "border-emerald-400/40 text-emerald-300"
                : pipeline.status === "WARN"
                ? "border-amber-400/40 text-amber-300"
                : "border-rose-400/40 text-rose-300")
            }
          >
            Data Consistency · {pipeline.label}
          </div>
        </div>
      </div>
    </div>
  )
}
