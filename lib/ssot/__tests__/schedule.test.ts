import { describe, it, expect } from "vitest"
import {
  parseDateInput,
  toUtcNoon,
  dateToIsoUtc,
  parseUTCDate,
  parseDateToNoonUtc,
  diffUTCDays,
} from "../schedule"

describe("schedule date helpers (Bug #1)", () => {
  describe("parseDateInput", () => {
    it("parses YYYY-MM-DD to UTC noon", () => {
      const d = parseDateInput("2026-02-07")
      expect(d).not.toBeNull()
      expect(d!.getUTCFullYear()).toBe(2026)
      expect(d!.getUTCMonth()).toBe(1)
      expect(d!.getUTCDate()).toBe(7)
      expect(d!.getUTCHours()).toBe(12)
      expect(d!.getUTCMinutes()).toBe(0)
    })

    it("returns null for invalid input", () => {
      expect(parseDateInput("")).toBeNull()
      expect(parseDateInput("2026-02-31")).toBeNull()
      expect(parseDateInput("not-a-date")).toBeNull()
    })
  })

  describe("toUtcNoon", () => {
    it("normalizes Date to UTC noon of that day", () => {
      const d = new Date(Date.UTC(2026, 1, 7, 3, 45, 0))
      const noon = toUtcNoon(d)
      expect(noon.getUTCFullYear()).toBe(2026)
      expect(noon.getUTCMonth()).toBe(1)
      expect(noon.getUTCDate()).toBe(7)
      expect(noon.getUTCHours()).toBe(12)
    })
  })

  describe("dateToIsoUtc", () => {
    it("formats Date to YYYY-MM-DD (UTC)", () => {
      const d = parseUTCDate("2026-02-07")
      expect(dateToIsoUtc(d)).toBe("2026-02-07")
    })
  })

  describe("selectedDate line alignment", () => {
    it("parseDateInput and diffUTCDays agree on day index", () => {
      const selected = parseDateInput("2026-02-07")
      expect(selected).not.toBeNull()
      const days = diffUTCDays("2026-01-26", "2026-02-07")
      expect(days).toBe(12)
    })
  })

  describe("parseDateToNoonUtc (Bug #1: no Invalid Date propagation)", () => {
    it("returns Date for valid YYYY-MM-DD and ISO strings", () => {
      expect(parseDateToNoonUtc("2026-02-07")).not.toBeNull()
      expect(parseDateToNoonUtc("2026-02-07T14:30:00Z")?.getUTCDate()).toBe(7)
    })
    it("returns null for invalid dates and does not propagate Invalid Date", () => {
      expect(parseDateToNoonUtc("2026-13-45")).toBeNull()
      expect(parseDateToNoonUtc("2026-02-31")).toBeNull()
      expect(parseDateToNoonUtc("not-a-date")).toBeNull()
      const valid = parseDateToNoonUtc("2026-02-07")
      expect(valid).not.toBeNull()
      expect(Number.isNaN(valid!.getTime())).toBe(false)
    })
  })
})
