"use client"

import { Ship } from "lucide-react"
import { DatePicker } from "@/components/dashboard/date-picker"

export function DashboardHeader() {
  return (
    <header className="bg-glass backdrop-blur-xl p-7 rounded-2xl mb-6 border border-accent/40 shadow-glow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-extrabold mb-2 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent tracking-tight flex items-center gap-3">
            <Ship className="w-7 h-7 text-cyan-400" />
            HVDC TR Transport
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            AGI Site (Al Ghallan Island) | 7 Transformer Units | LCT BUSHRA
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 rounded-full font-mono font-bold text-xs uppercase tracking-widest mb-3 shadow-cyan">
            <span className="w-2 h-2 bg-slate-900 rounded-full animate-pulse" />
            Confirmed
          </div>
          <p className="text-slate-400 text-sm font-medium">
            Project Completion:{" "}
            <strong className="text-amber-400 font-mono text-base">March 22, 2026</strong>
          </p>
        </div>
      </div>
      <div className="pt-4 border-t border-accent/20">
        <DatePicker />
      </div>
    </header>
  )
}
