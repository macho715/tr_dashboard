import { describe, it, expect } from "vitest"
import { validateSnapshotHash } from "../snapshot-hash"
import { createHash } from "node:crypto"
import type { Baseline } from "../types"

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj)
  if (Array.isArray(obj)) return "[" + obj.map(canonicalStringify).join(",") + "]"
  const keys = Object.keys(obj).sort()
  const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify((obj as Record<string, unknown>)[k]))
  return "{" + pairs.join(",") + "}"
}

describe("validateSnapshotHash (T9.5: snapshot hash validates integrity)", () => {
  it("returns true when hash matches computed value", () => {
    const entities = {
      activities_plan: {
        A1000: { start_ts: "2026-02-02T09:00:00+04:00", end_ts: "2026-02-02T17:00:00+04:00" },
      },
    }
    const payloadStr = canonicalStringify(entities)
    const computed = createHash("sha256").update(payloadStr, "utf8").digest("hex")

    const baseline: Baseline = {
      baseline_id: "B1",
      name: "Test",
      created_at: "2026-02-01T10:00:00+04:00",
      freeze_policy: { frozen_fields: [] },
      snapshot: {
        captured_at: "2026-02-01T10:00:00+04:00",
        entities,
        hash: { algo: "sha256", value: computed },
      },
    }

    expect(validateSnapshotHash(baseline)).toBe(true)
  })

  it("returns false when hash does not match", () => {
    const baseline: Baseline = {
      baseline_id: "B1",
      name: "Test",
      created_at: "2026-02-01T10:00:00+04:00",
      freeze_policy: { frozen_fields: [] },
      snapshot: {
        captured_at: "2026-02-01T10:00:00+04:00",
        entities: { activities_plan: { A1000: { start_ts: "x", end_ts: "y" } } },
        hash: { algo: "sha256", value: "wrong_hash_value_1234567890abcdef" },
      },
    }

    expect(validateSnapshotHash(baseline)).toBe(false)
  })

  it("returns true when no hash present (skip validation)", () => {
    const baseline: Baseline = {
      baseline_id: "B1",
      name: "Test",
      created_at: "2026-02-01T10:00:00+04:00",
      freeze_policy: { frozen_fields: [] },
      snapshot: { captured_at: "2026-02-01T10:00:00+04:00" },
    }

    expect(validateSnapshotHash(baseline)).toBe(true)
  })
})
