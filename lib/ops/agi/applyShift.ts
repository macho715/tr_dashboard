// lib/ops/agi/applyShift.ts
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { addUTCDays, calculateFinishDate, parseUTCDate, diffUTCDays } from "@/lib/ssot/schedule";
import type { IsoDate } from "./types";

function fmtIsoUTC(d: Date): IsoDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` as IsoDate;
}

export function computeDeltaByNewDate(pivot: IsoDate, newDate: IsoDate): number {
  return diffUTCDays(pivot, newDate);
}

export function shiftAfterPivot(params: {
  activities: ScheduleActivity[];
  pivot: IsoDate;
  deltaDays: number;
  includeLocked: boolean;
}): ScheduleActivity[] {
  const { activities, pivot, deltaDays, includeLocked } = params;

  return activities.map((a) => {
    if (a.is_locked && !includeLocked) return a;
    if (a.planned_start < pivot) return a; // pivot 이상만 이동(>=)

    const shiftedStart = fmtIsoUTC(addUTCDays(parseUTCDate(a.planned_start), deltaDays));
    const shiftedFinish = calculateFinishDate(shiftedStart, a.duration);

    return { ...a, planned_start: shiftedStart, planned_finish: shiftedFinish };
  });
}

export function applyBulkAnchors(params: {
  activities: ScheduleActivity[];
  anchors: Array<{ activityId: string; newStart: IsoDate }>;
  includeLocked: boolean;
}): ScheduleActivity[] {
  // 정책: anchors 순차 적용(누적)
  let next = params.activities;

  for (const a of params.anchors) {
    // activityId가 "pivot 역할"을 한다고 가정: 해당 activity의 planned_start를 newStart로 맞추고,
    // 그 이후(>=pivotDate) 전체를 delta만큼 시프트
    const pivotAct = next.find((x) => (x.activity_id ?? "") === a.activityId);
    if (!pivotAct) continue;

    const pivot = pivotAct.planned_start as IsoDate;
    const deltaDays = diffUTCDays(pivot, a.newStart);
    next = shiftAfterPivot({
      activities: next,
      pivot,
      deltaDays,
      includeLocked: params.includeLocked,
    });
  }

  return next;
}
