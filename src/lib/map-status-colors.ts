/**
 * Map status colors (patch.md §4.1)
 *
 * TR marker / Route segment colors by state:
 * - Planned: gray
 * - In progress: blue
 * - Completed: green
 * - Blocked: red
 * - Delayed: orange
 */

import type { ActivityState } from '@/src/types/ssot'

export type MapStatusToken =
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'delayed'

/** Map ActivityState to MapStatusToken */
export function activityStateToMapStatus(state: ActivityState): MapStatusToken {
  switch (state) {
    case 'draft':
    case 'planned':
      return 'planned'
    case 'ready':
      return 'ready'
    case 'in_progress':
    case 'paused':
      return 'in_progress'
    case 'completed':
      return 'completed'
    case 'blocked':
      return 'blocked'
    case 'canceled':
    case 'aborted':
      return 'blocked'
    default:
      return 'planned'
  }
}

/** Tailwind/CSS color classes for TR markers (patch §4.1) */
export const MAP_STATUS_COLORS: Record<MapStatusToken, string> = {
  planned: 'bg-gray-400',      // 회색
  ready: 'bg-sky-300',         // 시작 가능 (연한 파랑)
  in_progress: 'bg-blue-500',  // 파랑
  completed: 'bg-green-500',   // 초록
  blocked: 'bg-red-500',       // 빨강
  delayed: 'bg-orange-500',    // 주황
}

/** Hex colors for Leaflet divIcon (inline styles) */
export const MAP_STATUS_HEX: Record<MapStatusToken, string> = {
  planned: '#9ca3af',
  ready: '#7dd3fc',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  blocked: '#ef4444',
  delayed: '#f97316',
}

/** Collision overlay: blocking=red outline, warning=yellow outline */
export const COLLISION_OUTLINE: Record<string, string> = {
  blocking: 'ring-2 ring-red-600',
  warning: 'ring-2 ring-yellow-500',
  info: 'ring-2 ring-blue-400',
}
