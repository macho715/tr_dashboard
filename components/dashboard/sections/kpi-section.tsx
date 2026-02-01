"use client"

import { KPICards } from "@/components/dashboard/kpi-cards"

export function KPISection() {
  return (
    <section id="kpi" aria-label="Key Performance Indicators">
      <KPICards />
    </section>
  )
}
