import { describe, it, expect } from "vitest"
import { inferDependencies } from "../infer-dependencies"
import type { ScheduleActivity } from "@/lib/ssot/schedule"

describe("inferDependencies", () => {
  it("adds FS dependency between same level2 activities in chronological order", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "A1000",
        activity_name: "First",
        level1: "MOB",
        level2: "SPMT",
        duration: 1,
        planned_start: "2026-01-26",
        planned_finish: "2026-01-26",
      },
      {
        activity_id: "A1010",
        activity_name: "Second",
        level1: "MOB",
        level2: "SPMT",
        duration: 1,
        planned_start: "2026-02-07",
        planned_finish: "2026-02-07",
      },
    ]
    const result = inferDependencies(activities)
    const a1010 = result.find((a) => a.activity_id === "A1010")
    expect(a1010?.depends_on).toBeDefined()
    expect(a1010?.depends_on?.length).toBe(1)
    expect(a1010?.depends_on?.[0].predecessorId).toBe("A1000")
    expect(a1010?.depends_on?.[0].type).toBe("FS")
  })

  it("does not add dependency for first activity in level2 group", () => {
    const activities: ScheduleActivity[] = [
      {
        activity_id: "A1000",
        activity_name: "First",
        level1: "MOB",
        level2: "SPMT",
        duration: 1,
        planned_start: "2026-01-26",
        planned_finish: "2026-01-26",
      },
    ]
    const result = inferDependencies(activities)
    const a1000 = result.find((a) => a.activity_id === "A1000")
    expect(a1000?.depends_on ?? []).toHaveLength(0)
  })
})
