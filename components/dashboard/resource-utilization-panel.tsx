"use client"

import { useMemo } from "react"
import { Cpu, Ship, Wrench } from "lucide-react"
import { scheduleActivities } from "@/lib/data/schedule-data"

interface ResourceUtilizationPanelProps {
  selectedResource: string | null
  onSelectResource: (resource: string | null) => void
}

interface ResourceStat {
  label: string
  count: number
  percent: number
  icon: JSX.Element
}

const fallbackResources = [
  { label: "SPMT", icon: <Cpu className="h-4 w-4 text-cyan-300" /> },
  { label: "Vessel", icon: <Ship className="h-4 w-4 text-amber-300" /> },
  { label: "Heavy Crane", icon: <Wrench className="h-4 w-4 text-emerald-300" /> },
]

export function ResourceUtilizationPanel({
  selectedResource,
  onSelectResource,
}: ResourceUtilizationPanelProps) {
  const resourceStats = useMemo<ResourceStat[]>(() => {
    const counts = new Map<string, number>()
    for (const activity of scheduleActivities) {
      for (const tag of activity.resource_tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }

    if (counts.size === 0) {
      return fallbackResources.map((resource, index) => ({
        label: resource.label,
        count: 8 - index * 2,
        percent: 72 - index * 12,
        icon: resource.icon,
      }))
    }

    const max = Math.max(...Array.from(counts.values()))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({
        label,
        count,
        percent: Math.round((count / max) * 100),
        icon: <Cpu className="h-4 w-4 text-cyan-300" />,
      }))
  }, [])

  return (
    <aside className="sticky top-24 rounded-2xl border border-accent/15 bg-card/80 p-4 backdrop-blur-lg shadow-glow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Resource Utilization</div>
          <p className="text-xs text-slate-500">Select to filter conflicts</p>
        </div>
        <button
          className="text-xs text-slate-400 hover:text-cyan-300"
          onClick={() => onSelectResource(null)}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="space-y-3">
        {resourceStats.map((resource) => {
          const isActive = selectedResource === resource.label
          return (
            <button
              key={resource.label}
              type="button"
              onClick={() =>
                onSelectResource(isActive ? null : resource.label)
              }
              className={
                "w-full rounded-xl border px-3 py-2 text-left transition-all " +
                (isActive
                  ? "border-cyan-400/60 bg-cyan-500/10"
                  : "border-slate-700/40 bg-slate-900/40 hover:border-cyan-500/40")
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  {resource.icon}
                  {resource.label}
                </div>
                <span className="text-xs text-slate-400">{resource.count} acts</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-teal-500"
                  style={{ width: `${resource.percent}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Utilization {resource.percent}%
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
