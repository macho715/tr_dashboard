'use client'

import { useEffect, useState, useCallback } from 'react'
import { HistoryTab } from './HistoryTab'
import { EvidenceTab, type EvidenceOverlayItem } from '@/components/evidence/EvidenceTab'
import { EvidenceUploadModal } from '@/components/evidence/EvidenceUploadModal'
import type { OptionC, EvidenceItem } from '@/src/types/ssot'
import { useViewModeOptional } from '@/src/lib/stores/view-mode-store'

type HistoryEvidencePanelProps = {
  selectedActivityId?: string | null
  filterEventType?: string | null
  onUploadClick?: (activityId: string, evidenceType: string) => void
}

export function HistoryEvidencePanel({
  selectedActivityId = null,
  filterEventType = null,
  onUploadClick: onUploadClickProp,
}: HistoryEvidencePanelProps) {
  const [ssot, setSsot] = useState<OptionC | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'evidence'>('history')
  const [evidenceOverlay, setEvidenceOverlay] = useState<EvidenceOverlayItem[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalActivityId, setModalActivityId] = useState('')
  const [modalActivityTitle, setModalActivityTitle] = useState('')
  const [modalEvidenceType, setModalEvidenceType] = useState('')
  const viewMode = useViewModeOptional()
  const canUpload = viewMode?.canUploadEvidence ?? true

  const handleUploadClick = useCallback(
    (activityId: string, evidenceType: string) => {
      if (onUploadClickProp) {
        onUploadClickProp(activityId, evidenceType)
        return
      }
      const act = ssot?.entities?.activities?.[activityId]
      setModalActivityId(activityId)
      setModalActivityTitle(act?.title ?? activityId)
      setModalEvidenceType(evidenceType)
      setModalOpen(true)
    },
    [onUploadClickProp, ssot]
  )

  const handleEvidenceConfirm = useCallback((item: EvidenceItem) => {
    setEvidenceOverlay((prev) => [
      ...prev,
      {
        activityId: modalActivityId,
        evidenceType: item.evidence_type,
        evidenceId: item.evidence_id,
      },
    ])
    setModalOpen(false)
  }, [modalActivityId])

  useEffect(() => {
    fetch('/api/ssot')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OptionC | null) => setSsot(data))
      .catch(() => setSsot(null))
  }, [])

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
      </div>
      {activeTab === 'history' && (
        <HistoryTab
          ssot={ssot}
          filterEventType={filterEventType}
          selectedActivityId={selectedActivityId}
        />
      )}
      {activeTab === 'evidence' && (
        <EvidenceTab
          ssot={ssot}
          selectedActivityId={selectedActivityId}
          onUploadClick={handleUploadClick}
          canUpload={canUpload}
          evidenceOverlay={evidenceOverlay}
        />
      )}
      {modalOpen && (
        <EvidenceUploadModal
          activityId={modalActivityId}
          activityTitle={modalActivityTitle}
          evidenceType={modalEvidenceType}
          onConfirm={handleEvidenceConfirm}
          onCancel={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
