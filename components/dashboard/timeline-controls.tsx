"use client"

import { Filter, ZoomIn } from "lucide-react"

const views = ["Day", "Week"] as const

export type TimelineView = (typeof views)[number]

export type HighlightFlags = {
  delay: boolean
  lock: boolean
  constraint: boolean
}

interface TimelineControlsProps {
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  onJumpRequest?: () => void
}

export function TimelineControls({
  view,
  onViewChange,
  highlightFlags,
  onHighlightFlagsChange,
  jumpDate,
  onJumpDateChange,
  onJumpRequest,
}: TimelineControlsProps) {
  const toggle = (key: keyof HighlightFlags) => {
    onHighlightFlagsChange({ ...highlightFlags, [key]: !highlightFlags[key] })
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent/15 bg-glass px-4 py-3 text-xs text-slate-300">
      <div className="flex items-center gap-2 text-slate-400">
        <ZoomIn className="h-4 w-4" />
        View
      </div>
      <div className="flex items-center gap-2">
        {views.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onViewChange(item)}
            className={
              "rounded-full px-3 py-1 text-[11px] font-semibold transition " +
              (view === item
                ? "bg-cyan-500 text-slate-900"
                : "border border-slate-700/60 text-slate-400 hover:border-cyan-500/50")
            }
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        <Filter className="h-4 w-4" />
        Highlights
      </div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "delay", label: "Delay" },
            { key: "lock", label: "Lock" },
            { key: "constraint", label: "Constraint" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggle(item.key)}
            className={
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition " +
              (highlightFlags[item.key]
                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
                : "border-slate-700/60 text-slate-400 hover:border-cyan-500/40")
            }
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <input
          value={jumpDate}
          onChange={(event) => onJumpDateChange(event.target.value)}
          className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[11px] text-slate-300"
          placeholder="Jump to YYYY-MM-DD"
        />
        <button
          type="button"
          onClick={() => onJumpRequest?.()}
          className="rounded-lg bg-cyan-500 px-3 py-1 text-[11px] font-semibold text-slate-900"
        >
          Go
        </button>
      </div>
    </div>
  )
}
