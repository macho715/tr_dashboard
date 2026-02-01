"use client"

import { useState } from "react"
import { Ship, Sailboat, ChevronDown } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"
import {
  getDateStatus,
  getStatusClasses,
  parseShortDate,
} from "@/lib/utils/date-highlights"

interface VoyageCardsProps {
  onSelectVoyage?: (voyage: (typeof voyages)[number]) => void
}

/**
 * Voyage 카드 리스트를 렌더링한다. Renders voyage cards with filters and highlights.
 */
export function VoyageCards({ onSelectVoyage }: VoyageCardsProps) {
  const { selectedDate } = useDate()
  const [expanded, setExpanded] = useState(true)
  const [activeVoyage, setActiveVoyage] = useState<number | "ALL">("ALL")

  const filteredVoyages = voyages.filter((v) => {
    const loadOutDate = parseShortDate(v.loadOut, selectedDate.getUTCFullYear())
    const jackDownDate = parseShortDate(v.jackDown, selectedDate.getUTCFullYear())
    if (!loadOutDate || !jackDownDate) return true
    return selectedDate >= loadOutDate && selectedDate <= jackDownDate
  })

  const visibleVoyages =
    activeVoyage === "ALL"
      ? filteredVoyages
      : filteredVoyages.filter((voyage) => voyage.voyage === activeVoyage)

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="text-foreground text-base font-bold flex items-center gap-2 tracking-tight">
          <Ship className="w-5 h-5 text-cyan-400" />
          7 Voyages Overview
          {visibleVoyages.length < voyages.length && (
            <span className="text-slate-500 text-xs font-normal">
              ({visibleVoyages.length} of {voyages.length} visible)
            </span>
          )}
        </h2>
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent" />
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          {["ALL", "1", "2", "3", "4", "5", "6", "7"].map((value) => {
            const numericValue = value === "ALL" ? "ALL" : Number(value)
            const isActive = activeVoyage === numericValue
            return (
              <button
                key={value}
                type="button"
                onClick={() => setActiveVoyage(numericValue as number | "ALL")}
                className={
                  "rounded-full border px-3 py-1 font-semibold uppercase tracking-widest " +
                  (isActive
                    ? "border-cyan-400/60 text-cyan-200"
                    : "border-slate-700/60 text-slate-400 hover:text-slate-200")
                }
              >
                {value}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-1 rounded-full border border-slate-700/60 px-3 py-1 text-slate-400 hover:text-slate-200"
          >
            {expanded ? "Collapse" : "Expand"}
            <ChevronDown className={"h-3 w-3 " + (expanded ? "" : "-rotate-90")} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {visibleVoyages.map((v) => {
          const loadOutStatus = getDateStatus(
            parseShortDate(v.loadOut, selectedDate.getUTCFullYear()),
            selectedDate
          )
          const loadInStatus = getDateStatus(
            parseShortDate(v.loadIn, selectedDate.getUTCFullYear()),
            selectedDate
          )
          const jackDownStatus = getDateStatus(
            parseShortDate(v.jackDown, selectedDate.getUTCFullYear()),
            selectedDate
          )
          const sailStatus = getDateStatus(
            parseShortDate(v.sailDate, selectedDate.getUTCFullYear()),
            selectedDate
          )
          return (
            <button
              key={v.voyage}
              type="button"
              onClick={() => onSelectVoyage?.(v)}
              className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl p-4 border border-accent/15 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-cyan-500 hover:shadow-voyage"
            >
              <div className="font-mono text-amber-400 text-[10px] font-bold tracking-widest uppercase mb-2">
                Voyage {v.voyage}
              </div>
              <div className="text-foreground text-sm font-bold mb-3 tracking-tight">
                {v.trUnit}
              </div>
              {expanded ? (
                <div className="font-mono text-[10px] text-slate-500 leading-relaxed space-y-1">
                  <p className={getStatusClasses(loadOutStatus)} title="Load-out date">
                    <strong className="text-slate-300">Load-out:</strong> {v.loadOut}
                  </p>
                  <p className={getStatusClasses(loadInStatus)} title="Load-in date">
                    <strong className="text-slate-300">Load-in:</strong> {v.loadIn}
                  </p>
                  <p className={getStatusClasses(jackDownStatus)} title="Jack-down date">
                    <strong className="text-slate-300">Jack-down:</strong> {v.jackDown}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Bay {v.bay} · {v.turning}
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 mt-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-wide">
                <Sailboat className="w-3 h-3" />
                <span className={getStatusClasses(sailStatus)} title="Sail date">
                  {v.sailDate}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
