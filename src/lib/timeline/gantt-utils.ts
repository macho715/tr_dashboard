/**
 * Gantt utilities for SSOT-based Timeline (Contract v0.8.0)
 */

import type { Activity, Trip, TR, OptionC } from '../types/ssot';
import { getActivitiesForTR } from '../ssot-loader';

export interface GanttRow {
  id: string;
  type: 'trip' | 'tr' | 'activity';
  label: string;
  level: number;
  activities: Activity[];
  tripId?: string;
  trId?: string;
}

export interface BarPosition {
  left: number;
  width: number;
}

/** Right edge % (left + width) */
export function barRight(pos: BarPosition): number {
  return pos.left + pos.width;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Build Gantt rows: Trip → TR → Activity hierarchy
 */
export function buildGanttRows(ssot: OptionC, focusTripId?: string): GanttRow[] {
  const rows: GanttRow[] = [];
  const tripIds = focusTripId
    ? [focusTripId]
    : Object.keys(ssot.entities.trips);

  for (const tripId of tripIds) {
    const trip = ssot.entities.trips[tripId];
    if (!trip) continue;

    rows.push({
      id: tripId,
      type: 'trip',
      label: trip.name || tripId,
      level: 0,
      activities: [],
      tripId
    });

    for (const trId of trip.tr_ids) {
      const tr = ssot.entities.trs[trId];
      if (!tr) continue;

      rows.push({
        id: trId,
        type: 'tr',
        label: tr.name || trId,
        level: 1,
        activities: [],
        tripId,
        trId
      });

      const activities = getActivitiesForTR(ssot, trId);
      for (const activity of activities) {
        rows.push({
          id: activity.activity_id,
          type: 'activity',
          label: activity.title || activity.activity_id,
          level: 2,
          activities: [activity],
          tripId,
          trId
        });
      }
    }
  }

  return rows;
}

/**
 * Calculate bar position (left %, width %) from timestamps
 */
export function calcBarPosition(
  startTs: string | null,
  endTs: string | null,
  durationMin: number | null,
  projectStart: Date,
  projectEnd: Date,
  totalDays: number
): BarPosition | null {
  let startDate: Date;
  let endDate: Date;

  if (startTs && endTs) {
    startDate = new Date(startTs);
    endDate = new Date(endTs);
  } else if (startTs && durationMin) {
    startDate = new Date(startTs);
    endDate = new Date(startDate.getTime() + durationMin * 60000);
  } else {
    return null;
  }

  const startDays = Math.max(0, (startDate.getTime() - projectStart.getTime()) / MS_PER_DAY);
  const durationDays = (endDate.getTime() - startDate.getTime()) / MS_PER_DAY;
  const left = (startDays / totalDays) * 100;
  const width = Math.max(1, (durationDays / totalDays) * 100);

  return { left, width };
}

/**
 * Get project date range from activities
 */
export function getProjectDateRange(ssot: OptionC): { start: Date; end: Date } {
  const activities = Object.values(ssot.entities.activities);
  let minTs: number | null = null;
  let maxTs: number | null = null;

  for (const a of activities) {
    const ts = [
      a.plan.start_ts,
      a.plan.end_ts,
      a.actual.start_ts,
      a.actual.end_ts,
      a.calc.es_ts,
      a.calc.ef_ts
    ].filter(Boolean) as string[];

    for (const t of ts) {
      const ms = new Date(t).getTime();
      if (minTs === null || ms < minTs) minTs = ms;
      if (maxTs === null || ms > maxTs) maxTs = ms;
    }
  }

  const start = minTs ? new Date(minTs) : new Date();
  const end = maxTs ? new Date(maxTs) : new Date(Date.now() + 30 * MS_PER_DAY);
  return { start, end };
}

/**
 * Get collision severity for activity (from calc.collision_severity_max)
 */
export function getCollisionSeverity(activity: Activity): 'blocking' | 'warning' | 'info' | null {
  return activity.calc.collision_severity_max;
}

/**
 * Constraint kind to icon mapping (T6.4: WX/LINKSPAN/BARGE/PTW per plan)
 */
export const CONSTRAINT_ICONS: Record<string, string> = {
  wx_window: '\u{1F32C}',      // WX
  linkspan_capacity: '\u{26F4}', // LINKSPAN
  barge_limits: '\u{1F6A2}',    // BARGE
  ptw_gate: '\u{1F9FE}',        // PTW
  resource: 'RES'
};

/**
 * Dependency edge for SVG rendering (T6.3)
 */
export interface DependencyEdge {
  predActivityId: string;
  succActivityId: string;
  type: 'fs' | 'ss' | 'ff' | 'sf';
  lagMin: number;
  predLeft: number;
  predRight: number;
  succLeft: number;
  succRight: number;
  predRowIndex: number;
  succRowIndex: number;
}

/**
 * Build dependency edges from rows and activity positions (T6.3)
 */
export function buildDependencyEdges(
  rows: GanttRow[],
  activityPositions: Map<string, { left: number; right: number }>
): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const activityToRowIndex = new Map<string, number>();
  rows.forEach((row, idx) => {
    if (row.type === 'activity' && row.activities.length > 0) {
      activityToRowIndex.set(row.activities[0].activity_id, idx);
    }
  });

  for (const row of rows) {
    if (row.type !== 'activity' || row.activities.length === 0) continue;
    const succ = row.activities[0];
    for (const dep of succ.plan.dependencies) {
      const predPos = activityPositions.get(dep.pred_activity_id);
      const succPos = activityPositions.get(succ.activity_id);
      const predRowIdx = activityToRowIndex.get(dep.pred_activity_id);
      const succRowIdx = activityToRowIndex.get(succ.activity_id);
      if (!predPos || !succPos || predRowIdx === undefined || succRowIdx === undefined) continue;
      edges.push({
        predActivityId: dep.pred_activity_id,
        succActivityId: succ.activity_id,
        type: dep.type,
        lagMin: dep.lag_min,
        predLeft: predPos.left,
        predRight: predPos.right,
        succLeft: succPos.left,
        succRight: succPos.right,
        predRowIndex: predRowIdx,
        succRowIndex: succRowIdx
      });
    }
  }
  return edges;
}

/** Constraint kind → { icon, title } for T6.4 */
export interface ConstraintBadge {
  icon: string;
  kind: string;
}

/**
 * Get constraint badges for activity (T6.4: WX/LINKSPAN/BARGE/PTW icons)
 */
export function getConstraintBadges(activity: Activity): ConstraintBadge[] {
  const seen = new Set<string>();
  const badges: ConstraintBadge[] = [];
  for (const c of activity.plan.constraints) {
    const icon = CONSTRAINT_ICONS[c.kind] || c.kind.slice(0, 3).toUpperCase();
    if (icon && !seen.has(c.kind)) {
      seen.add(c.kind);
      badges.push({ icon, kind: c.kind });
    }
  }
  return badges;
}
