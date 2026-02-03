"use client"

import { VoyageCards } from "@/components/dashboard/voyage-cards"
import type { voyages } from "@/lib/dashboard-data"

type VoyagesSectionProps = {
  onSelectVoyage: (voyage: (typeof voyages)[number] | null) => void
  selectedVoyage?: (typeof voyages)[number] | null
}

export function VoyagesSection({ onSelectVoyage, selectedVoyage }: VoyagesSectionProps) {
  return (
    <section id="voyages" aria-label="Voyage Cards">
      <VoyageCards onSelectVoyage={(v) => onSelectVoyage(v)} selectedVoyage={selectedVoyage} />
    </section>
  )
}
