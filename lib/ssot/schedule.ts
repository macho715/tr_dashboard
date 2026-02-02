// SSOT schedule types and date helpers (UTC, day-based).

export type DependencyType = "FS" | "SS" | "FF" | "SF"
export type AnchorType =
  | "LOADOUT"
  | "SAIL_AWAY"
  | "BERTHING"
  | "LOADIN"
  | "TURNING"
  | "JACKDOWN"
export type TRUnitId = "TR-1" | "TR-2" | "TR-3" | "TR-4" | "TR-5" | "TR-6" | "TR-7"
export type ActivityStatus = "planned" | "in_progress" | "blocked" | "done"

export type ActivityNodeType = "LEAF" | "SUMMARY"

export interface ScheduleDependency {
  predecessorId: string
  type: DependencyType
  lagDays: number
}

export interface ScheduleConstraint {
  type:
    | "START_NO_EARLIER_THAN"
    | "FINISH_NO_LATER_THAN"
    | "MUST_START_ON"
    | "MUST_FINISH_ON"
  date: string
  reason?: string
}

export interface ScheduleCalendar {
  weekendsOff?: boolean
  blackoutDates?: string[]
}

export interface ScheduleActivity {
  activity_id: string | null
  activity_name: string
  level1: string
  level2: string | null
  duration: number
  planned_start: string
  planned_finish: string

  tr_unit_id?: TRUnitId
  anchor_type?: AnchorType
  depends_on?: ScheduleDependency[]
  is_locked?: boolean
  constraint?: ScheduleConstraint
  calendar?: ScheduleCalendar
  resource_tags?: string[]
  voyage_id?: string
  milestone_id?: string
  status?: ActivityStatus
  blocker_code?: string | null

  // Actual (patch.md §5.1)
  actual_start?: string
  actual_finish?: string

  // Derived flag for runtime use only.
  _is_summary?: boolean
}

export interface DateChange {
  activity_id: string
  old_start: string
  new_start: string
  old_finish: string
  new_finish: string
  delta_days: number
}

export interface SuggestedAction {
  kind: string
  label: string
  params?: Record<string, unknown>
}

export interface ScheduleConflict {
  type: "RESOURCE" | "CONSTRAINT" | "LOCK_VIOLATION" | "DEPENDENCY_CYCLE"
  activity_id: string
  message: string
  severity: "warn" | "error"
  related_activity_ids?: string[]
  resource?: string
  overlapStart?: string
  overlapEnd?: string
  overlapMinutes?: number
  conflictKey?: string
  /** Root cause code (patch.md §4.2, 2-click UX) */
  root_cause_code?: string
  /** Diagnostic details */
  details?: Record<string, unknown>
  /** Suggested resolution actions */
  suggested_actions?: SuggestedAction[]
}

export interface ImpactReport {
  affected_count: number
  affected_ids: string[]
  changes: DateChange[]
  conflicts: ScheduleConflict[]
}

export interface ReflowResult {
  activities: ScheduleActivity[]
  impact_report: ImpactReport
}

export interface ReflowOptions {
  preserveOffset?: boolean
  respectLocks?: boolean
  respectConstraints?: boolean
  respectCalendar?: boolean
  checkResourceConflicts?: boolean
  detectCycles?: boolean
}

export const DEFAULT_TR_CHAIN_RULE: ScheduleDependency = {
  predecessorId: "",
  type: "FS",
  lagDays: 0,
}

export const DEFAULT_ANCHOR_TYPE: AnchorType = "LOADOUT"

export const DEFAULT_REFLOW_OPTIONS: ReflowOptions = {
  preserveOffset: false,
  respectLocks: true,
  respectConstraints: true,
  respectCalendar: false,
  checkResourceConflicts: true,
  detectCycles: true,
}

export function normalizeActivityId(
  activity: Pick<ScheduleActivity, "activity_id" | "level1" | "level2">
): string {
  if (activity.activity_id !== null) {
    return activity.activity_id
  }
  const level2Part = activity.level2 || "ROOT"
  return `SUMMARY_${activity.level1}_${level2Part}`
}

export function calculateFinishDate(startDate: string, duration: number): string {
  const start = parseUTCDate(startDate)
  const days = Math.ceil(duration)
  return addUTCDays(start, days - 1).toISOString().split("T")[0]
}

export function parseUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function addUTCDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function diffUTCDays(date1: string, date2: string): number {
  const d1 = parseUTCDate(date1)
  const d2 = parseUTCDate(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

/** Parse YYYY-MM-DD to Date at UTC noon (Bug #1: single path for selected date bar) */
export function parseDateInput(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

/** Date → YYYY-MM-DD (UTC) */
export function dateToIsoUtc(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Normalize Date to UTC noon of that day (for day-index / Gantt position).
 * Returns the same Invalid Date if d is invalid (callers should validate first). */
export function toUtcNoon(d: Date): Date {
  if (Number.isNaN(d.getTime())) return d
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)
  )
}

/** Parse date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm...) to noon UTC for Gantt bar positioning.
 * Aligns with PROJECT_START/getDatePosition (Bug #2: 12-hour offset fix).
 * Returns null for invalid dates (e.g. 2026-13-45); does not fall back to parseUTCDate to avoid Invalid Date propagation. */
export function parseDateToNoonUtc(iso: string): Date | null {
  const datePart = iso.trim().slice(0, 10)
  const d = parseDateInput(datePart)
  return d && !Number.isNaN(d.getTime()) ? d : null
}
