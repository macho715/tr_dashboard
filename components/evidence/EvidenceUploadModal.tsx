'use client'

import { useRef } from 'react'
import type { EvidenceItem } from '@/src/types/ssot'

type EvidenceUploadModalProps = {
  activityId: string
  activityTitle: string
  evidenceType: string
  onConfirm: (item: Omit<EvidenceItem, 'evidence_id'> & { evidence_id?: string }) => void
  onCancel: () => void
}

export function EvidenceUploadModal({
  activityId,
  activityTitle,
  evidenceType,
  onConfirm,
  onCancel,
}: EvidenceUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleConfirm = () => {
    const evidenceId = `EVI_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const item: EvidenceItem = {
      evidence_id: evidenceId,
      evidence_type: evidenceType,
      title: `Uploaded: ${evidenceType}`,
      uri: 'dms://uploaded/' + evidenceId,
      captured_at: new Date().toISOString(),
      captured_by: 'user:upload',
      tags: [evidenceType],
    }
    onConfirm(item)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="evidence-upload-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-upload-title"
    >
      <div className="w-full max-w-sm rounded-lg border border-accent/30 bg-card p-4 shadow-lg">
        <h2 id="evidence-upload-title" className="mb-3 text-sm font-semibold">
          Add Evidence
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          <span className="font-medium">{activityTitle}</span>
          <br />
          Type: {evidenceType}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="mb-3 hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          aria-label="Select evidence file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              // File selected - could upload to server; for now we simulate
              handleConfirm()
            }
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded border border-accent/30 px-3 py-2 text-xs font-medium hover:bg-accent/10"
          >
            Select file
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            data-testid="evidence-upload-confirm"
          >
            Add (simulate)
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-accent/30 px-3 py-2 text-xs hover:bg-accent/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
