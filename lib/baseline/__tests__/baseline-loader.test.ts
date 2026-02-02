import { describe, it, expect } from "vitest"
import { loadBaselineFromSsot } from "../baseline-loader"

describe("loadBaselineFromSsot", () => {
  it("loads baseline when present", () => {
    const data = {
      baselines: {
        current_baseline_id: "BASELINE_001",
        items: {
          BASELINE_001: {
            baseline_id: "BASELINE_001",
            name: "Test Baseline",
            created_at: "2026-02-01T10:00:00+04:00",
            freeze_policy: { frozen_fields: ["plan.start_ts"] },
            snapshot: { captured_at: "2026-02-01T10:00:00+04:00" },
          },
        },
      },
    }
    const result = loadBaselineFromSsot(data, "BASELINE_001")
    expect(result.baseline).toBeDefined()
    expect(result.baseline?.name).toBe("Test Baseline")
  })

  it("returns null when baseline not found", () => {
    const data = { baselines: { items: {} } }
    const result = loadBaselineFromSsot(data, "MISSING")
    expect(result.baseline).toBeNull()
    expect(result.error).toContain("not found")
  })
})
