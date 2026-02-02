/**
 * History/Evidence tests (Phase 8 T8.4)
 *
 * - History events sorted by timestamp
 * - Evidence checklist shows missing items
 * - Evidence gate warnings
 */

import { describe, it, expect } from 'vitest'
import type { OptionC, HistoryEvent } from '@/types/ssot'
import { checkEvidenceGate } from '@/lib/state-machine/evidence-gate'

const minimalHistoryEvents: HistoryEvent[] = [
  {
    event_id: 'HE_001',
    ts: '2026-02-01T10:00:00+04:00',
    actor: 'user:pm',
    event_type: 'baseline_activated',
    entity_ref: { entity_type: 'baseline', entity_id: 'BASELINE_001' },
    details: {},
  },
  {
    event_id: 'HE_002',
    ts: '2026-02-01T12:30:00+04:00',
    actor: 'user:planner',
    event_type: 'reflow_previewed',
    entity_ref: { entity_type: 'reflow_run', entity_id: 'RUN_001' },
    details: {},
  },
]

const activityWithMissingEvidence = {
  activity_id: 'A1010',
  type_id: 'spmt_setup',
  trip_id: 'T1',
  tr_ids: ['TR_001'],
  title: 'SPMT Setup',
  state: 'ready',
  lock_level: 'none',
  blocker_code: null,
  evidence_required: [
    {
      evidence_type: 'spmt_checklist',
      stage: 'before_start',
      min_count: 1,
      required: true,
      validity_min: null,
      tags: ['spmt'],
    },
  ],
  evidence_ids: [],
  reflow_pins: [],
  plan: {} as any,
  actual: {} as any,
  calc: {} as any,
}

const activityWithEvidence = {
  ...activityWithMissingEvidence,
  evidence_ids: ['EVI_001'],
}

const ssotWithEvidence: OptionC = {
  contract: {} as any,
  constraint_rules: {} as any,
  activity_types: {},
  entities: {
    locations: {},
    resource_pools: {},
    resources: {},
    trs: {},
    trips: {},
    evidence_items: {
      EVI_001: {
        evidence_id: 'EVI_001',
        evidence_type: 'spmt_checklist',
        title: 'SPMT Checklist',
        uri: 'dms://evi/001',
        captured_at: '2026-02-01T08:00:00+04:00',
        captured_by: 'user:field',
        tags: [],
      },
    },
    activities: {},
  },
  collisions: {},
  reflow_runs: [],
  baselines: { current_baseline_id: null, items: {} },
  history_events: minimalHistoryEvents,
}

describe('history-evidence', () => {
  it('history events sorted by timestamp', () => {
    const sorted = [...minimalHistoryEvents].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    )
    expect(sorted[0].event_id).toBe('HE_002')
    expect(sorted[1].event_id).toBe('HE_001')
  })

  it('evidence checklist shows missing items', () => {
    const result = checkEvidenceGate(
      activityWithMissingEvidence as any,
      'in_progress',
      'ready',
      ssotWithEvidence
    )
    expect(result.allowed).toBe(false)
    expect(result.missing).toHaveLength(1)
    expect(result.missing[0].evidence_type).toBe('spmt_checklist')
    expect(result.blocker_code).toBeDefined()
  })

  it('evidence gate passes when evidence attached', () => {
    const result = checkEvidenceGate(
      activityWithEvidence as any,
      'in_progress',
      'ready',
      ssotWithEvidence
    )
    expect(result.allowed).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it('evidence gate returns blocker code for missing evidence', () => {
    const result = checkEvidenceGate(
      activityWithMissingEvidence as any,
      'in_progress',
      'ready',
      ssotWithEvidence
    )
    expect(result.blocker_code).toMatch(/EVIDENCE_MISSING/)
  })
})
