/**
 * GANTTPATCH4: Schema smoke test — verify GanttContract schema validation
 * Run: pnpm schema:smoke
 */
import { assertGanttContract } from "../lib/gantt/contract.validate.runtime"

const sample = {
  kind: "gantt.event.v1",
  event_id: "00000000-0000-0000-0000-000000000000",
  occurred_at: "2026-02-07T12:00:00Z",
  trip_id: 1,
  event_type: "GANTT_READY",
  payload: { timeline_library: "vis-timeline" },
}

assertGanttContract(sample)
console.log("OK: GanttContract schema validation passed")
