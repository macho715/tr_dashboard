// lib/ops/agi-schedule/pipeline-runner.ts
import type { OpsAuditEntry, OpsCommand, OpsState } from "./types";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data";
import { computeDeltaDays, shiftScheduleAfterPivot } from "./shift";
import { evaluateGoNoGo } from "./go-no-go";
import { runPipelineCheck } from "./pipeline-check";

function nowIso(): string {
  return new Date().toISOString();
}

export function runAgiOpsPipeline(params: {
  activities: ScheduleActivity[];
  ops: OpsState;
  command: OpsCommand;
  projectEndDate?: string;
}): {
  nextActivities: ScheduleActivity[];
  nextOps: OpsState;
  ganttRows: ReturnType<typeof scheduleActivitiesToGanttRows>;
  audit?: OpsAuditEntry;
} {
  let nextActivities = params.activities;
  let nextOps: OpsState = params.ops;

  const audit: OpsAuditEntry[] = [];

  if (params.command.kind === "SHIFT") {
    const delta =
      params.command.deltaDays ??
      (params.command.newDate ? computeDeltaDays(params.command.pivotDate, params.command.newDate) : 0);

    nextActivities = shiftScheduleAfterPivot({
      activities: nextActivities,
      pivotDate: params.command.pivotDate,
      deltaDays: delta,
      includeLocked: params.command.includeLocked,
    });

    audit.push({
      ts: nowIso(),
      command: "SHIFT",
      summary: `Shift after ${params.command.pivotDate} by ${delta} days`,
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (params.command.kind === "NOTICE") {
    nextOps = {
      ...nextOps,
      notice: {
        date: params.command.date,
        text: params.command.clear ? "" : (params.command.text ?? nextOps.notice.text),
      },
    };
    audit.push({
      ts: nowIso(),
      command: "NOTICE",
      summary: `Notice date=${params.command.date}, len=${(params.command.text ?? "").length}`,
    });
  } else {
    nextOps = {
      ...nextOps,
      notice: {
        ...nextOps.notice,
        date: today,
      },
    };
  }

  if (params.command.kind === "WEATHER_REFRESH") {
    const offshore = params.command.mode === "MANUAL" ? params.command.offshoreText : nextOps.weather.offshoreSummary;
    const days = nextOps.weather.days.slice(0, 4);

    nextOps = {
      ...nextOps,
      weather: {
        ...nextOps.weather,
        lastUpdated: nowIso(),
        offshoreSummary: offshore,
        days,
      },
    };

    audit.push({
      ts: nowIso(),
      command: "WEATHER_REFRESH",
      summary: `Weather refreshed: mode=${params.command.mode ?? "AUTO"}`,
    });
  } else {
    nextOps = {
      ...nextOps,
      weather: { ...nextOps.weather, lastUpdated: nowIso() },
    };
  }

  const pipeline = runPipelineCheck({
    activities: nextActivities,
    noticeDate: nextOps.notice.date,
    weatherDaysCount: nextOps.weather.days.length,
    projectEndDate: params.projectEndDate,
  });

  nextOps = { ...nextOps, pipeline };

  if (params.command.kind === "GO_NO_GO") {
    nextOps = { ...nextOps, goNoGo: evaluateGoNoGo(params.command) };
    audit.push({
      ts: nowIso(),
      command: "GO_NO_GO",
      summary: `wave=${params.command.waveFt}ft wind=${params.command.windKt}kt`,
    });
  }

  const ganttRows = scheduleActivitiesToGanttRows(nextActivities);

  return {
    nextActivities,
    nextOps,
    ganttRows,
    audit: audit[audit.length - 1],
  };
}

// Fixed values for SSR hydration - must be deterministic (no Date.now/new Date)
const SSR_FIXED_DATE = "2026-01-31";
const SSR_FIXED_LAST_UPDATED = "2026-01-31T12:00:00.000Z";
const SSR_FIXED_DAYS: Array<{ date: `${number}-${number}-${number}`; summary: string }> = [
  { date: "2026-01-31", summary: "Day 1 forecast" },
  { date: "2026-02-01", summary: "Day 2 forecast" },
  { date: "2026-02-02", summary: "Day 3 forecast" },
  { date: "2026-02-03", summary: "Day 4 forecast" },
];

export function createDefaultOpsState(params?: {
  activities?: ScheduleActivity[];
  projectEndDate?: string;
}): OpsState {
  const today = SSR_FIXED_DATE as `${number}-${number}-${number}`;
  const days = SSR_FIXED_DAYS;

  const base: OpsState = {
    notice: { date: today, text: "" },
    weather: {
      lastUpdated: SSR_FIXED_LAST_UPDATED,
      locationLabel: "Mina Zayed Port",
      days,
    },
    pipeline: [],
  };

  if (params?.activities && params.activities.length > 0) {
    base.pipeline = runPipelineCheck({
      activities: params.activities,
      noticeDate: today,
      weatherDaysCount: 4,
      projectEndDate: params.projectEndDate,
    });
  }

  return base;
}
