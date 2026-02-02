'use client'

import { useEffect, useState, useCallback } from 'react'
import { HistoryTab } from './HistoryTab'
import { EvidenceTab } from '@/components/evidence/EvidenceTab'
import { CompareDiffPanel } from '@/components/compare/CompareDiffPanel'
import { TripCloseoutForm } from '@/components/history/TripCloseoutForm'
import type { OptionC } from '@/src/types/ssot'
import { getHistoryEvents, getEvidenceItems, appendHistoryEvent, appendEvidenceItem, subscribe } from '@/lib/store/trip-store'

type HistoryEvidencePanelProps = {
  selectedActivityId?: string | null
  filterEventType?: string | null
}

export function HistoryEvidencePanel({
  selectedActivityId = null,
  filterEventType = null,
}: HistoryEvidencePanelProps) {
  const [ssot, setSsot] = useState<OptionC | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'evidence' | 'compare' | 'closeout'>('history')
  const [storeVersion, setStoreVersion] = useState(0)

  useEffect(() => {
    fetch('/api/ssot')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OptionC | null) => setSsot(data))
      .catch(() => setSsot(null))
  }, [])

  useEffect(() => {
    const unsub = subscribe(() => setStoreVersion((v) => v + 1))
    return unsub
  }, [])

  const mergedSsot = ssot
    ? {
        ...ssot,
        history_events: [...(ssot.history_events ?? []), ...getHistoryEvents()].sort(
          (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
        ),
        entities: {
          ...ssot.entities,
          evidence_items: {
            ...(ssot.entities?.evidence_items ?? {}),
            ...Object.fromEntries(getEvidenceItems().map((e) => [e.evidence_id, e])),
          },
        },
      }
    : null

  const onAddHistory = useCallback(
    (eventType: string, message: string) => {
      appendHistoryEvent({
        event_type: eventType,
        message,
        activity_id: selectedActivityId ?? undefined,
        trip_id: ssot?.entities?.trips ? Object.keys(ssot.entities.trips)[0] : undefined,
      })
    },
    [selectedActivityId, ssot]
  )

  const onAddEvidence = useCallback(
    (item: { uri: string; evidence_type: string; title?: string; activityId: string; tripId?: string; trId?: string }) => {
      appendEvidenceItem({
        ...item,
        linked_to: {
          activity_id: item.activityId,
          trip_id: item.tripId,
          tr_id: item.trId,
        },
      })
    },
    []
  )

  return (
    <div
      className="space-y-3 rounded-lg border border-accent/20 bg-card/60 p-4"
      data-testid="history-evidence-panel"
    >
      <div className="flex gap-2 border-b border-accent/20 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            activeTab === 'history'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent/10'
          }`}
          data-testid="tab-history"
        >
          History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('evidence')}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            activeTab === 'evidence'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent/10'
          }`}
          data-testid="tab-evidence"
        >
          Evidence
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compare')}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            activeTab === 'compare'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent/10'
          }`}
          data-testid="tab-compare-diff"
        >
          Compare Diff
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('closeout')}
          className={`rounded px-2 py-1 text-xs font-medium transition ${
            activeTab === 'closeout'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent/10'
          }`}
          data-testid="tab-closeout"
        >
          Trip Closeout
        </button>
      </div>
      {activeTab === 'history' && (
        <HistoryTab
          ssot={mergedSsot}
          filterEventType={filterEventType}
          selectedActivityId={selectedActivityId}
          onAddEvent={onAddHistory}
          canAdd={true}
        />
      )}
      {activeTab === 'evidence' && (
        <EvidenceTab
          ssot={mergedSsot}
          selectedActivityId={selectedActivityId}
          onAddEvidence={onAddEvidence}
          canAddEvidence={true}
        />
      )}
      {activeTab === 'compare' && (
        <CompareDiffPanel
          ssot={mergedSsot}
          baselineId={ssot?.baselines?.current_baseline_id ?? null}
        />
      )}
      {activeTab === 'closeout' && (
        <TripCloseoutForm ssot={mergedSsot} />
      )}
    </div>
  )
}
