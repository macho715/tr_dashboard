/**
 * DAG Cycle Detection for TR Dashboard Reflow Engine
 * 
 * Uses Tarjan's strongly connected components algorithm to detect cycles
 * in activity dependency graphs.
 * 
 * Contract v0.8.0: If cycle detected, create collision.kind=dependency_cycle
 * and block reflow apply.
 */

import type { Activity, Dependency, Collision } from '../../types/ssot';

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycles: string[][];  // Array of cycles, each cycle is array of activity_ids
  collision: Collision | null;
}

/**
 * Detect cycles in activity dependency graph
 * 
 * @param activities - All activities to check
 * @param tripId - Trip ID for collision context
 * @returns Cycle detection result with collision if found
 */
export function detectDependencyCycles(
  activities: Activity[],
  tripId: string
): CycleDetectionResult {
  // First check for self-loops (A→A)
  const selfLoops: string[][] = [];
  for (const activity of activities) {
    for (const dep of activity.plan.dependencies) {
      if (dep.pred_activity_id === activity.activity_id) {
        selfLoops.push([activity.activity_id]);
      }
    }
  }
  
  const graph = buildDependencyGraph(activities);
  const cycles = findStronglyConnectedComponents(graph);
  
  // Filter out single-node "cycles" (not actual cycles unless self-loop)
  const actualCycles = cycles.filter(scc => scc.length > 1);
  
  // Combine with self-loops
  const allCycles = [...selfLoops, ...actualCycles];
  
  if (allCycles.length === 0) {
    return {
      hasCycle: false,
      cycles: [],
      collision: null
    };
  }
  
  // Create blocking collision
  const collision = createCycleCollision(allCycles, tripId);
  
  return {
    hasCycle: true,
    cycles: allCycles,
    collision
  };
}

/**
 * Build adjacency list from dependencies
 */
function buildDependencyGraph(
  activities: Activity[]
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  
  // Initialize nodes
  for (const activity of activities) {
    if (!graph.has(activity.activity_id)) {
      graph.set(activity.activity_id, new Set());
    }
  }
  
  // Add edges (predecessor -> successor)
  for (const activity of activities) {
    for (const dep of activity.plan.dependencies) {
      const pred = dep.pred_activity_id;
      const succ = activity.activity_id;
      
      if (!graph.has(pred)) {
        graph.set(pred, new Set());
      }
      
      graph.get(pred)!.add(succ);
    }
  }
  
  return graph;
}

/**
 * Tarjan's algorithm for finding strongly connected components
 * 
 * Returns array of SCCs. Each SCC with length > 1 is a cycle.
 */
function findStronglyConnectedComponents(
  graph: Map<string, Set<string>>
): string[][] {
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  
  let currentIndex = 0;
  
  function strongConnect(v: string) {
    index.set(v, currentIndex);
    lowlink.set(v, currentIndex);
    currentIndex++;
    stack.push(v);
    onStack.add(v);
    
    // Visit neighbors
    const neighbors = graph.get(v) || new Set();
    for (const w of neighbors) {
      if (!index.has(w)) {
        // Successor w has not yet been visited; recurse
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        // Successor w is in stack S and hence in the current SCC
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
      }
    }
    
    // If v is a root node, pop the stack and create SCC
    if (lowlink.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string;
      
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      
      sccs.push(scc);
    }
  }
  
  // Run on all nodes
  for (const node of graph.keys()) {
    if (!index.has(node)) {
      strongConnect(node);
    }
  }
  
  return sccs;
}

/**
 * Create collision for detected cycle
 */
function createCycleCollision(
  cycles: string[][],
  tripId: string
): Collision {
  const allActivityIds = new Set<string>();
  cycles.forEach(cycle => cycle.forEach(id => allActivityIds.add(id)));
  
  const cycleDescriptions = cycles.map(cycle => cycle.join(' → ') + ' → ' + cycle[0]);
  
  return {
    collision_id: `COL_CYCLE_${Date.now()}`,
    kind: 'dependency_cycle',
    severity: 'blocking',
    status: 'open',
    trip_id: tripId,
    activity_ids: Array.from(allActivityIds),
    resource_ids: [],
    rule_refs: [],
    message: `Dependency cycle detected: ${cycleDescriptions.join('; ')}`,
    details: {
      cycles: cycles.map(cycle => ({
        path: cycle,
        description: cycle.join(' → ') + ' → ' + cycle[0]
      }))
    },
    suggested_actions: cycles.flatMap((cycle, idx) =>
      generateCycleBreakActions(cycle, idx)
    )
  };
}

/**
 * Generate suggested actions for breaking a cycle
 */
function generateCycleBreakActions(
  cycle: string[],
  cycleIdx: number
): Collision['suggested_actions'] {
  const actions: Collision['suggested_actions'] = [];
  
  // For each edge in the cycle, suggest removing that dependency
  for (let i = 0; i < cycle.length; i++) {
    const pred = cycle[i];
    const succ = cycle[(i + 1) % cycle.length];
    
    actions.push({
      action_id: `ACT_BREAK_CYCLE_${cycleIdx}_${i}`,
      kind: 'remove_dependency',
      label: `Break cycle by removing dependency ${pred} → ${succ}`,
      params: {
        pred_activity_id: pred,
        succ_activity_id: succ
      }
    });
  }
  
  return actions;
}

/**
 * Check if adding a dependency would create a cycle
 * 
 * Useful for validation before adding new dependencies.
 */
export function wouldCreateCycle(
  activities: Activity[],
  newDep: { pred_activity_id: string; succ_activity_id: string }
): boolean {
  // Create a copy with the new dependency added
  const activitiesWithNewDep = activities.map(a => {
    if (a.activity_id === newDep.succ_activity_id) {
      return {
        ...a,
        plan: {
          ...a.plan,
          dependencies: [
            ...a.plan.dependencies,
            { 
              pred_activity_id: newDep.pred_activity_id,
              type: 'fs' as const,
              lag_min: 0
            }
          ]
        }
      };
    }
    return a;
  });
  
  const result = detectDependencyCycles(activitiesWithNewDep, '');
  return result.hasCycle;
}
