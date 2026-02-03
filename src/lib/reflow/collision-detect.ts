/**
 * Collision Detection for Reflow Engine
 *
 * Contract v0.8.0 Collision Kinds:
 * - resource_overallocated: Capacity exceeded in time window
 * - constraint_violation: Hard constraint not met
 * - baseline_violation: Frozen field needs change
 * - negative_slack: Successor pulled before predecessor
 * - dependency_cycle: (handled in dag-cycle.ts)
 */

import type {
  Activity,
  Collision,
  CollisionSeverity,
  OptionC,
  SuggestedAction
} from '../../types/ssot';

export interface CollisionDetectInput {
  activities: Activity[];
  esefResults: Map<string, { es_ts: string; ef_ts: string }>;
  lslfResults: Map<string, { ls_ts: string; lf_ts: string; slack_min: number }>;
  tripId: string;
  ssot: OptionC;
}

export interface CollisionDetectResult {
  collisions: Collision[];
  collisionIds: string[];
}

const COLLISION_KINDS = [
  'resource_overallocated',
  'constraint_violation',
  'baseline_violation',
  'negative_slack',
  'dependency_cycle'
] as const;

/**
 * Run collision detection on activities with ES/EF/LS/LF
 */
export function detectCollisions(input: CollisionDetectInput): CollisionDetectResult {
  const collisions: Collision[] = [];
  const activityMap = new Map(input.activities.map(a => [a.activity_id, a]));

  // 1. Resource overallocation
  const resourceCollisions = detectResourceOverallocated(
    input.activities,
    input.esefResults,
    input.tripId
  );
  collisions.push(...resourceCollisions);

  // 2. Negative slack
  const slackCollisions = detectNegativeSlack(
    input.activities,
    input.esefResults,
    input.lslfResults,
    input.tripId
  );
  collisions.push(...slackCollisions);

  // 3. Constraint violation (simplified: check not_before, not_after)
  const constraintCollisions = detectConstraintViolation(
    input.activities,
    input.esefResults,
    input.tripId
  );
  collisions.push(...constraintCollisions);

  // 4. Baseline violation (when ES/EF differs from frozen plan)
  const baselineCollisions = detectBaselineViolation(
    input.activities,
    input.esefResults,
    input.tripId
  );
  collisions.push(...baselineCollisions);

  return {
    collisions,
    collisionIds: collisions.map(c => c.collision_id)
  };
}

/**
 * Detect resource overallocation: same resource in overlapping time windows
 */
function detectResourceOverallocated(
  activities: Activity[],
  esefResults: Map<string, { es_ts: string; ef_ts: string }>,
  tripId: string
): Collision[] {
  const collisions: Collision[] = [];
  const resourceUsage: Array<{
    resourceId: string;
    activityId: string;
    from: string;
    to: string;
  }> = [];

  for (const activity of activities) {
    const esef = esefResults.get(activity.activity_id);
    if (!esef) continue;

    for (const res of activity.plan.resources) {
      if (res.resource_id) {
        resourceUsage.push({
          resourceId: res.resource_id,
          activityId: activity.activity_id,
          from: esef.es_ts,
          to: esef.ef_ts
        });
      }
    }
  }

  // Find overlaps per resource
  const resourceIds = [...new Set(resourceUsage.map(r => r.resourceId))];

  for (const resourceId of resourceIds) {
    const usages = resourceUsage.filter(r => r.resourceId === resourceId);

    for (let i = 0; i < usages.length; i++) {
      for (let j = i + 1; j < usages.length; j++) {
        const a = usages[i];
        const b = usages[j];

        if (timeRangesOverlap(a.from, a.to, b.from, b.to)) {
          const activityIds = [a.activityId, b.activityId];
          const overlapStart = new Date(Math.max(new Date(a.from).getTime(), new Date(b.from).getTime()));
          const overlapEnd = new Date(Math.min(new Date(a.to).getTime(), new Date(b.to).getTime()));

          const existing = collisions.find(
            c =>
              c.kind === 'resource_overallocated' &&
              c.resource_ids.includes(resourceId) &&
              c.activity_ids.some(id => activityIds.includes(id))
          );

          if (!existing) {
            collisions.push(
              createResourceOverallocatedCollision(
                activityIds,
                [resourceId],
                tripId,
                overlapStart.toISOString(),
                overlapEnd.toISOString()
              )
            );
          }
        }
      }
    }
  }

  return collisions;
}

