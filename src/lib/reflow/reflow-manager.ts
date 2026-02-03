/**
 * Reflow Manager - Preview/Apply Workflow
 *
 * Contract v0.8.0:
 * - Preview: Runs full reflow pipeline, returns proposed_changes WITHOUT mutating SSOT
 * - Apply: Applies proposed_changes with approval (throws in Approval mode)
 * - Preview → Apply separation enforced
 */

import type {
  OptionC,
  Activity,
  ReflowSeed,
  ReflowRun,
  ReflowChange,
  Collision,
  ViewMode
} from '../../types/ssot';

export interface ReflowResult {
  run_id: string;
  mode: 'preview' | 'apply';
  requested_at: string;
  requested_by: string;
  baseline_id: string | null;
  seed: ReflowSeed;
  proposed_changes: ReflowChange[];
  applied_changes: ReflowChange[];
  collision_summary: { blocking: number; warning: number; info: number };
  collisions?: Collision[];
}
import { getActivitiesArray, getActivitiesForTrip } from '../ssot-loader';
import { detectDependencyCycles } from './dag-cycle';
import { topologicalSort } from './topo-sort';
import { forwardPass } from './forward-pass';
import { backwardPass } from './backward-pass';
import { detectCollisions } from './collision-detect';

export interface Approval {
  approved_by: string;
  approved_at: string; // ISO 8601
  comment?: string;
}

export interface ReflowManagerOptions {
  viewMode?: ViewMode;
  requestedBy?: string;
}

/**
 * Run reflow preview - does NOT mutate SSOT
 *
 * @param ssot - SSOT data (read-only)
 * @param seed - Reflow trigger (cursor_ts, focus_trip_id, reason)
 * @param options - Optional requestedBy, viewMode
 * @returns ReflowResult with proposed_changes, collision_summary
 */
