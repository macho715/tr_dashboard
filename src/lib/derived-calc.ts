/**
 * Derived Calculation Engine for TR Dashboard (Contract v0.8.0)
 * 
 * Calculates derived (read-only) values from SSOT.
 * CRITICAL: Does not mutate SSOT. Returns new calculated values.
 * 
 * Derived fields:
 * - TR.calc.current_activity_id (from Activities)
 * - TR.calc.current_location_id (from current Activity)
 * - Trip.calc.collision_ids (aggregate from Activities)
 * - Activity.calc.slack_min (LS - ES)
 * - Activity.calc.critical_path (slack == 0)
 * - Activity.calc.collision_severity_max (max severity)
 */

import type {
  OptionC,
  Activity,
  Trip,
  TR,
  CollisionSeverity
} from '../types/ssot';
import { getActivitiesArray, getActivitiesForTrip, getActivitiesForTR } from './ssot-loader';

// ============================================================================
// TR Derived Calculations
// ============================================================================

/**
 * Calculate TR.calc.current_activity_id
 * 
 * Logic: Find activity with this TR where actual.start_ts exists and actual.end_ts is null
 * (in progress). If multiple in-progress, return the one with latest start_ts.
 * If none in-progress, return the most recent completed activity.
 */
export function calculateCurrentActivityForTR(
  ssot: OptionC,
  trId: string
): string | null {
  const activities = getActivitiesForTR(ssot, trId);
  
  // Find in-progress activities (multiple possible if shared activities)
  const inProgress = activities.filter(a =>
    a.actual.start_ts !== null && a.actual.end_ts === null
  );
  
  if (inProgress.length > 0) {
    // Return the one with latest actual.start_ts (most recent)
    const sorted = inProgress.sort((a, b) => {
      const aStart = new Date(a.actual.start_ts!).getTime();
      const bStart = new Date(b.actual.start_ts!).getTime();
      return bStart - aStart; // Descending
    });
    
    return sorted[0].activity_id;
  }
  
  // Find most recent completed activity
  const completed = activities
    .filter(a => a.actual.end_ts !== null)
    .sort((a, b) => {
      const aEnd = new Date(a.actual.end_ts!).getTime();
      const bEnd = new Date(b.actual.end_ts!).getTime();
      return bEnd - aEnd; // Descending (most recent first)
    });
  
  return completed[0]?.activity_id || null;
}

/**
 * Calculate TR.calc.current_location_id
 * 
 * Logic: Get location from current activity
 */
export function calculateCurrentLocationForTR(
  ssot: OptionC,
  trId: string
): string | null {
  const currentActivityId = calculateCurrentActivityForTR(ssot, trId);
  
  if (!currentActivityId) {
    return null;
  }
  
  const activity = ssot.entities.activities[currentActivityId];
  
  if (!activity) {
    return null;
  }
  
  // Use actual location if exists, otherwise plan
  if (activity.actual.location_override) {
    return activity.actual.location_override.to_location_id;
  }
  
  // If in progress, use current position (to_location_id)
  if (activity.actual.start_ts && !activity.actual.end_ts) {
    return activity.plan.location.to_location_id;
  }
  
  // If completed, use end location
  if (activity.actual.end_ts) {
    return activity.plan.location.to_location_id;
  }
  
  // Default to from_location_id
  return activity.plan.location.from_location_id;
}

/**
 * Calculate all TR calc fields
 */
export function calculateTRCalc(ssot: OptionC, trId: string): TR['calc'] {
  return {
    current_activity_id: calculateCurrentActivityForTR(ssot, trId),
    current_location_id: calculateCurrentLocationForTR(ssot, trId),
    risk_score: 0.0 // TODO: Implement risk calculation
  };
}

// ============================================================================
// Trip Derived Calculations
// ============================================================================

/**
 * Calculate Trip.calc.collision_ids
 * 
 * Logic: Aggregate collision_ids from all activities in trip
 */
export function calculateCollisionIDsForTrip(
  ssot: OptionC,
  tripId: string
): string[] {
  const activities = getActivitiesForTrip(ssot, tripId);
  
  const collisionIds = new Set<string>();
  
  for (const activity of activities) {
    for (const colId of activity.calc.collision_ids) {
      collisionIds.add(colId);
    }
  }
  
  return Array.from(collisionIds);
}

/**
 * Calculate Trip.calc.risk_score
 * 
 * Logic: Max risk score from activities
 */
export function calculateRiskScoreForTrip(
  ssot: OptionC,
  tripId: string
): number {
  const activities = getActivitiesForTrip(ssot, tripId);
  
  if (activities.length === 0) {
    return 0.0;
  }
  
  return Math.max(...activities.map(a => a.calc.risk_score));
}

/**
 * Calculate all Trip calc fields
 */
export function calculateTripCalc(ssot: OptionC, tripId: string): Trip['calc'] {
  return {
    collision_ids: calculateCollisionIDsForTrip(ssot, tripId),
    risk_score: calculateRiskScoreForTrip(ssot, tripId)
  };
}

// ============================================================================
// Activity Derived Calculations
// ============================================================================

/**
 * Calculate Activity.calc.slack_min
 * 
 * Logic: LS - ES (in minutes)
 */
