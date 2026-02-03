"use client"

import { ChevronLeft, ChevronRight, Filter, Maximize2, ZoomIn, ZoomOut } from "lucide-react"

const views = ["Day", "Week"] as const

export type TimelineView = (typeof views)[number]

export type HighlightFlags = {
  delay: boolean
  lock: boolean
  constraint: boolean
}

/** Task 9: vis-timeline Zoom/Controls - optional, only when vis engine active */
export type TimelineZoomCallbacks = {
  onZoomIn?: () => void
  onZoomOut?: () => void
  onToday?: () => void
  onFit?: () => void
  onPanLeft?: () => void
  onPanRight?: () => void
}

interface TimelineControlsProps {
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  onJumpRequest?: () => void
  /** Task 9: Zoom/Today/Fit/Pan - when provided, show vis-timeline control buttons */
  zoomCallbacks?: TimelineZoomCallbacks
}

export function TimelineControls({
  view,
  onViewChange,
  highlightFlags,
  onHighlightFlagsChange,
  jumpDate,
  onJumpDateChange,
  onJumpRequest,
  zoomCallbacks,
}: TimelineControlsProps) {
  const toggle = (key: keyof HighlightFlags) => {
    onHighlightFlagsChange({ ...highlightFlags, [key]: !highlightFlags[key] })
  }

  const z = zoomCallbacks
  const hasZoomControls = z && (z.onZoomIn || z.onZoomOut || z.onFit || z.onToday || z.onPanLeft || z.onPanRight)

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent/15 bg-glass px-4 py-3 text-xs text-slate-300">
      {/* Task 9: Zoom/Pan/Fit/Today - vis-timeline controls */}
      {hasZoomControls && (
        <div className="flex items-center gap-1 border-r border-slate-700/60 pr-3">
          {z.onZoomIn && (
            <button
              type="button"
              onClick={z.onZoomIn}
              className="rounded p-1.5 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          )}
          {z.onZoomOut && (
            <button
              type="button"
              onClick={z.onZoomOut}
              className="rounded p-1.5 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          )}
          {z.onPanLeft && (
            <button
              type="button"
              onClick={z.onPanLeft}
              className="rounded p-1.5 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Pan Left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {z.onPanRight && (
            <button
              type="button"
              onClick={z.onPanRight}
              className="rounded p-1.5 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Pan Right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {z.onFit && (
            <button
              type="button"
              onClick={z.onFit}
              className="rounded p-1.5 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Fit All"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          {z.onToday && (
            <button
              type="button"
              onClick={z.onToday}
              className="rounded px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-300"
              title="Move to Selected Date"
            >
              Today
            </button>
          )}
        </div>
      )}
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
              "rounded-full px-3 py-1 text-xs font-semibold transition " +
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
              "rounded-full border px-3 py-1 text-xs font-semibold transition " +
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
          className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs text-slate-300"
          placeholder="Jump to YYYY-MM-DD"
        />
        <button
          type="button"
          onClick={() => onJumpRequest?.()}
          className="rounded-lg bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-900"
        >
          Go
        </button>
      </div>
    </div>
  )
}
