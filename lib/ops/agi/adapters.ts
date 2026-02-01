// lib/ops/agi/adapters.ts
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { normalizeActivityId } from "@/lib/ssot/schedule";
import type { ChangeRow, IsoDate } from "./types";

export function buildChanges(before: ScheduleActivity[], after: ScheduleActivity[]): ChangeRow[] {
  const beforeMap = new Map<string, ScheduleActivity>();
  for (const a of before) {
    const id = normalizeActivityId(a);
    beforeMap.set(id, a);
  }

  const changes: ChangeRow[] = [];
  for (const a of after) {
    const id = normalizeActivityId(a);
    const b = beforeMap.get(id);
    if (!b) continue;

    if (b.planned_start !== a.planned_start || b.planned_finish !== a.planned_finish) {
      changes.push({
        activityId: id,
        name: a.activity_name,
        beforeStart: b.planned_start,
        afterStart: a.planned_start,
        beforeFinish: b.planned_finish,
        afterFinish: a.planned_finish,
        voyageId: a.voyage_id,
        milestoneId: a.milestone_id,
        isLocked: a.is_locked,
      });
    }
  }
  return changes;
}

export function isIsoDate(v: string): v is IsoDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
