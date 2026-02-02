'use client'

import { useMemo } from 'react'
import type { OptionC, Activity, EvidenceRequired } from '@/src/types/ssot'
import { checkEvidenceGate } from '@/src/lib/state-machine/evidence-gate'
import { getActivitiesArray } from '@/src/lib/ssot-queries'

type EvidenceTabProps = {
  ssot: OptionC | null
  selectedActivityId?: string | null
  onUploadClick?: (activityId: string, evidenceType: string) => void
  canUpload?: boolean
}

function countMatchingEvidence(
  activity: Activity,
  evidenceType: string,
  ssot: OptionC
): number {
  let count = 0
  for (const id of activity.evidence_ids) {
    const item = ssot.entities.evidence_items[id]
    if (item && item.evidence_type === evidenceType) count++
  }
  return count
}

export function EvidenceTab({
  ssot,
  selectedActivityId = null,
  onUploadClick,
  canUpload = true,
}: EvidenceTabProps) {
  const checklist = useMemo(() => {
    if (!ssot) return []
    const activities = selectedActivityId
      ? [ssot.entities.activities[selectedActivityId]].filter(Boolean)
      : getActivitiesArray(ssot)
    const items: Array<{
      activityId: string
      activityTitle: string
      evidenceType: string
      stage: string
      minCount: number
      required: boolean
      attachedCount: number
      missing: boolean
      gateResult?: { allowed: boolean; missing: EvidenceRequired[] }
    }> = []
    for (const act of activities) {
      for (const req of act.evidence_required) {
        const attached = countMatchingEvidence(act, req.evidence_type, ssot)
        const missing = attached < req.min_count
        const gateResult = checkEvidenceGate(act, act.state, undefined, ssot)
        items.push({
          activityId: act.activity_id,
          activityTitle: act.title,
          evidenceType: req.evidence_type,
          stage: req.stage,
          minCount: req.min_count,
          required: req.required,
          attachedCount: attached,
          missing,
          gateResult,
        })
      }
    }
    return items
  }, [ssot, selectedActivityId])

  const missingCount = useMemo(
    () => checklist.filter((c) => c.missing && c.required).length,
    [checklist]
  )

  if (!ssot) {
    return (
      <div
        className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-sm text-muted-foreground"
        data-testid="evidence-tab-placeholder"
      >
        Load SSOT to display evidence
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="evidence-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Evidence checklist
        </span>
        {missingCount > 0 && (
          <span
            className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-600"
            data-testid="evidence-missing-badge"
          >
            {missingCount} missing
          </span>
        )}
      </div>
      <div className="max-h-[240px] overflow-y-auto rounded-lg border border-accent/20 bg-background/50">
        {checklist.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No evidence required
          </div>
        ) : (
          <ul className="divide-y divide-accent/10">
            {checklist.map((item, idx) => (
              <li
                key={`${item.activityId}-${item.evidenceType}-${idx}`}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                data-testid={`evidence-item-${item.activityId}-${item.evidenceType}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{item.activityTitle}</div>
                  <div className="text-muted-foreground">
                    {item.evidenceType} ({item.stage}) · {item.attachedCount}/{item.minCount}
                  </div>
                  {item.missing && item.required && (
                    <div
                      className="mt-0.5 text-red-600"
                      data-testid="evidence-gate-warning"
                      title={
                        item.gateResult?.missing?.length
                          ? `READY→IN_PROGRESS blocked: ${item.gateResult.missing[0]?.stage} evidence missing`
                          : undefined
                      }
                    >
                      Missing: {item.evidenceType}
                    </div>
                  )}
                </div>
                {canUpload && (
                  <button
                    type="button"
                    onClick={() => onUploadClick?.(item.activityId, item.evidenceType)}
                    className="shrink-0 rounded border border-accent/30 px-2 py-1 text-xs hover:bg-accent/10"
                  >
                    Upload
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
