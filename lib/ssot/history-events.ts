/**
 * History Event Rules (patch.md §5.2, AGENTS.md §6)
 * Append-only history, no deletion/modification
 */

export interface HistoryEvent {
  event_id: string
  timestamp: string
  activity_id: string
  event_type:
    | "state_change"
    | "plan_change"
    | "actual_change"
    | "evidence_added"
    | "collision_resolved"
    | "reflow_applied"
  user?: string
  changes?: Record<string, unknown> // Field diffs
  reason?: string
  evidence_refs?: string[]
}

/**
 * Append history event (append-only, no deletion/modification)
 * AGENTS.md §6: History append-only (삭제 금지, 정정은 별도 이벤트로)
 */
export function appendHistoryEvent(event: HistoryEvent): void {
  // TODO: Write to option_c.json history_events[] array
  // Append-only: never delete or modify existing events
  console.log("[SSOT] Appending history_event:", event)
}

/**
 * Validate history modification (must forbid deletion/editing)
 */
export function validateHistoryModification(
  operation: "delete" | "update"
): never {
  throw new Error(
    `[SSOT Violation] History ${operation} is forbidden. History is append-only (AGENTS.md §6).`
  )
}

/**
 * Retrieve history events for activity
 */
export function getHistoryEvents(activityId: string): HistoryEvent[] {
  // TODO: Read from option_c.json history_events[]
  // Placeholder: return empty array
  return []
}
