/**
 * GANTTPATCH4: TypeScript types from JSON Schema (json-schema-to-ts)
 * Source: schemas/gantt/contract.v1.ts
 */
import type { FromSchema } from "json-schema-to-ts"
import { GanttContractSchema } from "@/schemas/gantt/contract.v1"

/** Root union: GanttRendererProps | GanttRendererState | GanttEvent */
export type GanttContract = FromSchema<typeof GanttContractSchema>

/** Props for Gantt renderer (orchestrator → renderer) */
export type GanttRendererProps = Extract<
  GanttContract,
  { kind: "gantt.props.v1" }
>

/** State for Gantt renderer (restorable) */
export type GanttRendererState = Extract<
  GanttContract,
  { kind: "gantt.state.v1" }
>

/** Event from Gantt renderer (renderer → orchestrator) */
export type GanttEvent = Extract<GanttContract, { kind: "gantt.event.v1" }>

/** Event type discriminators */
export type GanttEvent_ItemSelected = Extract<
  GanttEvent,
  { event_type: "ITEM_SELECTED" }
>
export type GanttEvent_GanttReady = Extract<
  GanttEvent,
  { event_type: "GANTT_READY" }
>
export type GanttEvent_DateCursorChanged = Extract<
  GanttEvent,
  { event_type: "DATE_CURSOR_CHANGED" }
>
