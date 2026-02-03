import { describe, it, expect } from "vitest"
import { ganttRowsToVisData } from "../visTimelineMapper"
import type { GanttRow } from "@/lib/dashboard-data"

describe("ganttRowsToVisData", () => {
  it("maps GanttRow[] to groups and items", () => {
    const rows: GanttRow[] = [
      { name: "MOBILIZATION", isHeader: true },
      {
        name: "SPMT",
        isHeader: false,
        activities: [
          {
            start: "2026-01-26",
            end: "2026-01-26",
            type: "mobilization",
            label: "A1000: Mobilization of 1st set of SPMT",
          },
        ],
      },
    ]

    const result = ganttRowsToVisData(rows)

    expect(result.groups).toHaveLength(2)
    expect(result.groups[0]).toEqual({
      id: "group_0",
      content: "MOBILIZATION",
      order: 0,
    })
    expect(result.groups[1]).toEqual({
      id: "group_1",
      content: "SPMT",
      order: 1,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe("A1000")
    expect(result.items[0].group).toBe("group_1")
    expect(result.items[0].content).toBe("A1000: Mobilization of 1st set of SPMT")
    expect(result.items[0].type).toBe("range")
    expect(result.items[0].start).toEqual(new Date(Date.UTC(2026, 0, 26)))
    expect(result.items[0].end).toEqual(new Date(Date.UTC(2026, 0, 26)))
  })

  it("uses parseUTCDate for date consistency", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A2000: Test activity",
          },
        ],
      },
    ]

    const result = ganttRowsToVisData(rows)

    expect(result.items[0].start.getUTCDate()).toBe(7)
    expect(result.items[0].start.getUTCMonth()).toBe(1)
    expect(result.items[0].start.getUTCFullYear()).toBe(2026)
    expect(result.items[0].end.getUTCDate()).toBe(10)
  })

  it("adds ghost bars when compareDelta has changed items (Task 8)", () => {
    const rows: GanttRow[] = [
      {
        name: "Test",
        isHeader: false,
        activities: [
          {
            start: "2026-02-07",
            end: "2026-02-10",
            type: "mobilization",
            label: "A2000: Test activity",
          },
        ],
      },
    ]
    const compareDelta = {
      added: [],
      removed: [],
      changed: [
        {
          activity_id: "A2000",
          kind: "changed" as const,
          compare: {
            activity_id: "A2000",
            activity_name: "Test",
            level1: "Test",
            level2: null,
            duration: 5,
            planned_start: "2026-02-08",
            planned_finish: "2026-02-13",
          },
        },
      ],
      summary: {
        addedCount: 0,
        removedCount: 0,
        changedCount: 1,
        totalShifted: 1,
        collisionsNew: 0,
      },
    }

    const result = ganttRowsToVisData(rows, compareDelta)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].id).toBe("A2000")
    expect(result.items[1].id).toBe("ghost_A2000")
    expect(result.items[1].className).toBe("baseline-ghost")
    expect(result.items[1].start).toEqual(new Date(Date.UTC(2026, 1, 8)))
    expect(result.items[1].end).toEqual(new Date(Date.UTC(2026, 1, 13)))
  })
})