/**
 * Detect negative slack (LS < ES or LF < EF)
 */
function detectNegativeSlack(
  activities: Activity[],
  esefResults: Map<string, { es_ts: string; ef_ts: string }>,
  lslfResults: Map<string, { ls_ts: string; lf_ts: string; slack_min: number }>,
  tripId: string
): Collision[] {
  const collisions: Collision[] = [];

  for (const activity of activities) {
    const slack = lslfResults.get(activity.activity_id)?.slack_min;
    if (slack !== undefined && slack < 0) {
      const esef = esefResults.get(activity.activity_id);
      const lslf = lslfResults.get(activity.activity_id);
      if (!esef || !lslf) continue;

      collisions.push(
        createNegativeSlackCollision(
          activity.activity_id,
          tripId,
          slack,
          esef.es_ts,
          esef.ef_ts,
          lslf.ls_ts,
          lslf.lf_ts
        )
      );
    }
  }

  return collisions;
}

/**
 * Detect constraint violation (ES/EF outside constraint windows)
 */
function detectConstraintViolation(
  activities: Activity[],
  esefResults: Map<string, { es_ts: string; ef_ts: string }>,
  tripId: string
): Collision[] {
  const collisions: Collision[] = [];

  for (const activity of activities) {
    const esef = esefResults.get(activity.activity_id);
    if (!esef) continue;

    for (const constraint of activity.plan.constraints) {
      const constraintType = constraint.kind;
      if (constraintType === 'not_before' && constraint.params?.target_ts) {
        const target = new Date(constraint.params.target_ts);
        const es = new Date(esef.es_ts);
        if (es < target) {
          collisions.push(
            createConstraintViolationCollision(
              activity.activity_id,
              tripId,
              'not_before',
              constraint.params.target_ts,
              esef.es_ts
            )
          );
        }
      }

      if (constraintType === 'not_after' && constraint.params?.target_ts) {
        const target = new Date(constraint.params.target_ts);
        const ef = new Date(esef.ef_ts);
        if (ef > target) {
          collisions.push(
            createConstraintViolationCollision(
              activity.activity_id,
              tripId,
              'not_after',
              constraint.params.target_ts,
              esef.ef_ts
            )
          );
        }
      }
    }
  }

  return collisions;
}

/**
 * Detect baseline violation (proposed ES/EF differs from frozen plan)
 */
function detectBaselineViolation(
  activities: Activity[],
  esefResults: Map<string, { es_ts: string; ef_ts: string }>,
  tripId: string
): Collision[] {
  const collisions: Collision[] = [];

  for (const activity of activities) {
    if (activity.lock_level !== 'baseline' && !activity.actual.start_ts) continue;

    const esef = esefResults.get(activity.activity_id);
    if (!esef) continue;

    const frozenStart = activity.actual.start_ts ?? activity.plan.start_ts;
    if (frozenStart && esef.es_ts !== frozenStart) {
      collisions.push(
        createBaselineViolationCollision(
          activity.activity_id,
          tripId,
          'plan.start_ts',
          frozenStart,
          esef.es_ts
        )
      );
    }

    const frozenEnd = activity.actual.end_ts ?? activity.plan.end_ts;
    if (frozenEnd && esef.ef_ts !== frozenEnd) {
      collisions.push(
        createBaselineViolationCollision(
          activity.activity_id,
          tripId,
          'plan.end_ts',
          frozenEnd,
          esef.ef_ts
        )
      );
    }
  }

  return collisions;
}

function timeRangesOverlap(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string
): boolean {
  const aStart = new Date(aFrom).getTime();
  const aEnd = new Date(aTo).getTime();
  const bStart = new Date(bFrom).getTime();
  const bEnd = new Date(bTo).getTime();
  return aStart < bEnd && bStart < aEnd;
}

