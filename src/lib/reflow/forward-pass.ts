/**
 * Forward Pass (ES/EF Calculation) for Reflow Engine
 * 
 * Calculates Early Start (ES) and Early Finish (EF) times
 * for all activities in topological order.
 * 
 * Contract v0.8.0 Rules:
 * - Respect freeze (actual.start_ts or reflow_pins)
 * - Apply dependency lag (pred_EF + lag → succ_ES)
 * - Apply constraints (time windows, resource calendars)
 * - Handle duration_mode: 'elapsed' vs 'work_hours'
 */

import type { Activity, Dependency, Constraint, ResourceCalendar, OptionC } from '../../types/ssot';

export interface ForwardPassResult {
  activities: Map<string, {
    es_ts: string;  // ISO 8601
    ef_ts: string;
  }>;
  frozen: Set<string>;  // Activity IDs with frozen start
  warnings: string[];
}

/**
 * Run forward pass on activities in topological order
 * 
 * @param activities - Activities sorted in topological order
 * @param sortedIds - Activity IDs in execution order
 * @param dateCursor - Project start date (for activities with no predecessors)
 * @param ssot - Full SSOT for constraint/resource lookup
 */
export function forwardPass(
  activities: Activity[],
  sortedIds: string[],
  dateCursor: string,
  ssot: OptionC
): ForwardPassResult {
  const activityMap = new Map(activities.map(a => [a.activity_id, a]));
  const results = new Map<string, { es_ts: string; ef_ts: string }>();
  const frozen = new Set<string>();
  const warnings: string[] = [];
  
  for (const activityId of sortedIds) {
    const activity = activityMap.get(activityId);
    
    if (!activity) {
      warnings.push(`Activity ${activityId} not found in activity map`);
      continue;
    }
    
    // Check if frozen
    if (isFrozen(activity)) {
      const frozenStart = getFrozenStart(activity);
      const ef = calculateFinish(frozenStart, activity, ssot);
      
      results.set(activityId, {
        es_ts: frozenStart,
        ef_ts: ef
      });
      
      frozen.add(activityId);
      continue;
    }
    
    // Calculate ES from dependencies
    const es = calculateEarlyStart(activity, results, dateCursor);
    
    // Apply constraints (time windows)
    const constrainedES = applyConstraints(es, activity, ssot);
    
    // Calculate EF
    const ef = calculateFinish(constrainedES, activity, ssot);
    
    results.set(activityId, {
      es_ts: constrainedES,
      ef_ts: ef
    });
  }
  
  return {
    activities: results,
    frozen,
    warnings
  };
}

/**
 * Check if activity start is frozen
 * 
 * Frozen if:
 * - actual.start_ts exists (already started)
 * - reflow_pins with strength=HARD at start
 */
function isFrozen(activity: Activity): boolean {
  // Actual start exists
  if (activity.actual.start_ts !== null) {
    return true;
  }
  
  // Hard pin at start
  for (const pin of activity.reflow_pins) {
    if (pin.strength === 'hard' && pin.pin_type === 'start') {
      return true;
    }
  }
  
  // Baseline lock
  if (activity.lock_level === 'baseline') {
    return true;
  }
  
  return false;
}

/**
 * Get frozen start time
 */
function getFrozenStart(activity: Activity): string {
  // Actual start has highest priority
  if (activity.actual.start_ts) {
    return activity.actual.start_ts;
  }
  
  // Hard pin
  for (const pin of activity.reflow_pins) {
    if (pin.strength === 'hard' && pin.pin_type === 'start' && pin.target_ts) {
      return pin.target_ts;
    }
  }
  
  // Baseline (use plan.start_ts)
  if (activity.plan.start_ts) {
    return activity.plan.start_ts;
  }
  
  // Should not reach here if isFrozen() returned true
  throw new Error(`Activity ${activity.activity_id} marked as frozen but no frozen start found`);
}

/**
 * Calculate Early Start from dependencies
 * 
 * ES = max(pred_EF + lag) for all predecessors
 * If no predecessors, use dateCursor
 */
