"use client"

import { BarChart3 } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"
import { getDateStatus, getStatusClasses, parseShortDate } from "@/lib/utils/date-highlights"

/**
 * 상세 일정 테이블을 렌더링한다. Renders the detailed voyage schedule table.
 */
export function ScheduleTable() {
  const { selectedDate } = useDate()

  const filteredVoyages = voyages.filter((v) => {
    const loadOutDate = parseShortDate(v.loadOut, selectedDate.getUTCFullYear())
    const jackDownDate = parseShortDate(v.jackDown, selectedDate.getUTCFullYear())
    if (!loadOutDate || !jackDownDate) return true
    return selectedDate >= loadOutDate && selectedDate <= jackDownDate
  })

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-7 border border-accent/15 mb-6">
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
                  className="bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 text-cyan-400 font-mono font-semibold text-[10px] uppercase tracking-wider p-4 text-center first:rounded-tl-lg last:rounded-tr-lg"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVoyages.map((v, index) => {
              const arrivalStatus = getDateStatus(
                parseShortDate(v.arrivalMZP, selectedDate.getUTCFullYear()),
                selectedDate
              )
              const loadOutStatus = getDateStatus(
                parseShortDate(v.loadOut, selectedDate.getUTCFullYear()),
                selectedDate
              )
              const sailStatus = getDateStatus(
                parseShortDate(v.sailAway, selectedDate.getUTCFullYear()),
                selectedDate
              )
              const arrivalAgiStatus = getDateStatus(
                parseShortDate(v.agiArrival, selectedDate.getUTCFullYear()),
                selectedDate
              )
              const loadInStatus = getDateStatus(
                parseShortDate(v.loadIn, selectedDate.getUTCFullYear()),
                selectedDate
              )
              const turningStatus = getDateStatus(
                parseShortDate(v.turning, selectedDate.getUTCFullYear()),
                selectedDate
              )
              const jackDownStatus = getDateStatus(
                parseShortDate(v.jackDown, selectedDate.getUTCFullYear()),
                selectedDate
              )
              return (
                <tr
                  key={v.voyage}
                  className="border-b border-accent/10 transition-colors hover:bg-accent/5"
                >
                  <td className="p-4 text-center text-xs font-medium text-foreground">
                    V{v.voyage} — {v.trUnit}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(arrivalStatus)
                    }
                  >
                    {v.arrivalMZP}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(loadOutStatus)
                    }
                  >
                    {v.loadOut}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(sailStatus)
                    }
                  >
                    {v.sailAway}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(arrivalAgiStatus)
                    }
                  >
                    {v.agiArrival}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(loadInStatus)
                    }
                  >
                    {v.loadIn}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(turningStatus)
                    }
                  >
                    {v.turning}
                  </td>
                  <td
                    className={
                      "p-4 text-center text-xs font-mono text-slate-300 " +
                      getStatusClasses(jackDownStatus)
                    }
                  >
                    {v.jackDown}
                    {index === filteredVoyages.length - 1 &&
                      filteredVoyages.length === voyages.length && (
                        <span className="text-teal-400"> ✓</span>
                      )}
                  </td>
                  <td className="p-4 text-center text-xs text-cyan-300 font-semibold">
                    {v.bay}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