function createResourceOverallocatedCollision(
  activityIds: string[],
  resourceIds: string[],
  tripId: string,
  overlapFrom: string,
  overlapTo: string
): Collision {
  const collisionId = `COL_RES_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    collision_id: collisionId,
    kind: 'resource_overallocated',
    severity: 'blocking',
    status: 'open',
    trip_id: tripId,
    activity_ids: activityIds,
    resource_ids: resourceIds,
    rule_refs: [],
    message: `Resource overlap: ${resourceIds.join(', ')} used by multiple activities in overlapping time window`,
    details: {
      overlap: resourceIds.map(r => ({
        resource_id: r,
        from_ts: overlapFrom,
        to_ts: overlapTo
      }))
    },
    suggested_actions: [
      {
        action_id: `${collisionId}_shift`,
        kind: 'shift_activity',
        label: `Shift activity ${activityIds[1]} after ${activityIds[0]} completes`,
        params: {
          activity_id: activityIds[1],
          shift_min: 60
        }
      },
      {
        action_id: `${collisionId}_swap`,
        kind: 'swap_resource',
        label: `Use alternative resource for ${activityIds[1]}`,
        params: {
          activity_id: activityIds[1],
          assign_resource_id: resourceIds[0]
            ? `${resourceIds[0].replace(/\d+$/, '')}_02`
            : 'ALT_RESOURCE'
        }
      },
      {
        action_id: `${collisionId}_standby`,
        kind: 'add_standby_activity',
        label: `Insert standby buffer until resource free`,
        params: {
          trip_id: tripId,
          after_activity_id: activityIds[0],
          duration_min: 60
        }
      }
    ]
  };
}

function createNegativeSlackCollision(
  activityId: string,
  tripId: string,
  slackMin: number,
  es: string,
  ef: string,
  ls: string,
  lf: string
): Collision {
  const collisionId = `COL_SLACK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    collision_id: collisionId,
    kind: 'negative_slack',
    severity: 'blocking',
    status: 'open',
    trip_id: tripId,
    activity_ids: [activityId],
    resource_ids: [],
    rule_refs: [],
    message: `Negative slack (${slackMin} min): successor pulled before predecessor`,
    details: { slack_min: slackMin, es, ef, ls, lf },
    suggested_actions: [
      {
        action_id: `${collisionId}_shift`,
        kind: 'shift_activity',
        label: `Shift activity to resolve negative slack`,
        params: { activity_id: activityId, shift_min: Math.abs(slackMin) }
      }
    ]
  };
}

function createConstraintViolationCollision(
  activityId: string,
  tripId: string,
  constraintType: string,
  targetTs: string,
  actualTs: string
): Collision {
  const collisionId = `COL_CONST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    collision_id: collisionId,
    kind: 'constraint_violation',
    severity: 'blocking',
    status: 'open',
    trip_id: tripId,
    activity_ids: [activityId],
    resource_ids: [],
    rule_refs: [],
    message: `Constraint violation (${constraintType}): activity outside allowed window`,
    details: { constraint_type: constraintType, target_ts: targetTs, actual_ts: actualTs },
    suggested_actions: [
      {
        action_id: `${collisionId}_snap`,
        kind: 'shift_activity',
        label: `Snap to constraint window`,
        params: { activity_id: activityId, snap_to: 'next_window' }
      }
    ]
  };
}

function createBaselineViolationCollision(
  activityId: string,
  tripId: string,
  path: string,
  frozenValue: string,
  proposedValue: string
): Collision {
  const collisionId = `COL_BASE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    collision_id: collisionId,
    kind: 'baseline_violation',
    severity: 'blocking',
    status: 'open',
    trip_id: tripId,
    activity_ids: [activityId],
    resource_ids: [],
    rule_refs: [],
    message: `Baseline violation: ${path} is frozen but reflow proposes change`,
    details: { path, frozen_value: frozenValue, proposed_value: proposedValue },
    suggested_actions: [
      {
        action_id: `${collisionId}_revert`,
        kind: 'revert_to_baseline',
        label: `Revert to frozen value`,
        params: { activity_id: activityId, path }
      }
    ]
  };
}
