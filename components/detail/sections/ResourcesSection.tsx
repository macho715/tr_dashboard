"use client"

import { Package } from "lucide-react"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

type ResourcesSectionProps = {
  activity: ScheduleActivity
}

/**
 * Resources section (patch.md §5, Phase 7 T7.4)
 * Planned resources from resource_tags
 */
export function ResourcesSection({ activity }: ResourcesSectionProps) {
  const tags = activity.resource_tags
  if (!tags || tags.length === 0) return null

  return (
    <div
      className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-3"
      data-testid="resources-section"
    >
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500">
        <Package className="h-3.5 w-3.5" />
        Resources
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-slate-600/60 bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
