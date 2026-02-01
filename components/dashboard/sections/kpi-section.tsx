"use client"

import { KPICards } from "@/components/dashboard/kpi-cards"

/**
 * KPI 섹션을 렌더링한다. Renders the KPI section.
 */
export function KPISection() {
  return (
    <section id="kpi" aria-label="Key Performance Indicators">
      <KPICards />
    </section>
  )
}
