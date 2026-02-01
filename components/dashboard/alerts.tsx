"use client"

import { Megaphone, AlertTriangle } from "lucide-react"
import { useDate } from "@/lib/contexts/date-context"

/**
 * 공지 카드 블록을 렌더링한다. Renders the operational notice block.
 */
export function OperationalNotice() {
  const { formattedDate, dayNumber } = useDate()

  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/5 border border-cyan-500/40 rounded-xl px-6 py-4 flex items-start gap-4">
      <Megaphone className="w-7 h-7 text-cyan-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm flex-1">
        <p className="text-slate-300">
          <strong className="text-cyan-400">AGI TR Units 1-7</strong> — Beam change |
          LO/LI | Sea fastening | Transportation | Turning | Jacking-down
        </p>
        <div className="text-slate-400 text-xs mt-2 space-y-0.5">
          <p>• 1st Trip: Load 1 TR Unit (without LCT ballasting)</p>
          <p>• SPMT: 2 Sets maintained | MOB: 26 Jan (No change)</p>
          <p className="italic">• Remaining schedule to be confirmed</p>
          <p className="text-cyan-400 font-semibold mt-2">
            Selected Date: {formattedDate} (Day {dayNumber.toFixed(2)})
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 날씨 경보 블록을 렌더링한다. Renders the weather alert block.
 */
export function WeatherAlert() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-500/35 rounded-xl px-6 py-5 flex items-start gap-4">
      <AlertTriangle className="w-7 h-7 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-amber-400 text-sm font-bold mb-2 tracking-tight">
          Weather & Marine Risk Update (Mina Zayed Port)
        </h4>
        <p className="text-slate-500 text-[10px] mb-2">
          Last Updated: 21 Jan 2026 | Update Frequency: Weekly
        </p>
        <div className="text-slate-400 text-xs leading-relaxed space-y-2">
          <p>
            <strong className="text-amber-300">21–22 Jan:</strong> High operational risk
            due to NW winds and potential dust (reduced visibility); sea state may reach
            rough to very rough.
          </p>
          <p>
            <strong className="text-amber-300">23–30 Jan:</strong> Conditions generally
            ease, improving the working window—MZP Arrival (26 Jan) may peak around 20.00
            kt, while Deck Prep (27–28 Jan) and Load-out (29–30 Jan) are mostly ≤12.00 kt.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 알림 트리아지 섹션을 렌더링한다. Renders the alerts triage section.
 */
export function AlertsTriage() {
  return (
    <section className="rounded-2xl border border-accent/15 bg-card/80 p-6 backdrop-blur-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">Alerts Triage</div>
        <div className="flex flex-wrap gap-2">
          {["Weather", "Marine", "SPMT", "Safety", "Port Ops"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[10px] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-rose-300">
            Immediate Action
          </div>
          <OperationalNotice />
        </div>
        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-amber-300">
            Monitoring
          </div>
          <WeatherAlert />
        </div>
      </div>
    </section>
  )
}
