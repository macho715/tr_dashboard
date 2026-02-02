"use client"

import {
  Calendar,
  Ship,
  Wrench,
  Package,
  Flag,
  Target,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { kpiData } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"

const iconMap: Record<string, LucideIcon> = {
  calendar: Calendar,
  ship: Ship,
  tool: Wrench,
  package: Package,
  flag: Flag,
  target: Target,
}

export function KPICards() {
  const { dayNumber, formattedDate } = useDate()
  const displayKpiData = [
    ...kpiData.slice(0, 4),
    { icon: "calendar", value: dayNumber.toString(), label: "Day Number" },
    { icon: "flag", value: formattedDate.split(" ").slice(0, 2).join(" "), label: "Selected Date" },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {displayKpiData.map((kpi, index) => {
        const Icon = iconMap[kpi.icon]
        return (
          <div
            key={index}
            className="bg-card/85 backdrop-blur-lg p-5 rounded-xl text-center border border-accent/15 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-glow relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Icon className="w-7 h-7 mx-auto mb-2 text-slate-400" />
            <div className="font-mono text-3xl font-bold text-cyan-400 mb-1 tracking-tight">
              {kpi.value}
            </div>
            <div className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
              {kpi.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
