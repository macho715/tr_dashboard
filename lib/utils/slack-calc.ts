/**
 * Slack calculation via forward/backward pass.
 * ES/EF from forward pass, LS/LF from backward pass, slack = LS - ES.
 * SSOT: option_c.json - slack is derived, not stored.
 */
import type { ScheduleActivity, ScheduleDependency } from "@/lib/ssot/schedule"
import { parseUTCDate, addUTCDays, diffUTCDays } from "@/lib/ssot/schedule"

export interface SlackResult {
  activityId: string
  es: Date
  ef: Date
  ls: Date
  lf: Date
  slackDays: number
  isCriticalPath: boolean
}

function getLag(activity: ScheduleActivity, predecessorId: string): number {
  const dep = (activity.depends_on ?? []).find(
    (d: ScheduleDependency) => d.predecessorId === predecessorId
  )
  return dep?.lagDays ?? 0
}

export function calculateSlack(
  activities: ScheduleActivity[],
  projectEndDate: string
): Map<string, SlackResult> {
  const leafActivities = activities.filter((a) => a.activity_id !== null)
  const byId = new Map<string, ScheduleActivity>()
  for (const a of leafActivities) {
    if (a.activity_id) byId.set(a.activity_id, a)
  }

  const projectEnd = parseUTCDate(projectEndDate)

  const predecessors = new Map<string, string[]>()
  const successors = new Map<string, string[]>()

  for (const a of leafActivities) {
    if (!a.activity_id) continue
    const preds = (a.depends_on ?? []).map((d) => d.predecessorId)
    predecessors.set(a.activity_id, preds)
    for (const p of preds) {
      if (!successors.has(p)) successors.set(p, [])
      successors.get(p)!.push(a.activity_id)
    }
  }

  const visited = new Set<string>()
  const stack: string[] = []

  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    for (const p of predecessors.get(id) ?? []) {
      visit(p)
    }
    stack.push(id)
  }

  for (const id of byId.keys()) {
    visit(id)
  }

  const es = new Map<string, Date>()
  const ef = new Map<string, Date>()

  for (const id of stack) {
    const act = byId.get(id)
    if (!act) continue
    const duration = Math.max(1, Math.ceil(act.duration))
    const preds = predecessors.get(id) ?? []
    let earliestStart: Date
    if (preds.length === 0) {
      earliestStart = parseUTCDate(act.planned_start)
    } else {
      let maxVal = parseUTCDate("2020-01-01")
      for (const p of preds) {
        const predEf = ef.get(p)
        if (predEf) {
          const lag = getLag(act, p)
          const candidate = addUTCDays(predEf, lag)
          if (candidate.getTime() > maxVal.getTime()) maxVal = candidate
        }
      }
      earliestStart = maxVal
    }
    const earliestFinish = addUTCDays(earliestStart, duration - 1)
    es.set(id, earliestStart)
    ef.set(id, earliestFinish)
  }

  const ls = new Map<string, Date>()
  const lf = new Map<string, Date>()

  const reverseStack = [...stack].reverse()
  for (const id of reverseStack) {
    const act = byId.get(id)
    if (!act) continue
    const duration = Math.max(1, Math.ceil(act.duration))
    const succs = successors.get(id) ?? []
    let latestFinish: Date
    if (succs.length === 0) {
      latestFinish = projectEnd
    } else {
      let minVal = projectEnd
      for (const s of succs) {
        const succLs = ls.get(s)
        if (succLs) {
          const lag = getLag(byId.get(s)!, id)
          const candidate = addUTCDays(succLs, -lag)
          if (candidate.getTime() < minVal.getTime()) minVal = candidate
        }
      }
      latestFinish = minVal
    }
    const latestStart = addUTCDays(latestFinish, -(duration - 1))
    lf.set(id, latestFinish)
    ls.set(id, latestStart)
  }

  const result = new Map<string, SlackResult>()
  for (const id of byId.keys()) {
    const esVal = es.get(id)!
    const lsVal = ls.get(id)!
    const efVal = ef.get(id)!
    const lfVal = lf.get(id)!
    const esStr = esVal.toISOString().split("T")[0]
    const lsStr = lsVal.toISOString().split("T")[0]
    const slackDays = Math.max(0, diffUTCDays(esStr, lsStr))
    result.set(id, {
      activityId: id,
      es: esVal,
      ef: efVal,
      ls: lsVal,
      lf: lfVal,
      slackDays,
      isCriticalPath: slackDays === 0,
    })
  }
  return result
}
