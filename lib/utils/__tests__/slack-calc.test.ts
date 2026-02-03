import { describe, it, expect } from "vitest"
import { calculateSlack } from "../slack-calc"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

describe("calculateSlack", () => {
  it("computes slack for chain A->B->C", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "A",
        activity_name: "A",
        level1: "X",
        level2: "Y",
        duration: 1,
        planned_start: "2026-01-26",
        planned_finish: "2026-01-26",
        depends_on: [],
      },
      {
        activity_id: "B",
        activity_name: "B",
        level1: "X",
        level2: "Y",
        duration: 2,
        planned_start: "2026-01-27",
        planned_finish: "2026-01-28",
        depends_on: [{ predecessorId: "A", type: "FS", lagDays: 0 }],
      },
      {
        activity_id: "C",
        activity_name: "C",
        level1: "X",
        level2: "Y",
        duration: 1,
        planned_start: "2026-01-29",
        planned_finish: "2026-01-29",
        depends_on: [{ predecessorId: "B", type: "FS", lagDays: 0 }],
      },
    ]
    const result = calculateSlack(activities, "2026-02-15")
    expect(result.get("A")?.slackDays).toBeGreaterThanOrEqual(0)
    expect(result.get("B")?.slackDays).toBeGreaterThanOrEqual(0)
    expect(result.get("C")?.slackDays).toBeGreaterThanOrEqual(0)
    expect(result.get("A")?.isCriticalPath).toBeDefined()
    expect(result.get("B")?.isCriticalPath).toBeDefined()
    expect(result.get("C")?.isCriticalPath).toBeDefined()
  })

  it("returns slack for activities with no dependencies", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "X",
        activity_name: "X",
        level1: "L1",
        level2: "L2",
        duration: 1,
        planned_start: "2026-01-26",
        planned_finish: "2026-01-26",
      },
    ]
    const result = calculateSlack(activities, "2026-02-15")
    expect(result.get("X")).toBeDefined()
    expect(result.get("X")?.slackDays).toBeGreaterThanOrEqual(0)
  })
})
