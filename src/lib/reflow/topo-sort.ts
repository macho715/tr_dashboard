/**
 * Topological Sort with Deterministic Tie-breaking
 * 
 * Contract v0.8.0 Reflow Rule:
 * Sort order: lock_level DESC → priority DESC → planned_start ASC → activity_id ASC
 * 
 * This ensures identical input produces identical output (determinism).
 */

import type { Activity, LockLevel } from '../../types/ssot';

export interface TopoSortResult {
  success: boolean;
  sorted: string[];  // Activity IDs in execution order
  error?: string;
}

const LOCK_LEVEL_PRIORITY: Record<LockLevel, number> = {
  'baseline': 4,
  'hard': 3,
  'soft': 2,
  'none': 1
};

/**
 * Topological sort with deterministic tie-breaking
 * 
 * Uses Kahn's algorithm with custom priority queue.
 */
export function topologicalSort(activities: Activity[]): TopoSortResult {
  // Build graph and in-degree map
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const activityMap = new Map<string, Activity>();
  
  // Initialize
  for (const activity of activities) {
    const id = activity.activity_id;
    activityMap.set(id, activity);
    graph.set(id, new Set());
    inDegree.set(id, 0);
  }
  
  // Build edges and count in-degrees
  for (const activity of activities) {
    for (const dep of activity.plan.dependencies) {
      const pred = dep.pred_activity_id;
      const succ = activity.activity_id;
      
      if (!graph.has(pred)) {
        // Dangling reference - skip for now (will be caught in validation)
        continue;
      }
      
      graph.get(pred)!.add(succ);
      inDegree.set(succ, (inDegree.get(succ) || 0) + 1);
    }
  }
  
  // Kahn's algorithm with priority queue
  const sorted: string[] = [];
  const queue: string[] = [];
  
  // Initialize queue with nodes that have in-degree 0
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(id);
    }
  }
  
  while (queue.length > 0) {
    // DETERMINISTIC TIE-BREAKING
    // Sort queue by: lock_level DESC → priority DESC → start_ts ASC → id ASC
    queue.sort((a, b) => comparePriority(activityMap.get(a)!, activityMap.get(b)!));
    
    const current = queue.shift()!;
    sorted.push(current);
    
    // Process neighbors
    const neighbors = graph.get(current) || new Set();
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  // Check if all nodes processed (cycle detection)
  if (sorted.length !== activities.length) {
    return {
      success: false,
      sorted: [],
      error: 'Dependency cycle detected (not all activities processed)'
    };
  }
  
  return {
    success: true,
    sorted
  };
}

/**
 * Compare two activities for deterministic ordering
 * 
 * Priority order:
 * 1. lock_level DESC (baseline > hard > soft > none)
 * 2. priority DESC (if priority field exists)
 * 3. plan.start_ts ASC (earliest first)
 * 4. activity_id ASC (alphabetical)
 */
function comparePriority(a: Activity, b: Activity): number {
  // 1. Lock level (higher = more constrained = process first)
  const aLockPriority = LOCK_LEVEL_PRIORITY[a.lock_level];
  const bLockPriority = LOCK_LEVEL_PRIORITY[b.lock_level];
  
  if (aLockPriority !== bLockPriority) {
    return bLockPriority - aLockPriority; // DESC
  }
  
  // 2. Priority field (if exists)
  // NOTE: Not in Contract v0.8.0 yet, but planned
  // const aPriority = (a as any).priority || 0;
  // const bPriority = (b as any).priority || 0;
  // if (aPriority !== bPriority) {
  //   return bPriority - aPriority; // DESC
  // }
  
  // 3. Planned start time (earlier = process first)
  const aStart = a.plan.start_ts;
  const bStart = b.plan.start_ts;
  
  if (aStart && bStart) {
    const aTime = new Date(aStart).getTime();
    const bTime = new Date(bStart).getTime();
    
    if (aTime !== bTime) {
      return aTime - bTime; // ASC
    }
  } else if (aStart && !bStart) {
    return -1; // a has start, b doesn't → a first
  } else if (!aStart && bStart) {
    return 1; // b has start, a doesn't → b first
  }
  
  // 4. Activity ID (alphabetical)
  return a.activity_id.localeCompare(b.activity_id); // ASC
}

/**
 * Verify topological sort determinism
 * 
 * Runs sort multiple times and checks all results are identical.
 * Critical for reflow determinism requirement.
 */
export function verifyTopologicalDeterminism(
  activities: Activity[],
  runs: number = 10
): { deterministic: boolean; uniqueResults: number } {
  const results = new Set<string>();
  
  for (let i = 0; i < runs; i++) {
    const result = topologicalSort(activities);
    if (result.success) {
      results.add(JSON.stringify(result.sorted));
    }
  }
  
  return {
    deterministic: results.size <= 1,
    uniqueResults: results.size
  };
}
