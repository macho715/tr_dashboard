'use client'

import { useEffect, useMemo, useState } from 'react'
import type { OptionC } from '@/src/types/ssot'
import { getActivitiesArray } from '@/src/lib/ssot-queries'

type ReadinessPanelProps = {
  ssot?: OptionC | null
  tripId?: string | null
}

export function ReadinessPanel({ ssot: ssotProp, tripId }: ReadinessPanelProps) {
  const [ssot, setSsot] = useState<OptionC | null>(ssotProp ?? null)

  useEffect(() => {
    if (ssotProp != null) {
      setSsot(ssotProp)
      return
    }
    fetch('/api/ssot')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OptionC | null) => setSsot(data))
      .catch(() => setSsot(null))
  }, [ssotProp])

  const readiness = useMemo(() => {
    if (!ssot) return { ready: false, missing: [], blockers: [], milestones: [] }
    const activities = tripId
      ? (ssot.entities?.trips?.[tripId]?.activity_ids ?? []).map((id) => ssot.entities?.activities?.[id]).filter(Boolean)
      : getActivitiesArray(ssot)
    const missing: Array<{ activityId: string; evidenceType: string; stage: string }> = []
    const blockers: string[] = []
    const milestones: Array<{ name: string; planned_ts: string }> = []

    for (const act of activities) {
      if (!act) continue
      for (const req of act.evidence_required ?? []) {
        const count = (act.evidence_ids ?? []).filter((id) => {
          const item = ssot.entities?.evidence_items?.[id]
          return item?.evidence_type === req.evidence_type
        }).length
        if (count < req.min_count && req.required) {
          missing.push({ activityId: act.activity_id, evidenceType: req.evidence_type, stage: req.stage })
        }
      }
      if (act.blocker_code && act.blocker_code !== 'none') {
        blockers.push(`${act.activity_id}: ${act.blocker_code}`)
      }
      if (act.plan?.start_ts) {
        milestones.push({ name: act.title ?? act.activity_id, planned_ts: act.plan.start_ts })
      }
    }

    milestones.sort((a, b) => a.planned_ts.localeCompare(b.planned_ts))
    const ready = missing.length === 0 && blockers.length === 0

    return { ready, missing, blockers, milestones }
  }, [ssot, tripId])

  if (!ssot) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-sm text-muted-foreground">
        Load SSOT for readiness
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-accent/20 bg-card/60 p-4" data-testid="readiness-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Next Trip Readiness
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            readiness.ready ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'
          }`}
          data-testid="readiness-badge"
        >
          {readiness.ready ? 'Ready' : 'Not Ready'}
        </span>
      </div>
      {readiness.milestones.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground">Upcoming milestones</div>
          <ul className="mt-1 space-y-0.5 text-xs">
            {readiness.milestones.slice(0, 5).map((m) => (
              <li key={m.name}>
                {m.name}: {m.planned_ts.slice(0, 16)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {readiness.missing.length > 0 && (
        <div>
          <div className="text-xs font-medium text-red-600">Missing evidence</div>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {readiness.missing.slice(0, 5).map((m, i) => (
              <li key={`${m.activityId}-${m.evidenceType}-${i}`}>
                {m.activityId}: {m.evidenceType} ({m.stage})
              </li>
            ))}
          </ul>
        </div>
      )}
      {readiness.blockers.length > 0 && (
        <div>
          <div className="text-xs font-medium text-amber-600">Blockers</div>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {readiness.blockers.slice(0, 5).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
