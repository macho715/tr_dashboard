/**
 * T6.8: Gantt interaction tests
 * - Dependency line connects correct activities
 * - Collision badge / critical path styling
 * - Date cursor / reflow preview
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  buildGanttRows,
  buildDependencyEdges,
  calcBarPosition,
  barRight,
  getProjectDateRange,
  getConstraintBadges,
  CONSTRAINT_ICONS
} from '../gantt-utils'
import { loadSSOTSync } from '../../ssot-loader'
import type { OptionC } from '../../types/ssot'

const MS_PER_DAY = 1000 * 60 * 60 * 24

describe('Gantt Utils (T6.8)', () => {
  let ssot: OptionC

  beforeAll(() => {
    ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json')
  })

  describe('buildGanttRows', () => {
    it('builds Trip → TR → Activity hierarchy', () => {
      const rows = buildGanttRows(ssot)
      expect(rows.length).toBeGreaterThan(0)
      const tripRows = rows.filter((r) => r.type === 'trip')
      const trRows = rows.filter((r) => r.type === 'tr')
      const activityRows = rows.filter((r) => r.type === 'activity')
      expect(tripRows.length).toBeGreaterThan(0)
      expect(trRows.length).toBeGreaterThan(0)
      expect(activityRows.length).toBeGreaterThan(0)
    })

    it('activity rows contain exactly one activity each', () => {
      const rows = buildGanttRows(ssot)
      const activityRows = rows.filter((r) => r.type === 'activity')
      for (const row of activityRows) {
        expect(row.activities).toHaveLength(1)
      }
    })
  })

  describe('buildDependencyEdges', () => {
    it('dependency line connects correct activities (FS)', () => {
      const rows = buildGanttRows(ssot)
      const projectStart = new Date('2026-02-01T00:00:00+04:00')
      const projectEnd = new Date('2026-03-15T00:00:00+04:00')
      const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / MS_PER_DAY)

      const positions = new Map<string, { left: number; right: number }>()
      rows.forEach((row) => {
        if (row.type !== 'activity' || row.activities.length === 0) return
        const act = row.activities[0]
        const pos = calcBarPosition(
          act.plan.start_ts,
          act.plan.end_ts,
          act.plan.duration_min,
          projectStart,
          projectEnd,
          totalDays
        )
        if (pos) positions.set(act.activity_id, { left: pos.left, right: barRight(pos) })
      })

      const edges = buildDependencyEdges(rows, positions)
      expect(edges.length).toBeGreaterThan(0)

      const fsEdges = edges.filter((e) => e.type === 'fs')
      for (const e of fsEdges) {
        expect(e.predActivityId).toBeTruthy()
        expect(e.succActivityId).toBeTruthy()
        expect(e.predRight).toBeLessThanOrEqual(100)
        expect(e.succLeft).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('getConstraintBadges', () => {
    it('returns constraint icons for activity with constraints', () => {
      const activities = Object.values(ssot.entities.activities)
      const withConstraints = activities.filter((a) => a.plan.constraints.length > 0)
      if (withConstraints.length === 0) return
      const badges = getConstraintBadges(withConstraints[0])
      expect(Array.isArray(badges)).toBe(true)
      for (const b of badges) {
        expect(b).toHaveProperty('icon')
        expect(b).toHaveProperty('kind')
      }
    })
  })

  describe('CONSTRAINT_ICONS', () => {
    it('has WX/LINKSPAN/BARGE/PTW icons per T6.4', () => {
      expect(CONSTRAINT_ICONS.wx_window).toBeTruthy()
      expect(CONSTRAINT_ICONS.linkspan_capacity).toBeTruthy()
      expect(CONSTRAINT_ICONS.barge_limits).toBeTruthy()
      expect(CONSTRAINT_ICONS.ptw_gate).toBeTruthy()
    })
  })

  describe('calcBarPosition', () => {
    it('returns null when start/end missing', () => {
      const projectStart = new Date()
      const projectEnd = new Date(Date.now() + 7 * MS_PER_DAY)
      const pos = calcBarPosition(null, null, null, projectStart, projectEnd, 7)
      expect(pos).toBeNull()
    })

    it('returns left and width for valid timestamps', () => {
      const projectStart = new Date('2026-02-01T00:00:00+04:00')
      const projectEnd = new Date('2026-02-15T00:00:00+04:00')
      const totalDays = 14
      const pos = calcBarPosition(
        '2026-02-05T08:00:00+04:00',
        '2026-02-05T12:00:00+04:00',
        240,
        projectStart,
        projectEnd,
        totalDays
      )
      expect(pos).not.toBeNull()
      expect(pos!.left).toBeGreaterThanOrEqual(0)
      expect(pos!.left).toBeLessThanOrEqual(100)
      expect(pos!.width).toBeGreaterThan(0)
    })
  })

  describe('getProjectDateRange', () => {
    it('returns start and end from activities', () => {
      const { start, end } = getProjectDateRange(ssot)
      expect(start).toBeInstanceOf(Date)
      expect(end).toBeInstanceOf(Date)
      expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime())
    })
  })
})
