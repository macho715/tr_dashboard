// lib/ops/agi/exporters.ts
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { ChangeRow } from "./types";

export function makePatchJSON(params: {
  changes: ChangeRow[];
  afterById: Map<string, ScheduleActivity>;
}) {
  return {
    generatedAt: new Date().toISOString(),
    changes: params.changes.map((c) => {
      const a = params.afterById.get(c.activityId);
      return {
        activity_id: c.activityId,
        activity_name: c.name,
        planned_start: c.afterStart,
        planned_finish: c.afterFinish,
        duration: a?.duration,
        is_locked: a?.is_locked ?? c.isLocked,
        constraint: a?.constraint,
        resource_tags: a?.resource_tags,
        voyage_id: a?.voyage_id ?? c.voyageId,
        milestone_id: a?.milestone_id ?? c.milestoneId,
      };
    }),
  };
}

export function makeFullJSON(activities: ScheduleActivity[]) {
  return {
    generatedAt: new Date().toISOString(),
    activities,
  };
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
