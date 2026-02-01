"use client"

import { CheckCircle2, Circle, CircleDot } from "lucide-react"

const milestones = [
  { label: "Load-out", status: "done" },
  { label: "Sail-away", status: "in-progress" },
  { label: "Load-in", status: "pending" },
  { label: "Turning", status: "pending" },
  { label: "Jack-down", status: "pending" },
] as const

const statusStyles: Record<string, string> = {
  done: "text-emerald-400",
  "in-progress": "text-amber-400",
  pending: "text-slate-500",
}

const statusIcons: Record<string, JSX.Element> = {
  done: <CheckCircle2 className="h-4 w-4" />,
  "in-progress": <CircleDot className="h-4 w-4" />,
  pending: <Circle className="h-4 w-4" />,
}

export function MilestoneTracker() {
  return (
    <section className="rounded-2xl border border-accent/15 bg-card/80 p-5 backdrop-blur-lg">
      <div className="mb-4 text-sm font-semibold text-foreground">Milestone Tracker</div>
      <div className="flex flex-wrap items-center gap-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.label} className="flex items-center gap-3">
            <div className={`flex items-center gap-1 ${statusStyles[milestone.status]}`}>
              {statusIcons[milestone.status]}
              <span className="text-xs font-semibold">{milestone.label}</span>
            </div>
            {index < milestones.length - 1 && (
              <span className="h-px w-10 bg-gradient-to-r from-cyan-500/50 to-transparent" />
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Stage progress summary for the active voyage window.
      </p>
    </section>
  )
}