export function calculateSlack(activity: Activity): number | null {
  if (activity.calc.ls_ts === null || activity.calc.es_ts === null) {
    return null;
  }
  
  const ls = new Date(activity.calc.ls_ts).getTime();
  const es = new Date(activity.calc.es_ts).getTime();
  
  return Math.round((ls - es) / 60000); // milliseconds to minutes
}

/**
 * Calculate Activity.calc.critical_path
 * 
 * Logic: slack == 0
 */
export function calculateCriticalPath(activity: Activity): boolean {
  const slack = calculateSlack(activity);
  return slack !== null && slack === 0;
}

/**
 * Calculate Activity.calc.collision_severity_max
 * 
 * Logic: Find max severity from collision_ids
 */
export function calculateCollisionSeverityMax(
  ssot: OptionC,
  activity: Activity
): CollisionSeverity | null {
  if (activity.calc.collision_ids.length === 0) {
    return null;
  }
  
  const severities = activity.calc.collision_ids
    .map(id => ssot.collisions[id]?.severity)
    .filter((s): s is CollisionSeverity => s !== undefined);
  
  if (severities.length === 0) {
    return null;
  }
  
  // Priority: blocking > warning > info
  if (severities.includes('blocking')) return 'blocking';
  if (severities.includes('warning')) return 'warning';
  return 'info';
}

/**
 * Update Activity calc fields (partial)
 * 
 * NOTE: Does not calculate ES/EF/LS/LF (requires full reflow)
 */
export function updateActivityCalc(
  ssot: OptionC,
  activity: Activity
): Activity['calc'] {
  return {
    ...activity.calc,
    slack_min: calculateSlack(activity),
    critical_path: calculateCriticalPath(activity),
    collision_severity_max: calculateCollisionSeverityMax(ssot, activity)
  };
}

// ============================================================================
// Full SSOT Derived Update
// ============================================================================

/**
 * Calculate all derived fields for entire SSOT
 * 
 * WARNING: This creates a new SSOT object with updated calc fields.
 * Original SSOT is not mutated (read-only).
 * 
 * @param ssot - Input SSOT (read-only)
 * @returns New SSOT with updated calc fields
 */
export function calculateAllDerived(ssot: OptionC): OptionC {
  // Deep clone to avoid mutation
  const newSSOT = JSON.parse(JSON.stringify(ssot)) as OptionC;
  
  // Update Activity calc fields
  for (const activityId in newSSOT.entities.activities) {
    const activity = newSSOT.entities.activities[activityId];
    newSSOT.entities.activities[activityId].calc = updateActivityCalc(
      newSSOT,
      activity
    );
  }
  
  // Update Trip calc fields
  for (const tripId in newSSOT.entities.trips) {
    newSSOT.entities.trips[tripId].calc = calculateTripCalc(newSSOT, tripId);
  }
  
  // Update TR calc fields
  for (const trId in newSSOT.entities.trs) {
    newSSOT.entities.trs[trId].calc = calculateTRCalc(newSSOT, trId);
  }
  
  return newSSOT;
}

/**
 * Verify derived field integrity
 * 
 * Checks that calc fields match expected values.
 * Useful for testing and validation.
 */
export function verifyDerivedIntegrity(ssot: OptionC): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check Activities
  for (const activity of getActivitiesArray(ssot)) {
    // Slack calculation
    const expectedSlack = calculateSlack(activity);
    if (activity.calc.slack_min !== expectedSlack) {
      errors.push(
        `Activity ${activity.activity_id}: slack_min mismatch ` +
        `(expected: ${expectedSlack}, got: ${activity.calc.slack_min})`
      );
    }
    
    // Critical path
    const expectedCritical = calculateCriticalPath(activity);
    if (activity.calc.critical_path !== expectedCritical) {
      errors.push(
        `Activity ${activity.activity_id}: critical_path mismatch ` +
        `(expected: ${expectedCritical}, got: ${activity.calc.critical_path})`
      );
    }
    
    // Collision severity
    const expectedSeverity = calculateCollisionSeverityMax(ssot, activity);
    if (activity.calc.collision_severity_max !== expectedSeverity) {
      errors.push(
        `Activity ${activity.activity_id}: collision_severity_max mismatch ` +
        `(expected: ${expectedSeverity}, got: ${activity.calc.collision_severity_max})`
      );
    }
  }
  
  // Check Trips
  for (const tripId in ssot.entities.trips) {
    const trip = ssot.entities.trips[tripId];
    
    const expectedCollisions = calculateCollisionIDsForTrip(ssot, tripId);
    const actualCollisions = trip.calc?.collision_ids || [];
    
    if (JSON.stringify(expectedCollisions.sort()) !== JSON.stringify(actualCollisions.sort())) {
      errors.push(
        `Trip ${tripId}: collision_ids mismatch`
      );
    }
  }
  
  // Check TRs
  for (const trId in ssot.entities.trs) {
    const tr = ssot.entities.trs[trId];
    
    const expectedActivity = calculateCurrentActivityForTR(ssot, trId);
    const actualActivity = tr.calc?.current_activity_id;
    
    if (expectedActivity !== actualActivity) {
      errors.push(
        `TR ${trId}: current_activity_id mismatch ` +
        `(expected: ${expectedActivity}, got: ${actualActivity})`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
