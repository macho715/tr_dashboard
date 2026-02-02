/**
 * Client-side Trip Store (patchm2 §3 Option A)
 * localStorage-based append-only persistence for History/Evidence
 * Vercel: no server file write — client persistence only
 */

import type { HistoryEvent, EvidenceItem } from '@/src/types/ssot'

const STORAGE_KEY_HISTORY = 'tr-dashboard-history-events'
const STORAGE_KEY_EVIDENCE = 'tr-dashboard-evidence-items'

type Listener = () => void
const listeners: Set<Listener> = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

function loadHistoryEvents(): HistoryEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY)
    if (!raw) return []
    const arr = JSON.parse(raw) as HistoryEvent[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function loadEvidenceItems(): EvidenceItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVIDENCE)
    if (!raw) return []
    const arr = JSON.parse(raw) as EvidenceItem[]
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function getHistoryEvents(): HistoryEvent[] {
  return loadHistoryEvents()
}

export function appendHistoryEvent(
  event: Partial<HistoryEvent> & { event_type: string; actor?: string; message?: string; trip_id?: string; activity_id?: string }
): HistoryEvent {
  const targetId = event.activity_id ?? event.trip_id ?? ''
  const full: HistoryEvent = {
    event_id: event.event_id ?? `HE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: event.ts ?? new Date().toISOString(),
    actor: event.actor ?? 'user',
    event_type: event.event_type,
    entity_ref: event.entity_ref ?? { entity_type: event.activity_id ? 'activity' : 'trip', entity_id: targetId },
    details: event.details ?? (event.message ? { message: event.message } : {}),
  }
  const events = [...loadHistoryEvents(), full]
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(events))
    notify()
  }
  return full
}

export function getEvidenceItems(): EvidenceItem[] {
  return loadEvidenceItems()
}

export function appendEvidenceItem(
  item: Partial<EvidenceItem> & { uri: string; evidence_type: string; title?: string }
): EvidenceItem {
  const full: EvidenceItem = {
    evidence_id: item.evidence_id ?? `EV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    evidence_type: item.evidence_type,
    title: item.title ?? item.evidence_type,
    uri: item.uri,
    captured_at: item.captured_at ?? new Date().toISOString(),
    captured_by: item.captured_by ?? 'user',
    tags: item.tags ?? [item.evidence_type],
    ...(item.linked_to && { linked_to: item.linked_to }),
  }
  const items = [...loadEvidenceItems(), full]
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_EVIDENCE, JSON.stringify(items))
    notify()
  }
  return full
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
