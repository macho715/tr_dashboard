"use client"

import type { OpsState } from "@/lib/ops/agi-schedule/types"

type WeatherRiskCardProps = {
  ops: OpsState
  riskFilter: "ALL" | "LOW" | "MEDIUM" | "HIGH"
  onRiskFilterChange: (value: "ALL" | "LOW" | "MEDIUM" | "HIGH") => void
}

const riskTones = {
  LOW: "bg-emerald-500/20 text-emerald-200",
  MEDIUM: "bg-amber-500/20 text-amber-200",
  HIGH: "bg-rose-500/20 text-rose-200",
}

const buildRiskLevel = (summary: string): "LOW" | "MEDIUM" | "HIGH" => {
  const normalized = summary.toLowerCase()
  if (normalized.includes("high") || normalized.includes("rough")) return "HIGH"
  if (normalized.includes("moderate") || normalized.includes("watch")) return "MEDIUM"
  return "LOW"
}

/**
 * 날씨·위험 통합 카드를 렌더링한다. Renders the integrated weather/risk card.
 */
export function WeatherRiskCard({
  ops,
  riskFilter,
  onRiskFilterChange,
}: WeatherRiskCardProps) {
  const heatmapData = ops.weather.days.map((day) => ({
    ...day,
    risk: buildRiskLevel(day.summary),
  }))

  const filteredDays =
    riskFilter === "ALL"
      ? heatmapData
      : heatmapData.filter((day) => day.risk === riskFilter)

  return (
    <div className="rounded-2xl border border-accent/15 bg-card/80 p-6 backdrop-blur-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Weather &amp; Marine Risk
          </div>
          <div className="text-xs text-slate-400">
            Last Updated {new Date(ops.weather.lastUpdated).toISOString().slice(0, 10)} ·{" "}
            {ops.weather.locationLabel}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "LOW", "MEDIUM", "HIGH"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onRiskFilterChange(level)}
              className={
                "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest " +
                (riskFilter === level
                  ? "border-cyan-400/60 text-cyan-200"
                  : "border-slate-700/60 text-slate-400 hover:text-slate-200")
              }
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {filteredDays.map((day) => (
            <div
              key={day.date}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-900/40 p-3"
            >
              <div>
                <div className="text-xs font-semibold text-slate-200">{day.date}</div>
                <div className="text-xs text-slate-400">{day.summary}</div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Wind {Number(day.windMaxKt ?? 0).toFixed(2)}</span>
                <span>Wave {Number(day.waveMaxFt ?? 0).toFixed(2)}</span>
                <span className={`rounded-full px-2 py-0.5 ${riskTones[day.risk]}`}>
                  {day.risk}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Go / No-Go
            </div>
            {ops.goNoGo ? (
              <div className="mt-2">
                <div className="text-sm font-semibold text-slate-100">{ops.goNoGo.gate}</div>
                <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-400">
                  {ops.goNoGo.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">
                No gate submitted. Use /gonogo to evaluate.
              </div>
            )}
          </div>
          <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Heatmap
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {heatmapData.map((day) => (
                <div key={day.date} className="space-y-1 text-center">
                  <div className={`h-10 rounded-lg ${riskTones[day.risk]}`} />
                  <div className="text-[10px] text-slate-400">{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
