/**
 * Schedule Reflow Engine
 *
 * Anchor-based schedule recalculation. Uses applyBulkAnchors for shift propagation.
 * README: lib/utils/schedule-reflow.ts
 */

import type { ScheduleActivity, ReflowResult, ReflowOptions, ImpactReport, DateChange } from "@/lib/ssot/schedule";
import { diffUTCDays } from "@/lib/ssot/schedule";
import type { IsoDate } from "@/lib/ops/agi/types";
import { applyBulkAnchors } from "@/lib/ops/agi/applyShift";
import { buildChanges } from "@/lib/ops/agi/adapters";
import { detectResourceConflicts } from "./detect-resource-conflicts";

export function reflowSchedule(
  activities: ScheduleActivity[],
  anchorId: string,
  newStart: string,
  options?: ReflowOptions
): ReflowResult {
  const respectLocks = options?.respectLocks ?? true;
  const includeLocked = !respectLocks;

  const next = applyBulkAnchors({
    activities,
    anchors: [{ activityId: anchorId, newStart: newStart as IsoDate }],
    includeLocked,
  });

  const changes = buildChanges(activities, next);
  const conflicts = (options?.checkResourceConflicts !== false)
    ? detectResourceConflicts(next)
    : [];

  const dateChanges: DateChange[] = changes.map((c) => ({
    activity_id: c.activityId,
    old_start: c.beforeStart,
    new_start: c.afterStart,
    old_finish: c.beforeFinish,
    new_finish: c.afterFinish,
    delta_days: diffUTCDays(c.beforeStart, c.afterStart),
  }));

  const impact_report: ImpactReport = {
    affected_count: changes.length,
    affected_ids: changes.map((c) => c.activityId),
    changes: dateChanges,
    conflicts,
  };

  return { activities: next, impact_report };
}
