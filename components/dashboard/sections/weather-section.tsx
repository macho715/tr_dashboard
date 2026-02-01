"use client"

import type { OpsState } from "@/lib/ops/agi-schedule/types"
import { WeatherRiskCard } from "@/components/dashboard/weather-risk-card"

type WeatherSectionProps = {
  ops: OpsState
  riskFilter: "ALL" | "LOW" | "MEDIUM" | "HIGH"
  onRiskFilterChange: (value: "ALL" | "LOW" | "MEDIUM" | "HIGH") => void
}

/**
 * 날씨/리스크 섹션을 렌더링한다. Renders the weather & risk section.
 */
export function WeatherSection({
  ops,
  riskFilter,
  onRiskFilterChange,
}: WeatherSectionProps) {
  return (
    <section id="weather" aria-label="Weather & Marine Risk" className="space-y-4">
      <WeatherRiskCard
        ops={ops}
        riskFilter={riskFilter}
        onRiskFilterChange={onRiskFilterChange}
      />
    </section>
  )
}
