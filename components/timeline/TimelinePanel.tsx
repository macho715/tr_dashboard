'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { TimelineGantt } from './GanttChart'
import type { OptionC, ReflowChange } from '@/src/types/ssot'
import { reflowPreview } from '@/src/lib/reflow/reflow-manager'

export interface TimelinePanelProps {
  focusTripId?: string
  selectedActivityId?: string | null
  onActivityClick?: (activityId: string) => void
  onCollisionClick?: (activityId: string, collisionIds: string[]) => void
}

/**
 * Timeline Panel - fetches SSOT and renders Gantt (Phase 6)
 * Uses /api/ssot for option_c.json data
 */
export function TimelinePanel({
  focusTripId,
  selectedActivityId,
  onActivityClick,
  onCollisionClick,
}: TimelinePanelProps) {
  const [ssot, setSsot] = useState<OptionC | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateCursor, setDateCursor] = useState<Date>(() => new Date())
  const [proposedChanges, setProposedChanges] = useState<ReflowChange[]>([])

  useEffect(() => {
    fetch('/api/ssot')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('SSOT not found'))))
      .then((data) => {
        setSsot(data)
        setError(null)
      })
      .catch((e) => {
        setError(e.message)
        setSsot(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!ssot || !dateCursor) return
    try {
      const result = reflowPreview(ssot, {
        reason: 'date_cursor_drag',
        cursor_ts: dateCursor.toISOString(),
        focus_trip_id: focusTripId
      })
      setProposedChanges(result.proposed_changes ?? [])
    } catch {
      setProposedChanges([])
    }
  }, [ssot, dateCursor, focusTripId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-slate-500">
        Loading timeline...
      </div>
    )
  }

  if (error || !ssot) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-amber-500">
        {error || 'SSOT not available. Add tests/fixtures/option_c_baseline.json or option_c.json'}
      </div>
    )
  }

  return (
    <TimelineGantt
      ssot={ssot}
      focusTripId={focusTripId}
      dateCursor={dateCursor}
      onDateCursorChange={setDateCursor}
      proposedChanges={proposedChanges}
      selectedActivityId={selectedActivityId}
      onActivityClick={onActivityClick}
      onCollisionClick={onCollisionClick}
    />
  )
}
