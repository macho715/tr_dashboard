/**
 * Map status colors tests (Phase 5 T5.2)
 *
 * patch §4.1: Planned=회색, In progress=파랑, Completed=초록, Blocked=빨강, Delayed=주황
 */

import { describe, it, expect } from 'vitest'
import {
  activityStateToMapStatus,
  MAP_STATUS_HEX,
  MAP_STATUS_COLORS,
  COLLISION_OUTLINE,
} from '../map-status-colors'

describe('map-status-colors', () => {
  it('maps activity states to map status tokens', () => {
    expect(activityStateToMapStatus('draft')).toBe('planned')
    expect(activityStateToMapStatus('planned')).toBe('planned')
    expect(activityStateToMapStatus('ready')).toBe('ready')
    expect(activityStateToMapStatus('in_progress')).toBe('in_progress')
    expect(activityStateToMapStatus('paused')).toBe('in_progress')
    expect(activityStateToMapStatus('completed')).toBe('completed')
    expect(activityStateToMapStatus('blocked')).toBe('blocked')
    expect(activityStateToMapStatus('canceled')).toBe('blocked')
    expect(activityStateToMapStatus('aborted')).toBe('blocked')
  })

  it('provides hex colors for Leaflet divIcon', () => {
    expect(MAP_STATUS_HEX.planned).toBe('#9ca3af')
    expect(MAP_STATUS_HEX.in_progress).toBe('#3b82f6')
    expect(MAP_STATUS_HEX.completed).toBe('#22c55e')
    expect(MAP_STATUS_HEX.blocked).toBe('#ef4444')
    expect(MAP_STATUS_HEX.delayed).toBe('#f97316')
  })

  it('provides Tailwind classes for TR markers', () => {
    expect(MAP_STATUS_COLORS.planned).toContain('gray')
    expect(MAP_STATUS_COLORS.in_progress).toContain('blue')
    expect(MAP_STATUS_COLORS.completed).toContain('green')
    expect(MAP_STATUS_COLORS.blocked).toContain('red')
  })

  it('provides collision outline classes', () => {
    expect(COLLISION_OUTLINE.blocking).toContain('red')
    expect(COLLISION_OUTLINE.warning).toContain('yellow')
    expect(COLLISION_OUTLINE.info).toContain('blue')
  })
})
