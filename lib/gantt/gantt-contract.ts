/**
 * GANTTPATCH2/4 — Gantt Props/State/Events
 * GANTTPATCH4: GanttEventBase from contract.types (schema-derived)
 * Legacy types kept for backward compat; new code may use contract.types
 */
import type { GanttEvent } from "./contract.types"

export type TripId = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type DateCursorAnchor = "LOCAL_MIDDAY" | "LOCAL_START_OF_DAY" | "LOCAL_END_OF_DAY"

export interface DateCursor {
  date: string // YYYY-MM-DD
  timezone: string // IANA e.g. "UTC"
  anchor: DateCursorAnchor
  label?: string
}

export interface TimelineWindow {
  start: string // ISO date-time
  end: string
}

export type RenderMode = "CURRENT_PLAN" | "COMPARE_PLANS" | "READONLY"

export interface VisGroupContract {
  id: string
  content: string
  order?: number
  className?: string
}

export interface VisItemMeta {
  trip_id?: TripId
  activity_id?: string
  layer?: "CURRENT" | "BASELINE" | "ACTUAL"
  deps?: string[]
  resource?: string
  diff_tags?: string[]
}

export interface VisItemContract {
  id: string
  group: string
  content: string
  start: string // ISO date-time
  end: string
  type: "range"
  className?: string
  title?: string
  meta?: VisItemMeta
}

export interface RendererOptions {
  stack?: boolean
  selectable?: boolean
  editable?: { enable_drag?: boolean; enable_resize?: boolean }
  show_selected_date_bar?: boolean
  show_today_marker?: boolean
}

export interface TripContext {
  trip_id: TripId
  tr_id: string
  status: "PLANNED" | "IN_PROGRESS" | "DONE"
}

/** GANTTPATCH4: Alias for schema-derived GanttEvent */
export type GanttEventBase = GanttEvent

export interface PayloadItemSelected {
  item_id: string
  activity_id?: string
  group_id?: string
}

export interface PayloadGanttReady {
  component_id?: string
  timeline_library?: "vis-timeline"
}

/** Create ITEM_SELECTED event (GANTTPATCH2) */
export function createItemSelectedEvent(
  itemId: string,
  tripId: TripId = 1,
  activityId?: string,
  groupId?: string
): GanttEventBase {
  return {
    kind: "gantt.event.v1",
    event_id: crypto.randomUUID?.() ?? `evt-${Date.now()}`,
    occurred_at: new Date().toISOString(),
    trip_id: tripId,
    event_type: "ITEM_SELECTED",
    payload: { item_id: itemId, activity_id: activityId, group_id: groupId },
  }
}

/** Create GANTT_READY event */
export function createGanttReadyEvent(tripId: TripId = 1): GanttEventBase {
  return {
    kind: "gantt.event.v1",
    event_id: crypto.randomUUID?.() ?? `evt-${Date.now()}`,
    occurred_at: new Date().toISOString(),
    trip_id: tripId,
    event_type: "GANTT_READY",
    payload: { timeline_library: "vis-timeline" },
  }
}

/** Create DateCursor from Date (UTC noon) */
export function dateToDateCursor(d: Date, timezone = "UTC"): DateCursor {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return {
    date: `${y}-${m}-${day}`,
    timezone,
    anchor: "LOCAL_MIDDAY",
    label: `Selected Date (${y}-${m}-${day} UTC)`,
  }
}
