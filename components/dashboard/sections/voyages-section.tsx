"use client"

import { VoyageCards } from "@/components/dashboard/voyage-cards"
import type { voyages } from "@/lib/dashboard-data"

type VoyagesSectionProps = {
  onSelectVoyage: (voyage: (typeof voyages)[number] | null) => void
}

export function VoyagesSection({ onSelectVoyage }: VoyagesSectionProps) {
  return (
    <section id="voyages" aria-label="Voyage Cards">
      <VoyageCards onSelectVoyage={onSelectVoyage} />
    </section>
  )
}
