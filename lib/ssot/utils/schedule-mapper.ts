import type { AnchorType, ScheduleActivity, TRUnitId } from "@/lib/ssot/schedule"

export function mapOptionCToScheduleActivity(
  raw: Record<string, unknown>,
  _index?: number
): ScheduleActivity {
  const activityName = typeof raw.activity_name === "string" ? raw.activity_name : ""
  const level2 = typeof raw.level2 === "string" ? raw.level2 : null
  const activityId =
    typeof raw.activity_id === "string" || raw.activity_id === null ? raw.activity_id : null

  const isSummary = activityId === null
  const trUnitId = extractTRUnitId(activityName)
  const anchorType = extractAnchorType(activityName, level2)
  const resourceTags = extractResourceTags(activityName)
  const voyageId = trUnitId ? extractVoyageId(trUnitId) : undefined

  return {
    ...(raw as ScheduleActivity),
    activity_id: activityId,
    activity_name: activityName,
    level1: typeof raw.level1 === "string" ? raw.level1 : "",
    level2,
    duration: typeof raw.duration === "number" ? raw.duration : 0,
    planned_start: typeof raw.planned_start === "string" ? raw.planned_start : "",
    planned_finish: typeof raw.planned_finish === "string" ? raw.planned_finish : "",
    _is_summary: isSummary,
    tr_unit_id: trUnitId,
    anchor_type: anchorType,
    resource_tags: resourceTags.length > 0 ? resourceTags : undefined,
    voyage_id: voyageId,
  }
}

export function mapOptionCJsonToScheduleActivities(optionCData: {
  activities: Record<string, unknown>[]
}): ScheduleActivity[] {
  return optionCData.activities.map((raw, index) => mapOptionCToScheduleActivity(raw, index))
}

function extractTRUnitId(name: string): TRUnitId | undefined {
  const match = name.match(/TR\s*Unit\s*(\d+)/i)
  if (!match) return undefined

  const num = parseInt(match[1], 10)
  if (num >= 1 && num <= 7) {
    return `TR-${num}` as TRUnitId
  }
  return undefined
}

function extractAnchorType(name: string, level2: string | null): AnchorType | undefined {
  const lower = name.toLowerCase()
  const level2Lower = level2 ? level2.toLowerCase() : ""

  if (lower.includes("load-out") || lower.includes("loadout") || level2Lower.includes("loadout")) {
    return "LOADOUT"
  }
  if (lower.includes("sail") || lower.includes("lct") || level2Lower.includes("transport")) {
    return "SAIL_AWAY"
  }
  if (lower.includes("berth") || lower.includes("arrival")) {
    return "BERTHING"
  }
  if (lower.includes("load-in") || lower.includes("loadin")) {
    return "LOADIN"
  }
  if (lower.includes("turning")) {
    return "TURNING"
  }
  if (lower.includes("jack") || lower.includes("jd")) {
    return "JACKDOWN"
  }

  return undefined
}

function extractResourceTags(name: string): string[] {
  const tags: string[] = []
  const lower = name.toLowerCase()

  if (lower.includes("crane")) {
    tags.push("CRANE")
  }
  if (lower.includes("forklift")) {
    if (lower.includes("5t") || lower.includes("5 t") || lower.includes("5-ton")) {
      tags.push("FORKLIFT_5T")
    }
    if (lower.includes("10t") || lower.includes("10 t") || lower.includes("10-ton")) {
      tags.push("FORKLIFT_10T")
    }
    if (!tags.some((tag) => tag.includes("FORKLIFT"))) {
      tags.push("FORKLIFT")
    }
  }
  if (lower.includes("spmt")) {
    tags.push("SPMT")
  }

  return tags
}

function extractVoyageId(trUnitId: TRUnitId): string | undefined {
  const match = trUnitId.match(/TR-(\d+)/)
  if (!match) return undefined
  return `V${match[1]}`
}
