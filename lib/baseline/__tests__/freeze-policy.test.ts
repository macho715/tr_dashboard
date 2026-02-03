import { describe, it, expect } from "vitest"
import { isFrozen, assertEditAllowed } from "../freeze-policy"
import type { FreezePolicy } from "../types"

describe("isFrozen", () => {
  it("returns true when field matches pattern", () => {
    const policy: FreezePolicy = {
      frozen_fields: ["entities.activities.*.plan.start_ts"],
    }
    expect(isFrozen("entities.activities.A1000.plan.start_ts", policy)).toBe(true)
  })

  it("returns false when field does not match", () => {
    const policy: FreezePolicy = {
      frozen_fields: ["entities.activities.*.plan.start_ts"],
    }
    expect(isFrozen("entities.activities.A1000.plan.end_ts", policy)).toBe(false)
  })

  it("returns false when frozen_fields is empty", () => {
    const policy: FreezePolicy = { frozen_fields: [] }
    expect(isFrozen("entities.activities.A1000.plan.start_ts", policy)).toBe(false)
  })
})

describe("assertEditAllowed (T9.5: frozen fields cannot be edited)", () => {
  it("throws when field is frozen", () => {
    const policy: FreezePolicy = {
      frozen_fields: ["entities.activities.*.plan.start_ts"],
    }
    expect(() => assertEditAllowed("entities.activities.A1000.plan.start_ts", policy)).toThrow(
      "Cannot edit frozen field"
    )
  })

  it("does not throw when field is not frozen", () => {
    const policy: FreezePolicy = {
      frozen_fields: ["entities.activities.*.plan.start_ts"],
    }
    expect(() => assertEditAllowed("entities.activities.A1000.plan.end_ts", policy)).not.toThrow()
  })

  it("does not throw when frozen_fields is empty", () => {
    const policy: FreezePolicy = { frozen_fields: [] }
    expect(() => assertEditAllowed("entities.activities.A1000.plan.start_ts", policy)).not.toThrow()
  })
})
