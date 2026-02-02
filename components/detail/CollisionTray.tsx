"use client"

import { AlertTriangle } from "lucide-react"
import type { ScheduleConflict } from "@/lib/ssot/schedule"
import { CollisionCard } from "./CollisionCard"

type CollisionTrayProps = {
  collisions: ScheduleConflict[]
  onCollisionClick: (collision: ScheduleConflict) => void
}

/**
 * Collision tray (patch.md §4.2, Phase 7 T7.6)
 * Grouped by severity, CollisionCard list, 2-click UX
 */
export function CollisionTray({ collisions, onCollisionClick }: CollisionTrayProps) {
  const bySeverity = {
    error: collisions.filter((c) => c.severity === "error"),
    warn: collisions.filter((c) => c.severity === "warn"),
  }

  return (
    <div
      className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3"
      data-testid="collision-tray"
      role="region"
      aria-label="Collisions"
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        Collisions ({collisions.length})
      </div>
      <div className="space-y-2">
        {collisions.length === 0 ? (
          <p className="text-xs text-slate-500">No collisions</p>
        ) : (
          <>
            {bySeverity.error.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase text-red-400">
                  Critical ({bySeverity.error.length})
                </div>
                <ul className="space-y-1.5">
                  {bySeverity.error.map((col) => (
                    <li key={col.conflictKey ?? `${col.activity_id}-${col.message}`}>
                      <CollisionCard collision={col} onClick={() => onCollisionClick(col)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {bySeverity.warn.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase text-amber-400">
                  Warning ({bySeverity.warn.length})
                </div>
                <ul className="space-y-1.5">
                  {bySeverity.warn.map((col) => (
                    <li key={col.conflictKey ?? `${col.activity_id}-${col.message}`}>
                      <CollisionCard collision={col} onClick={() => onCollisionClick(col)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
