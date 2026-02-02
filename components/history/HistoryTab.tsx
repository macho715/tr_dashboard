'use client'

import { useMemo } from 'react'
import type { OptionC, HistoryEvent } from '@/src/types/ssot'

const EVENT_TYPE_LABELS: Record<string, string> = {
  plan_changed: 'Plan changed',
  actual_changed: 'Actual changed',
  state_transition: 'State transition',
  blocker_changed: 'Blocker changed',
  evidence_changed: 'Evidence changed',
  reflow_previewed: 'Reflow previewed',
  reflow_applied: 'Reflow applied',
  collision_opened: 'Collision opened',
  baseline_created: 'Baseline created',
  baseline_activated: 'Baseline activated',
}

type HistoryTabProps = {
  ssot: OptionC | null
  filterEventType?: string | null
  selectedActivityId?: string | null
}

export function HistoryTab({
  ssot,
  filterEventType = null,
  selectedActivityId = null,
}: HistoryTabProps) {
  const events = ssot?.history_events ?? []
  const filtered = useMemo(() => {
    let list = [...events].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    )
    if (filterEventType) {
      list = list.filter((e) => e.event_type === filterEventType)
    }
    if (selectedActivityId) {
      list = list.filter(
        (e) => e.entity_ref?.entity_type === 'activity' && e.entity_ref?.entity_id === selectedActivityId
      )
    }
    return list
  }, [events, filterEventType, selectedActivityId])

  const groupedByDate = useMemo(() => {
    const groups: Record<string, HistoryEvent[]> = {}
    for (const e of filtered) {
      const date = e.ts.slice(0, 10)
      if (!groups[date]) groups[date] = []
      groups[date].push(e)
    }
    return groups
  }, [filtered])

  if (!ssot) {
    return (
      <div
        className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-sm text-muted-foreground"
        data-testid="history-tab-placeholder"
      >
        Load SSOT to display history
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="history-tab">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        History (append-only)
      </div>
      <div className="max-h-[240px] overflow-y-auto rounded-lg border border-accent/20 bg-background/50">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No events
          </div>
        ) : (
          <ul className="divide-y divide-accent/10">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .flatMap(([date, evts]) =>
                evts.map((e) => (
                  <li
                    key={e.event_id}
                    className="px-3 py-2 text-xs"
                    data-testid={`history-event-${e.event_id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-muted-foreground">
                        {e.ts.slice(11, 16)}
                      </span>
                      <span className="font-medium">
                        {EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}
                      </span>
                    </div>
                    <div className="mt-0.5 text-muted-foreground">
                      {e.actor} · {e.entity_ref?.entity_type}:{e.entity_ref?.entity_id}
                    </div>
                  </li>
                ))
              )}
          </ul>
        )}
      </div>
    </div>
  )
}
