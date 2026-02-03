/**
 * Baseline comparison (patch.md §5, Phase 9 T9.4)
 * Compare current plan vs baseline.snapshot, highlight drifts.
 */
import type { ScheduleActivity } from "@/lib/ssot/schedule"
import type { Baseline } from "./types"

export interface DriftItem {
  activityId: string
  field: "start" | "end"
  baselineValue: string
  currentValue: string
}

export interface BaselineCompareResult {
  driftCount: number
  drifts: DriftItem[]
}

function toDateStr(iso: string): string {
  return iso.split("T")[0]
}

/**
 * Compare current activities vs baseline snapshot.
 * Returns drift count and list of drifted fields.
 */
export function compareWithBaseline(
  activities: ScheduleActivity[],
  baseline: Baseline
): BaselineCompareResult {
  const drifts: DriftItem[] = []
  const snapshot = baseline.snapshot?.entities?.activities_plan
  if (!snapshot) return { driftCount: 0, drifts }

  for (const act of activities) {
    if (!act.activity_id) continue
    const snap = snapshot[act.activity_id]
    if (!snap) continue

    const baselineStart = toDateStr(snap.start_ts)
    const baselineEnd = toDateStr(snap.end_ts)
    const currentStart = act.planned_start
    const currentEnd = act.planned_finish

    if (baselineStart !== currentStart) {
      drifts.push({
        activityId: act.activity_id,
        field: "start",
        baselineValue: baselineStart,
        currentValue: currentStart,
      })
    }
    if (baselineEnd !== currentEnd) {
      drifts.push({
        activityId: act.activity_id,
        field: "end",
        baselineValue: baselineEnd,
        currentValue: currentEnd,
      })
    }
  }

  return { driftCount: drifts.length, drifts }
}

// ============================================================================
// computeActivityDiff (patchm1 §4.1, patchm2 AC3)
// Diff classification: shift | add | remove | change
// ============================================================================

export type DiffKind = 'shift' | 'add' | 'remove' | 'change'

export interface ActivityDiffItem {
  activity_id: string
  name: string
  kind: DiffKind
  baseline_start: string | null
  baseline_end: string | null
  current_start: string | null
  current_end: string | null
  delta_minutes_start: number
  delta_minutes_end: number
  changed_fields: string[]
  collision_ids?: string[]
  constraint_flags?: string[]
}

interface ActivityWithPlan {
  activity_id: string
  title?: string
  name?: string
  plan?: { start_ts: string | null; end_ts: string | null }
  calc?: { collision_ids?: string[]; constraint_flags?: string[] }
}

function parseTs(ts: string | null): number {
  if (!ts) return 0
  return new Date(ts).getTime()
}

function diffMinutes(a: string | null, b: string | null): number {
  return Math.round((parseTs(a) - parseTs(b)) / 60000)
}

/**
 * Compute activity diff between baseline snapshot and current plan.
 * patchm1 §4.1: Activity ID, Baseline(start/end), Current(start/end), Δminutes, Changed fields
 */
export function computeActivityDiff(
  baselineSnapshot: {
    entities?: {
      activities_plan?: Record<string, { start_ts: string; end_ts: string }>;
      activities?: Record<string, { plan?: { start_ts?: string; end_ts?: string } }>;
    };
  } | null,
  currentActivities: Record<string, ActivityWithPlan> | ActivityWithPlan[]
): ActivityDiffItem[] {
  const items: ActivityDiffItem[] = []
  const snapshot = baselineSnapshot?.entities?.activities_plan ?? (baselineSnapshot as any)?.entities?.activities ?? {}
  const current = Array.isArray(currentActivities) ? Object.fromEntries(currentActivities.map((a) => [a.activity_id, a])) : currentActivities

  const baselineIds = new Set(Object.keys(snapshot))
  const currentIds = new Set(Object.keys(current))

  for (const activityId of new Set([...baselineIds, ...currentIds])) {
    const snap = snapshot[activityId]
    const act = current[activityId]
    const name = act?.title ?? act?.name ?? activityId

    if (!snap && act) {
      items.push({
        activity_id: activityId,
        name,
        kind: 'add',
        baseline_start: null,
        baseline_end: null,
        current_start: act.plan?.start_ts ?? null,
        current_end: act.plan?.end_ts ?? null,
        delta_minutes_start: 0,
        delta_minutes_end: 0,
        changed_fields: ['plan.start_ts', 'plan.end_ts'],
        collision_ids: act.calc?.collision_ids,
        constraint_flags: act.calc?.constraint_flags,
      })
      continue
    }
    if (snap && !act) {
      const snapPlan = (snap as any).plan ?? snap
      items.push({
        activity_id: activityId,
        name,
        kind: 'remove',
        baseline_start: snapPlan.start_ts ?? (snap as any).start_ts ?? null,
        baseline_end: snapPlan.end_ts ?? (snap as any).end_ts ?? null,
        current_start: null,
        current_end: null,
        delta_minutes_start: 0,
        delta_minutes_end: 0,
        changed_fields: [],
      })
      continue
    }
    if (!snap || !act) continue

    const snapPlan = (snap as any).plan ?? snap
    const baseStart = snapPlan.start_ts ?? (snap as any).start_ts ?? null
    const baseEnd = snapPlan.end_ts ?? (snap as any).end_ts ?? null
    const curStart = act.plan?.start_ts ?? null
    const curEnd = act.plan?.end_ts ?? null

    const deltaStart = diffMinutes(curStart, baseStart)
    const deltaEnd = diffMinutes(curEnd, baseEnd)
    const changedFields: string[] = []
    if (baseStart !== curStart) changedFields.push('plan.start_ts')
    if (baseEnd !== curEnd) changedFields.push('plan.end_ts')

    if (changedFields.length === 0) continue

    const kind: DiffKind = deltaStart !== 0 || deltaEnd !== 0 ? 'shift' : 'change'

    items.push({
      activity_id: activityId,
      name,
      kind,
      baseline_start: baseStart,
      baseline_end: baseEnd,
      current_start: curStart,
      current_end: curEnd,
      delta_minutes_start: deltaStart,
      delta_minutes_end: deltaEnd,
      changed_fields: changedFields,
      collision_ids: act.calc?.collision_ids,
      constraint_flags: act.calc?.constraint_flags,
    })
  }

  return items.sort((a, b) => a.activity_id.localeCompare(b.activity_id))
}
