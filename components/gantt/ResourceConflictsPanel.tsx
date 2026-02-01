"use client"

import React, { useMemo, useState } from "react"
import type { ScheduleConflict } from "@/lib/ssot/schedule"

type Enhanced = ScheduleConflict &
  Required<Pick<ScheduleConflict, "resource" | "overlapStart" | "overlapEnd">>

interface Props {
  conflicts: ScheduleConflict[]
  onSelectActivity?: (activityId: string) => void
  resourceFilter?: string
  onResourceFilterChange?: (resource: string) => void
}

export function ResourceConflictsPanel({
  conflicts,
  onSelectActivity,
  resourceFilter,
  onResourceFilterChange,
}: Props) {
  const resourceConflicts = useMemo(() => {
    return conflicts.filter(
      (conflict) =>
        conflict.type === "RESOURCE" &&
        conflict.resource &&
        conflict.overlapStart &&
        conflict.overlapEnd
    ) as Enhanced[]
  }, [conflicts])

  const [internalFilter, setInternalFilter] = useState<string>("ALL")
  const activeFilter = resourceFilter ?? internalFilter

  const resources = useMemo(() => {
    const unique = new Set(resourceConflicts.map((conflict) => conflict.resource))
    return ["ALL", ...Array.from(unique).sort((a, b) => a.localeCompare(b))]
  }, [resourceConflicts])

  const grouped = useMemo(() => {
    const groupedMap = new Map<string, Enhanced[]>()
    for (const conflict of resourceConflicts) {
      if (activeFilter !== "ALL" && conflict.resource !== activeFilter) continue
      const group = groupedMap.get(conflict.resource) || []
      group.push(conflict)
      groupedMap.set(conflict.resource, group)
    }
    for (const group of groupedMap.values()) {
      group.sort((a, b) => a.overlapStart.localeCompare(b.overlapStart))
    }
    return Array.from(groupedMap.entries()).sort(([ra], [rb]) => ra.localeCompare(rb))
  }, [resourceConflicts, activeFilter])

  if (resourceConflicts.length === 0) return null

  const fmt = (iso: string) => iso.slice(0, 16).replace("T", " ")
  const handleFilterChange = (value: string) => {
    if (onResourceFilterChange) {
      onResourceFilterChange(value)
    } else {
      setInternalFilter(value)
    }
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          자원 충돌 (Resource Conflicts)
        </div>
        {resources.length > 2 && (
          <select
            className="ml-auto rounded border border-accent/30 bg-slate-800/50 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            value={activeFilter}
            onChange={(event) => handleFilterChange(event.target.value)}
          >
            {resources.map((resource) => (
              <option key={resource} value={resource}>
                {resource}
              </option>
            ))}
          </select>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="text-xs text-slate-400">표시할 충돌이 없습니다.</div>
      ) : (
        grouped.map(([resource, items]) => (
          <div
            key={resource}
            className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-amber-400">{resource}</div>
              <div className="text-xs text-slate-400">{items.length}건</div>
            </div>

            <ul className="space-y-2">
              {items.map((conflict) => {
                const [aId, bId] = conflict.related_activity_ids || [conflict.activity_id, ""]
                return (
                  <li
                    key={conflict.conflictKey || `${conflict.resource}-${aId}-${bId}`}
                    className="rounded bg-slate-800/30 p-2 border border-slate-700/50"
                  >
                    <div className="text-xs text-slate-400 mb-1">
                      {fmt(conflict.overlapStart)} ~ {fmt(conflict.overlapEnd)}
                      {" \u00b7 "}
                      <span className="text-amber-400">
                        overlap {conflict.overlapMinutes ?? 0} min
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Resource conflict:{" "}
                      <span className="font-semibold text-amber-400">{resource}</span>{" "}
                      is required by both{" "}
                      {onSelectActivity ? (
                        <>
                          <button
                            className="underline underline-offset-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                            onClick={() => onSelectActivity(aId)}
                          >
                            {aId}
                          </button>{" "}
                          and{" "}
                          <button
                            className="underline underline-offset-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                            onClick={() => onSelectActivity(bId)}
                          >
                            {bId}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-cyan-400">{aId}</span> and{" "}
                          <span className="text-cyan-400">{bId}</span>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