export function reflowPreview(
  ssot: OptionC,
  seed: ReflowSeed,
  options: ReflowManagerOptions = {}
): ReflowResult {
  const { requestedBy = 'user:system' } = options;

  const runId = `RUN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const requestedAt = new Date().toISOString();

  // 1. Get activities for focus trip
  const focusTripId = seed.focus_trip_id || Object.keys(ssot.entities.trips)[0];
  const allActivities = focusTripId
    ? getActivitiesForTrip(ssot, focusTripId)
    : getActivitiesArray(ssot);

  if (allActivities.length === 0) {
    return createEmptyResult(runId, requestedAt, requestedBy, seed);
  }

  // 2. DAG cycle detection
  const cycleResult = detectDependencyCycles(allActivities, focusTripId);
  if (cycleResult.hasCycle && cycleResult.collision) {
    return createResultWithCycleCollision(
      runId,
      requestedAt,
      requestedBy,
      seed,
      cycleResult.collision
    );
  }

  // 3. Topological sort
  const topoResult = topologicalSort(allActivities);
  if (!topoResult.success) {
    return createResultWithError(runId, requestedAt, requestedBy, seed, topoResult.error || 'Topo sort failed');
  }

  // 4. Forward pass
  const dateCursor = seed.cursor_ts || new Date().toISOString();
  const esefResult = forwardPass(allActivities, topoResult.sorted, dateCursor, ssot);

  // 5. Backward pass
  const lslfResult = backwardPass(
    allActivities,
    topoResult.sorted,
    esefResult.activities,
    undefined
  );

  // 6. Collision detection
  const collisionResult = detectCollisions({
    activities: allActivities,
    esefResults: esefResult.activities,
    lslfResults: lslfResult.activities,
    tripId: focusTripId,
    ssot
  });

  // 7. Build proposed_changes (ES/EF diff from plan)
  const proposedChanges = buildProposedChanges(
    allActivities,
    esefResult.activities,
    lslfResult.activities
  );

  // 8. Collision summary
  const collisionSummary = summarizeCollisions(collisionResult.collisions);

  return {
    run_id: runId,
    mode: 'preview',
    requested_at: requestedAt,
    requested_by: requestedBy,
    baseline_id: ssot.baselines?.current_baseline_id ?? null,
    seed,
    proposed_changes: proposedChanges,
    applied_changes: [],
    collision_summary: collisionSummary,
    collisions: collisionResult.collisions
  };
}

/**
 * Apply reflow changes - MUTATES SSOT
 *
 * @param ssot - SSOT to mutate
 * @param run - ReflowResult from reflowPreview
 * @param approval - Approval object (required)
 * @param options - viewMode (throws if 'approval')
 * @returns ReflowResult with applied_changes
 * @throws Error if approval missing or viewMode is 'approval'
 */
export function reflowApply(
  ssot: OptionC,
  run: ReflowResult,
  approval: Approval,
  options: ReflowManagerOptions = {}
): ReflowResult {
  const { viewMode = 'live' } = options;

  // Approval mode blocks Apply
  if (viewMode === 'approval') {
    throw new Error('Apply not allowed in Approval mode (read-only)');
  }

  // Approval required
  if (!approval || !approval.approved_by) {
    throw new Error('Apply requires approval (approved_by)');
  }

  const appliedChanges: ReflowChange[] = [];

  for (const change of run.proposed_changes) {
    const activity = ssot.entities.activities[change.activity_id];
    if (!activity) continue;

    if (change.path === 'plan.start_ts') {
      activity.plan.start_ts = change.to;
      appliedChanges.push({ ...change });
    } else if (change.path === 'plan.end_ts') {
      activity.plan.end_ts = change.to;
      appliedChanges.push({ ...change });
    }
  }

  // Append reflow run to history
  const runRecord: ReflowRun = {
    run_id: run.run_id,
    mode: 'apply',
    requested_at: run.requested_at,
    requested_by: run.requested_by,
    baseline_id: run.baseline_id,
    seed: run.seed,
    proposed_changes: run.proposed_changes,
    applied_changes: appliedChanges,
    collision_summary: run.collision_summary
  };

  if (!ssot.reflow_runs) {
    ssot.reflow_runs = [];
  }
  ssot.reflow_runs.push(runRecord);

  return {
    ...run,
    mode: 'apply',
    applied_changes: appliedChanges,
    collisions: run.collisions || []
  };
}

function createEmptyResult(
  runId: string,
  requestedAt: string,
  requestedBy: string,
  seed: ReflowSeed
): ReflowResult {
  return {
    run_id: runId,
    mode: 'preview',
    requested_at: requestedAt,
    requested_by: requestedBy,
    baseline_id: null,
    seed,
    proposed_changes: [],
    applied_changes: [],
    collision_summary: { blocking: 0, warning: 0, info: 0 },
    collisions: []
  };
}

function createResultWithCycleCollision(
  runId: string,
  requestedAt: string,
  requestedBy: string,
  seed: ReflowSeed,
  collision: Collision
): ReflowResult {
  return {
    run_id: runId,
    mode: 'preview',
    requested_at: requestedAt,
    requested_by: requestedBy,
    baseline_id: null,
    seed,
    proposed_changes: [],
    applied_changes: [],
    collision_summary: {
      blocking: 1,
      warning: 0,
      info: 0
    },
    collisions: [collision]
  };
}

function createResultWithError(
  runId: string,
  requestedAt: string,
  requestedBy: string,
  seed: ReflowSeed,
  error: string
): ReflowResult {
  return {
    run_id: runId,
    mode: 'preview',
    requested_at: requestedAt,
    requested_by: requestedBy,
    baseline_id: null,
    seed,
    proposed_changes: [],
    applied_changes: [],
    collision_summary: { blocking: 1, warning: 0, info: 0 },
    collisions: [
      {
        collision_id: `COL_ERR_${Date.now()}`,
        kind: 'data_error',
        severity: 'blocking',
        status: 'open',
        trip_id: seed.focus_trip_id || '',
        activity_ids: [],
        resource_ids: [],
        rule_refs: [],
        message: error,
        details: {},
        suggested_actions: []
      }
    ]
  };
}

function buildProposedChanges(
  activities: Activity[],
  esefResults: Map<string, { es_ts: string; ef_ts: string }>,
  lslfResults: Map<string, { ls_ts: string; lf_ts: string; slack_min: number; critical_path: boolean }>
): ReflowChange[] {
  const changes: ReflowChange[] = [];

  for (const activity of activities) {
    const esef = esefResults.get(activity.activity_id);
    if (!esef) continue;

    // plan.start_ts diff
    const planStart = activity.plan.start_ts;
    if (planStart !== esef.es_ts) {
      changes.push({
        activity_id: activity.activity_id,
        path: 'plan.start_ts',
        from: planStart,
        to: esef.es_ts,
        reason_code: 'reflow_forward_pass'
      });
    }

    // plan.end_ts diff
    const planEnd = activity.plan.end_ts;
    const calcEnd = esef.ef_ts;
    if (planEnd !== calcEnd) {
      changes.push({
        activity_id: activity.activity_id,
        path: 'plan.end_ts',
        from: planEnd,
        to: calcEnd,
        reason_code: 'reflow_forward_pass'
      });
    }
  }

  return changes;
}

function summarizeCollisions(collisions: Collision[]): {
  blocking: number;
  warning: number;
  info: number;
} {
  const summary = { blocking: 0, warning: 0, info: 0 };

  for (const c of collisions) {
    if (c.severity === 'blocking') summary.blocking++;
    else if (c.severity === 'warning') summary.warning++;
    else summary.info++;
  }

  return summary;
}
