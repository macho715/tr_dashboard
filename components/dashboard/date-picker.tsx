"use client"

import { Calendar } from "lucide-react"
import { useDate } from "@/lib/contexts/date-context"
import { PROJECT_START, PROJECT_END } from "@/lib/dashboard-data"
import { parseDateInput } from "@/lib/ssot/schedule"

export function DatePicker() {
  const { selectedDate, setSelectedDate, formattedDate } = useDate()

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseDateInput(e.target.value)
    if (!parsed) return
    if (parsed >= PROJECT_START && parsed <= PROJECT_END) {
      setSelectedDate(parsed)
    }
  }

  const minDate = PROJECT_START.toISOString().split("T")[0]
  const maxDate = PROJECT_END.toISOString().split("T")[0]
  const inputValue = selectedDate.toISOString().split("T")[0]

  return (
    <div className="flex items-center gap-3">
      <Calendar className="w-5 h-5 text-cyan-400" />
      <label className="text-slate-400 text-sm font-medium">
        Selected Date:
      </label>
      <input
        type="date"
        value={inputValue}
        onChange={handleDateChange}
        min={minDate}
        max={maxDate}
        title="Selected date: YYYY-MM-DD (UTC day index used for Gantt)"
        className="px-4 py-2 bg-slate-800/50 border border-accent/30 rounded-lg text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors"
      />
      <span className="text-cyan-400 font-mono text-sm font-semibold">
        {formattedDate}
      </span>
    </div>
  )
}
