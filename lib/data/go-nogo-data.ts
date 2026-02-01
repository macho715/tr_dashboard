/**
 * Go/No-Go Data Loader
 *
 * data/schedule/go_nogo.json -> GoNoGoBadge props
 */

import goNoGoDataRaw from "../../data/schedule/go_nogo.json"

export type GoNoGoDecision = "GO" | "NO-GO" | "CONDITIONAL"

export interface GoNoGoData {
  decision: GoNoGoDecision
  reasonCodes?: string[]
  updatedAt?: string
}

const goNoGoData = goNoGoDataRaw as GoNoGoData

export const goNoGoDecision = (goNoGoData.decision ?? "CONDITIONAL") as GoNoGoDecision
export const goNoGoReasonCodes = goNoGoData.reasonCodes ?? []
export const goNoGoUpdatedAt = goNoGoData.updatedAt ?? ""
