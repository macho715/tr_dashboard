// lib/ops/agi-schedule/shift.ts
import type { IsoDate } from "./types";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { addUTCDays, calculateFinishDate, diffUTCDays, parseUTCDate } from "@/lib/ssot/schedule";

function formatUTCDate(d: Date): IsoDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` as IsoDate;
}

export function computeDeltaDays(pivotDate: IsoDate, newDate: IsoDate): number {
  return diffUTCDays(pivotDate, newDate);
}

export function shiftScheduleAfterPivot(params: {
  activities: ScheduleActivity[];
  pivotDate: IsoDate;
  deltaDays: number;
  includeLocked?: boolean;
}): ScheduleActivity[] {
  const { activities, pivotDate, deltaDays } = params;
  const includeLocked = params.includeLocked ?? false;

  return activities.map((a) => {
    const isLocked = Boolean(a.is_locked);
    if (isLocked && !includeLocked) return a;

    if (a.planned_start < pivotDate) return a;

    const shiftedStart = formatUTCDate(addUTCDays(parseUTCDate(a.planned_start), deltaDays));
    const shiftedFinish = calculateFinishDate(shiftedStart, a.duration);

    return {
      ...a,
      planned_start: shiftedStart,
      planned_finish: shiftedFinish,
    };
  });
}