function calculateEarlyStart(
  activity: Activity,
  results: Map<string, { es_ts: string; ef_ts: string }>,
  dateCursor: string
): string {
  if (activity.plan.dependencies.length === 0) {
    return dateCursor;
  }
  
  let maxTS: Date | null = null;
  
  for (const dep of activity.plan.dependencies) {
    const predResult = results.get(dep.pred_activity_id);
    
    if (!predResult) {
      // Predecessor not yet calculated (shouldn't happen with topo sort)
      continue;
    }
    
    // Get predecessor finish based on dependency type
    let predTime: string;
    switch (dep.type) {
      case 'fs': // Finish-to-Start
        predTime = predResult.ef_ts;
        break;
      case 'ss': // Start-to-Start
        predTime = predResult.es_ts;
        break;
      case 'ff': // Finish-to-Finish (handled in backward pass)
        predTime = predResult.ef_ts;
        break;
      case 'sf': // Start-to-Finish (rare)
        predTime = predResult.es_ts;
        break;
      default:
        predTime = predResult.ef_ts;
    }
    
    // Add lag
    const predDate = new Date(predTime);
    const withLag = addMinutes(predDate, dep.lag_min);
    
    if (maxTS === null || withLag > maxTS) {
      maxTS = withLag;
    }
  }
  
  return maxTS ? maxTS.toISOString() : dateCursor;
}

/**
 * Apply time window constraints
 * 
 * Constraints in Contract v0.8.0:
 * - not_before
 * - not_after
 * - within_window (start_ts, end_ts)
 */
function applyConstraints(
  es: string,
  activity: Activity,
  ssot: OptionC
): string {
  let constrainedES = new Date(es);
  
  for (const constraint of activity.plan.constraints) {
    switch (constraint.constraint_type) {
      case 'not_before':
        if (constraint.params?.target_ts) {
          const notBefore = new Date(constraint.params.target_ts);
          if (constrainedES < notBefore) {
            constrainedES = notBefore;
          }
        }
        break;
        
      case 'not_after':
        // Forward pass respects not_after as soft constraint
        // Hard enforcement happens in collision detection
        break;
        
      case 'within_window':
        if (constraint.params?.start_ts) {
          const windowStart = new Date(constraint.params.start_ts);
          if (constrainedES < windowStart) {
            constrainedES = windowStart;
          }
        }
        break;
    }
  }
  
  return constrainedES.toISOString();
}

/**
 * Calculate finish time from start
 * 
 * Handles:
 * - duration_mode: 'elapsed' (calendar time) vs 'work_hours' (resource calendar)
 * - Resource calendar integration (work shifts, blackouts)
 */
function calculateFinish(
  start: string,
  activity: Activity,
  ssot: OptionC
): string {
  const startDate = new Date(start);
  const durationMin = activity.plan.duration_min;
  
  if (activity.plan.duration_mode === 'elapsed') {
    // Simple elapsed time (calendar time)
    return addMinutes(startDate, durationMin).toISOString();
  } else {
    // Work hours mode - integrate with resource calendar
    return calculateWorkHoursFinish(startDate, durationMin, activity, ssot);
  }
}

/**
 * Calculate finish time considering resource work calendars
 * 
 * Adds work_hours duration accounting for:
 * - Work shifts (e.g., 08:00-17:00)
 * - Blackout periods (holidays, shutdowns)
 */
function calculateWorkHoursFinish(
  start: Date,
  durationMin: number,
  activity: Activity,
  ssot: OptionC
): string {
  // Get primary resource calendar
  const resourceId = activity.plan.resources[0]?.resource_id;
  if (!resourceId) {
    // No resource - fall back to elapsed time
    return addMinutes(start, durationMin).toISOString();
  }
  
  const resource = ssot.entities.resources[resourceId];
  if (!resource || !resource.calendar_id) {
    // No calendar - fall back to elapsed time
    return addMinutes(start, durationMin).toISOString();
  }
  
  const calendar = resource.calendar;
  if (!calendar) {
    return addMinutes(start, durationMin).toISOString();
  }
  
  // Calculate end considering work shifts
  let currentTime = new Date(start);
  let remainingMin = durationMin;
  
  // Simple algorithm: advance through work shifts
  // TODO: Implement full calendar logic with shifts and blackouts
  const WORK_HOURS_PER_DAY = 9; // 08:00-17:00
  const WORK_MIN_PER_DAY = WORK_HOURS_PER_DAY * 60;
  
  while (remainingMin > 0) {
    // Simplified: consume up to one work day
    const dayWork = Math.min(remainingMin, WORK_MIN_PER_DAY);
    remainingMin -= dayWork;
    
    if (remainingMin > 0) {
      // Move to next work day
      currentTime = addMinutes(currentTime, 24 * 60); // Skip to next day
    } else {
      currentTime = addMinutes(currentTime, dayWork);
    }
  }
  
  return currentTime.toISOString();
}

/**
 * Add minutes to date (utility)
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
