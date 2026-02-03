/**
 * Timeline Constraint/Collision badges (patch.md §4.2)
 * Constraint: [W][PTW][CERT][LNK][BRG][RES]
 * Collision: [COL][COL-LOC][COL-DEP]
 */
import type { ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"

export const CONSTRAINT_BADGES = {
  W: "[W]",
  PTW: "[PTW]",
  CERT: "[CERT]",
  LNK: "[LNK]",
  BRG: "[BRG]",
  RES: "[RES]",
} as const

export const COLLISION_BADGES = {
  COL: "[COL]",
  COL_LOC: "[COL-LOC]",
  COL_DEP: "[COL-DEP]",
} as const

export type ConstraintBadgeKey = keyof typeof CONSTRAINT_BADGES
export type CollisionBadgeKey = keyof typeof COLLISION_BADGES

export function getConstraintBadges(meta: ScheduleActivity | undefined): ConstraintBadgeKey[] {
  if (!meta) return []
  const badges: ConstraintBadgeKey[] = []
  if (meta.constraint) badges.push("W")
  if (meta.resource_tags && meta.resource_tags.length > 0) badges.push("RES")
  return badges
}

export function getCollisionBadges(
  meta: ScheduleActivity | undefined,
  conflicts: ScheduleConflict[] = []
): CollisionBadgeKey[] {
  if (!meta || !meta.activity_id) return []
  const activityId = meta.activity_id
  const hasConflict = conflicts.some(
    (c) =>
      c.activity_id === activityId ||
      c.related_activity_ids?.includes(activityId)
  )
  return hasConflict ? ["COL"] : []
}

export function getConflictsForActivity(
  activityId: string,
  conflicts: ScheduleConflict[]
): ScheduleConflict[] {
  return conflicts.filter(
    (c) =>
      c.activity_id === activityId ||
      c.related_activity_ids?.includes(activityId)
  )
}
