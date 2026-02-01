/**
 * Backward Pass (LS/LF Calculation) for Reflow Engine
 * 
 * Calculates Late Start (LS) and Late Finish (LF) times
 * for all activities in reverse topological order.
 * 
 * Contract v0.8.0 Rules:
 * - Start from project end or latest EF
 * - Work backwards through dependencies
 * - Calculate slack: LS - ES (in minutes)
 * - Identify critical path: slack == 0
 */

import type { Activity } from '../../types/ssot';

export interface BackwardPassResult {
  activities: Map<string, {
    ls_ts: string;  // ISO 8601
    lf_ts: string;
    slack_min: number;
    critical_path: boolean;
  }>;
}

/**
 * Run backward pass on activities in reverse topological order
 * 
 * @param activities - Activities with ES/EF already calculated
 * @param sortedIds - Activity IDs in execution order (will be reversed)
 * @param esefResults - ES/EF from forward pass
 * @param projectEnd - Optional project deadline (if not provided, use max EF)
 */
export function backwardPass(
  activities: Activity[],
  sortedIds: string[],
  esefResults: Map<string, { es_ts: string; ef_ts: string }>,
  projectEnd?: string
): BackwardPassResult {
  const activityMap = new Map(activities.map(a => [a.activity_id, a]));
  const results = new Map<string, {
    ls_ts: string;
    lf_ts: string;
    slack_min: number;
    critical_path: boolean;
  }>();
  
  // Calculate project end if not provided
  const projectEndDate = projectEnd
    ? new Date(projectEnd)
    : calculateProjectEnd(esefResults);
  
  // Build successor map for backward traversal
  const successorMap = buildSuccessorMap(activities);
  
  // Traverse in reverse topological order
  for (let i = sortedIds.length - 1; i >= 0; i--) {
    const activityId = sortedIds[i];
    const activity = activityMap.get(activityId);
    
    if (!activity) continue;
    
    const esef = esefResults.get(activityId);
    if (!esef) continue;
    
    // Calculate LF from successors or project end
    const lf = calculateLateFinish(
      activityId,
      activity,
      successorMap,
      results,
      projectEndDate
    );
    
    // Calculate LS from LF and duration
    const ls = subtractDuration(lf, activity.plan.duration_min);
    
    // Calculate slack
    const es = new Date(esef.es_ts);
    const slack_min = Math.round((ls.getTime() - es.getTime()) / 60000);
    
    results.set(activityId, {
      ls_ts: ls.toISOString(),
      lf_ts: lf.toISOString(),
      slack_min,
      critical_path: slack_min === 0
    });
  }
  
  return {
    activities: results
  };
}

/**
 * Calculate project end (max EF across all activities)
 */
function calculateProjectEnd(
  esefResults: Map<string, { es_ts: string; ef_ts: string }>
): Date {
  let maxEF: Date | null = null;
  
  for (const { ef_ts } of esefResults.values()) {
    const ef = new Date(ef_ts);
    if (maxEF === null || ef > maxEF) {
      maxEF = ef;
    }
  }
  
  return maxEF || new Date();
}

/**
 * Build successor map (activity_id -> successors)
 */
function buildSuccessorMap(
  activities: Activity[]
): Map<string, Array<{ succ_id: string; type: string; lag_min: number }>> {
  const successorMap = new Map<string, Array<{ succ_id: string; type: string; lag_min: number }>>();
  
  for (const activity of activities) {
    for (const dep of activity.plan.dependencies) {
      const pred = dep.pred_activity_id;
      
      if (!successorMap.has(pred)) {
        successorMap.set(pred, []);
      }
      
      successorMap.get(pred)!.push({
        succ_id: activity.activity_id,
        type: dep.type,
        lag_min: dep.lag_min
      });
    }
  }
  
  return successorMap;
}

/**
 * Calculate Late Finish from successors or project end
 * 
 * LF = min(succ_LS - lag) for all successors
 * If no successors, LF = project end
 */
function calculateLateFinish(
  activityId: string,
  activity: Activity,
  successorMap: Map<string, Array<{ succ_id: string; type: string; lag_min: number }>>,
  results: Map<string, { ls_ts: string; lf_ts: string; slack_min: number; critical_path: boolean }>,
  projectEnd: Date
): Date {
  const successors = successorMap.get(activityId) || [];
  
  if (successors.length === 0) {
    // No successors - use project end
    return projectEnd;
  }
  
  let minLF: Date | null = null;
  
  for (const succ of successors) {
    const succResult = results.get(succ.succ_id);
    if (!succResult) continue;
    
    // Get successor time based on dependency type
    let succTime: Date;
    switch (succ.type) {
      case 'fs': // Finish-to-Start
        succTime = new Date(succResult.ls_ts);
        break;
      case 'ss': // Start-to-Start
        // For backward pass: pred_LF = succ_LS - lag + duration
        succTime = new Date(succResult.ls_ts);
        succTime = new Date(succTime.getTime() + activity.plan.duration_min * 60000);
        break;
      case 'ff': // Finish-to-Finish
        succTime = new Date(succResult.lf_ts);
        break;
      case 'sf': // Start-to-Finish
        succTime = new Date(succResult.lf_ts);
        break;
      default:
        succTime = new Date(succResult.ls_ts);
    }
    
    // Subtract lag
    const withLag = new Date(succTime.getTime() - succ.lag_min * 60000);
    
    if (minLF === null || withLag < minLF) {
      minLF = withLag;
    }
  }
  
  return minLF || projectEnd;
}

/**
 * Subtract duration from finish to get start
 */
function subtractDuration(finish: Date, durationMin: number): Date {
  return new Date(finish.getTime() - durationMin * 60000);
}

/**
 * Identify critical path activities
 * 
 * Critical path = activities with slack == 0
 */
export function identifyCriticalPath(
  backwardResults: BackwardPassResult
): string[] {
  const criticalActivities: string[] = [];
  
  for (const [activityId, result] of backwardResults.activities.entries()) {
    if (result.critical_path) {
      criticalActivities.push(activityId);
    }
  }
  
  return criticalActivities;
}

/**
 * Find longest path through network (critical path duration)
 */
export function calculateCriticalPathDuration(
  esefResults: Map<string, { es_ts: string; ef_ts: string }>
): number {
  if (esefResults.size === 0) return 0;
  
  let minES: Date | null = null;
  let maxEF: Date | null = null;
  
  for (const { es_ts, ef_ts } of esefResults.values()) {
    const es = new Date(es_ts);
    const ef = new Date(ef_ts);
    
    if (minES === null || es < minES) {
      minES = es;
    }
    
    if (maxEF === null || ef > maxEF) {
      maxEF = ef;
    }
  }
  
  if (minES && maxEF) {
    return Math.round((maxEF.getTime() - minES.getTime()) / 60000);
  }
  
  return 0;
}
