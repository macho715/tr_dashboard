"use client"

import { Ship, Sailboat } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"
import { getTideForVoyage } from "@/lib/data/tide-data"
import { useDate } from "@/lib/contexts/date-context"
import { TideTable } from "@/components/dashboard/tide-table"
import {
  getMapStatusColor,
  type MapSegmentStatus,
} from "@/lib/ssot/map-status-colors"

type Voyage = (typeof voyages)[number]

interface VoyageCardsProps {
  onSelectVoyage?: (voyage: Voyage) => void
  selectedVoyage?: Voyage | null
}

function parseVoyageDate(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(" ")
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(Date.UTC(2026, month, day))
}

export function VoyageCards({ onSelectVoyage, selectedVoyage }: VoyageCardsProps) {
  const { selectedDate } = useDate()

  const filteredVoyages = voyages.filter((v) => {
    const loadOutDate = parseVoyageDate(v.loadOut)
    const jackDownDate = parseVoyageDate(v.jackDown)
    return selectedDate >= loadOutDate && selectedDate <= jackDownDate
  })

  const displayVoyages = filteredVoyages.length > 0 ? filteredVoyages : voyages

  function getVoyageStatus(v: Voyage): MapSegmentStatus {
    const loadOut = parseVoyageDate(v.loadOut)
    const jackDown = parseVoyageDate(v.jackDown)
    if (selectedDate < loadOut) return "planned"
    if (selectedDate > jackDown) return "completed"
    return "in_progress"
  }

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Ship className="w-5 h-5 text-cyan-400" />
        7 Voyages Overview
        {displayVoyages.length < voyages.length && (
          <span className="text-slate-500 text-xs font-normal">
            ({displayVoyages.length} of {voyages.length} visible)
          </span>
        )}
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {displayVoyages.map((v) => (
          <button
            key={v.voyage}
            type="button"
            onClick={() => onSelectVoyage?.(v)}
            className={`rounded-xl p-4 border text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-cyan-500 hover:shadow-voyage ${getMapStatusColor(
              getVoyageStatus(v)
            )} ${
              selectedVoyage?.voyage === v.voyage
                ? " ring-2 ring-cyan-400/60"
                : ""
            }`}
          >
            <div className="font-mono text-amber-400 text-xs font-bold tracking-widest uppercase mb-2">
              Voyage {v.voyage}
            </div>
            <div className="text-foreground text-sm font-bold mb-3 tracking-tight">
              {v.trUnit}
            </div>
            <div className="font-mono text-xs text-slate-500 leading-relaxed space-y-0.5">
              <p>
                <strong className="text-slate-400">Load-out:</strong> {v.loadOut}
              </p>
              <p>
                <strong className="text-slate-400">Load-in:</strong> {v.loadIn}
              </p>
              <p>
                <strong className="text-slate-400">Jack-down:</strong> {v.jackDown}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 px-3 py-1.5 rounded-full font-mono text-xs font-bold tracking-wide">
              <Sailboat className="w-3 h-3" />
              {v.sailDate}
            </div>
            <TideTable
              voyageNum={v.voyage}
              rows={getTideForVoyage(v.voyage)}
              className="mt-3 rounded-md border border-accent/10 overflow-hidden"
            />
          </button>
        ))}
      </div>
    </section>
  )
}
