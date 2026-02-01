"use client"

import { BarChart3 } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"

export function ScheduleTable() {
  const { selectedDate } = useDate()

  function parseDateString(dateStr: string): Date {
    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    const parts = dateStr.trim().split(' ')
    const month = monthMap[parts[0]]
    const day = parseInt(parts[1], 10)
    return new Date(2026, month, day)
  }

  const filteredVoyages = voyages.filter((v) => {
    const loadOutDate = parseDateString(v.loadOut)
    const jackDownDate = parseDateString(v.jackDown)
    return selectedDate >= loadOutDate && selectedDate <= jackDownDate
  })

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15 mb-6">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <BarChart3 className="w-5 h-5 text-cyan-400" />
        Detailed Voyage Schedule
        {filteredVoyages.length < voyages.length && (
          <span className="text-slate-500 text-xs font-normal">
            ({filteredVoyages.length} of {voyages.length} visible)
          </span>
        )}
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              {[
                "Voyage / TR Unit",
                "LCT Arrival MZP",
                "Load-out",
                "Sail-away",
                "AGI Arrival",
                "Load-in",
                "Turning",
                "Jack-down",
                "TR Bay",
              ].map((header) => (
                <th
                  key={header}
                  className="bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 text-cyan-400 font-mono font-semibold text-[10px] uppercase tracking-wider p-3.5 text-center first:rounded-tl-lg last:rounded-tr-lg"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVoyages.map((v, index) => (
              <tr
                key={v.voyage}
                className="border-b border-accent/10 transition-colors hover:bg-accent/5"
              >
                <td className="p-3.5 text-center text-xs font-medium text-foreground">
                  V{v.voyage} — {v.trUnit}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.arrivalMZP}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.loadOut}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.sailAway}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.agiArrival}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.loadIn}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.turning}
                </td>
                <td className="p-3.5 text-center text-xs text-slate-400 font-mono">
                  {v.jackDown}
                  {index === filteredVoyages.length - 1 && filteredVoyages.length === voyages.length && (
                    <span className="text-teal-400"> ✓</span>
                  )}
                </td>
                <td className="p-3.5 text-center text-xs text-cyan-400 font-semibold">
                  {v.bay}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
