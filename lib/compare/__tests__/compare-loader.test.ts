/**
 * Phase 10 T10.3: Compare mode tests
 */

import { describe, it, expect } from "vitest"
import { calculateDelta } from "../compare-loader"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

function makeActivity(
  id: string,
  start: string,
  finish: string
): ScheduleActivity {
  return {
    activity_id: id,
    activity_name: id,
    level1: "L1",
    level2: "L2",
    duration: 1,
    planned_start: start,
    planned_finish: finish,
  }
}

describe("compare-loader (T10.3)", () => {
  it("calculates delta correctly: added activity", () => {
    const baseline = [makeActivity("A1000", "2026-02-01", "2026-02-02")]
    const compare = [
      makeActivity("A1000", "2026-02-01", "2026-02-02"),
      makeActivity("A1001", "2026-02-03", "2026-02-04"),
    ]

    const result = calculateDelta(baseline, compare)

    expect(result.added).toHaveLength(1)
    expect(result.added[0].activity_id).toBe("A1001")
    expect(result.removed).toHaveLength(0)
    expect(result.changed).toHaveLength(0)
    expect(result.summary.addedCount).toBe(1)
  })

  it("calculates delta correctly: removed activity", () => {
    const baseline = [
      makeActivity("A1000", "2026-02-01", "2026-02-02"),
      makeActivity("A1001", "2026-02-03", "2026-02-04"),
    ]
    const compare = [makeActivity("A1000", "2026-02-01", "2026-02-02")]

    const result = calculateDelta(baseline, compare)

    expect(result.removed).toHaveLength(1)
    expect(result.removed[0].activity_id).toBe("A1001")
    expect(result.added).toHaveLength(0)
    expect(result.changed).toHaveLength(0)
    expect(result.summary.removedCount).toBe(1)
  })

  it("calculates delta correctly: changed activity (shifted)", () => {
    const baseline = [makeActivity("A1000", "2026-02-01", "2026-02-02")]
    const compare = [makeActivity("A1000", "2026-02-03", "2026-02-04")]

    const result = calculateDelta(baseline, compare)

    expect(result.changed).toHaveLength(1)
    expect(result.changed[0].activity_id).toBe("A1000")
    expect(result.changed[0].startDiff).toEqual({
      from: "2026-02-01",
      to: "2026-02-03",
    })
    expect(result.summary.changedCount).toBe(1)
    expect(result.summary.totalShifted).toBe(1)
  })

  it("returns empty delta when baseline and compare are identical", () => {
    const activities = [
      makeActivity("A1000", "2026-02-01", "2026-02-02"),
      makeActivity("A1001", "2026-02-03", "2026-02-04"),
    ]

    const result = calculateDelta(activities, activities)

    expect(result.added).toHaveLength(0)
    expect(result.removed).toHaveLength(0)
    expect(result.changed).toHaveLength(0)
    expect(result.summary.addedCount).toBe(0)
    expect(result.summary.removedCount).toBe(0)
    expect(result.summary.changedCount).toBe(0)
  })
})
