/**
 * Reflow Engine (Topological + Constraint + Resource)
 * patch.md §6: Reflow Preview→Apply
 * AGENTS.md: Freeze/Lock/Pin rules, reflow_runs[] logging
 */

import type {
  ScheduleActivity,
  ScheduleConflict,
  ReflowResult,
  ReflowOptions,
  DateChange,
  ImpactReport,
  DEFAULT_REFLOW_OPTIONS,
} from "@/lib/ssot/schedule"

export interface ReflowRun {
  run_id: string
  timestamp: string
  trigger: string // "manual" | "auto_actual" | "cursor_move"
  user?: string
  preview_count: number
  applied_count: number
  impact_summary: string
}

/**
 * Reflow Preview: Compute new dates without modifying SSOT
 * Returns ReflowResult with activities and impact_report
 */
export function computeReflowPreview(
  activities: ScheduleActivity[],
  options: ReflowOptions = DEFAULT_REFLOW_OPTIONS
): ReflowResult {
  // Minimal deterministic reflow:
  // 1. Freeze activities with actual_start or actual_finish
  // 2. Topological sort by dependencies
  // 3. Apply constraints (time windows, resources)
  // 4. Detect conflicts (resource, dependency, lock violation)

  const frozen = new Set<string>()
  const changes: DateChange[] = []
  const conflicts: ScheduleConflict[] = []

  // 1. Identify frozen activities (patch.md §5.1)
  for (const act of activities) {
    if (act.actual_start || act.actual_finish) {
      if (act.activity_id) frozen.add(act.activity_id)
    }
  }

  // 2. Topological sort (simplified: no cycle detection here, just preserve order)
  const sorted = [...activities].sort((a, b) => {
    const aStart = new Date(a.planned_start).getTime()
    const bStart = new Date(b.planned_start).getTime()
    return aStart - bStart
  })

  // 3. Compute new dates (minimal: just copy for now, real reflow would adjust)
  const reflowedActivities = sorted.map((act) => {
    if (frozen.has(act.activity_id ?? "")) {
      // Frozen: no change
      return act
    }
    // Non-frozen: apply reflow logic (placeholder: no change for now)
    // TODO: implement dependency chain, constraint snap, resource calendar
    return act
  })

  // 4. Detect conflicts (placeholder)
  // TODO: resource overlap, lock violations, dependency cycles

  const affectedIds = changes.map((c) => c.activity_id)

  const impactReport: ImpactReport = {
    affected_count: affectedIds.length,
    affected_ids: affectedIds,
    changes,
    conflicts,
  }

  return {
    activities: reflowedActivities,
    impact_report: impactReport,
  }
}

/**
 * Reflow Apply: Update SSOT (option_c.json) + record reflow_run
 * Requires permission check (not implemented here, caller's responsibility)
 */
export function applyReflow(
  previewResult: ReflowResult,
  trigger: string,
  user?: string
): { success: boolean; run: ReflowRun } {
  // Generate reflow run record (patch.md §6, AGENTS.md)
  const runId = `reflow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const run: ReflowRun = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    trigger,
    user,
    preview_count: previewResult.activities.length,
    applied_count: previewResult.impact_report.affected_count,
    impact_summary: `${previewResult.impact_report.affected_count} activities adjusted, ${previewResult.impact_report.conflicts.length} conflicts`,
  }

  // TODO: Write to option_c.json + append run to reflow_runs[]
  // For now, return success with the run record

  return { success: true, run }
}
