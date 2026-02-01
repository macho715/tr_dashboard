// lib/ops/agi-schedule/pipeline-check.ts
import type { PipelineCheckItem } from "./types";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { calculateFinishDate } from "@/lib/ssot/schedule";
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts";

export function runPipelineCheck(params: {
  activities: ScheduleActivity[];
  noticeDate: string;
  weatherDaysCount: number;
  projectEndDate?: string;
}): PipelineCheckItem[] {
  const out: PipelineCheckItem[] = [];

  const today = new Date().toISOString().slice(0, 10);

  out.push({
    id: "NOTICE_DATE",
    title: "Operational Notice date is updated",
    status: params.noticeDate === today ? "PASS" : "WARN",
    detail:
      params.noticeDate === today
        ? "Notice date matches today."
        : `Notice date=${params.noticeDate}, today=${today}`,
  });

  out.push({
    id: "WEATHER_4DAY",
    title: "Weather & Marine Risk includes 4-day forecast",
    status: params.weatherDaysCount >= 4 ? "PASS" : "FAIL",
    detail: `days=${params.weatherDaysCount}`,
  });

  const bad = params.activities.filter(
    (a) => calculateFinishDate(a.planned_start, a.duration) !== a.planned_finish
  );
  out.push({
    id: "SCHEDULE_INVARIANTS",
    title: "Schedule invariants (finish = start + duration)",
    status: bad.length === 0 ? "PASS" : "WARN",
    detail: bad.length === 0 ? "OK" : `${bad.length} activities have inconsistent finish.`,
  });

  const conflicts = detectResourceConflicts(params.activities);
  out.push({
    id: "RESOURCE_CONFLICTS",
    title: "Resource conflicts",
    status: conflicts.length === 0 ? "PASS" : "WARN",
    detail: conflicts.length === 0 ? "No conflicts." : `${conflicts.length} conflicts detected.`,
  });

  if (params.projectEndDate) {
    const end = new Date(params.projectEndDate).getTime();
    const now = new Date(today).getTime();
    const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    out.push({
      id: "KPI_TOTAL_DAYS",
      title: "KPI Total Days is computable",
      status: Number.isFinite(days) ? "PASS" : "FAIL",
      detail: `Total Days ≈ ${days}`,
    });
  } else {
    out.push({
      id: "KPI_TOTAL_DAYS",
      title: "KPI Total Days is computable",
      status: "WARN",
      detail: "projectEndDate not configured.",
    });
  }

  out.push({
    id: "KPI_SPMT_SET",
    title: "KPI SPMT Set = 1",
    status: "PASS",
    detail: "Fixed to 1 by ops rule.",
  });

  return out;
}
