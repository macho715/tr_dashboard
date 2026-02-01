"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CalendarClock, Gauge, ShieldAlert } from "lucide-react"
import { scheduleActivities } from "@/lib/data/schedule-data"
import { voyages } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"

interface OperationOverviewRibbonProps {
  conflictCount: number
}

function parseDateString(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(" ")
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(2026, month, day)
}

export function OperationOverviewRibbon({ conflictCount }: OperationOverviewRibbonProps) {
  const { selectedDate } = useDate()
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsCompact(window.scrollY > 140)
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const criticalCount = useMemo(() => {
    const start = new Date(selectedDate)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 2)
    return scheduleActivities.filter((a) => {
      const plannedStart = new Date(a.planned_start)
      return plannedStart >= start && plannedStart <= end
    }).length
  }, [selectedDate])

  const delayedVoyages = useMemo(() => {
    return voyages.filter((v) => {
      const loadOut = parseDateString(v.loadOut)
      const jackDown = parseDateString(v.jackDown)
      const delayThreshold = new Date(loadOut)
      delayThreshold.setDate(delayThreshold.getDate() + 3)
      return selectedDate > delayThreshold && selectedDate <= jackDown
    }).length
  }, [selectedDate])

  return (
    <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-slate-900/60 to-teal-500/10 backdrop-blur-xl shadow-glow">
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 transition-all duration-300">
        <div className="flex items-center gap-3">
          <Gauge className="h-6 w-6 text-cyan-400" />
          <div>
            <div className="text-sm font-semibold text-foreground">Operation Overview</div>
            <div className="text-[11px] text-slate-400">
              Daily pulse · {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            {delayedVoyages} delayed voyages
          </div>
          <div className="flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            {conflictCount} active conflicts
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1">
            <CalendarClock className="h-3.5 w-3.5 text-cyan-300" />
            {criticalCount} critical tasks in 48h
          </div>
        </div>
        {!isCompact && (
          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-400">
            <span className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2.5 py-1">
              Focus: Load-out & Sail-away readiness
            </span>
            <span className="rounded-full border border-slate-600/40 bg-slate-900/60 px-2.5 py-1">
              Next decision window: 18:00 LT
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
