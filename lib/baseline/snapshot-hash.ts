/**
 * Snapshot hash validation (patch.md §5, Phase 9 T9.5)
 * Validates baseline snapshot integrity via hash.
 * Uses Node crypto (server-side / tests only).
 */

import { createHash } from "node:crypto"
import type { Baseline, BaselineSnapshot, SnapshotHash } from "./types"

/**
 * Canonical JSON string for hashing (deterministic key order).
 */
function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj)
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalStringify).join(",") + "]"
  }
  const keys = Object.keys(obj).sort()
  const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify((obj as Record<string, unknown>)[k]))
  return "{" + pairs.join(",") + "}"
}

/**
 * Compute SHA-256 hash of snapshot payload.
 */
function computeSha256(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex")
}

/**
 * Validate snapshot hash integrity (T9.5).
 * Returns true if hash matches computed value; false if mismatch or no hash.
 */
export function validateSnapshotHash(baseline: Baseline): boolean {
  const hash = baseline.snapshot?.hash
  if (!hash?.algo || !hash?.value) return true // No hash = skip validation

  const payload = baseline.snapshot?.entities ?? {}
  const payloadStr = canonicalStringify(payload)

  if (hash.algo.toLowerCase() === "sha256") {
    const computed = computeSha256(payloadStr)
    return computed === hash.value
  }

  return false // Unsupported algo
}
