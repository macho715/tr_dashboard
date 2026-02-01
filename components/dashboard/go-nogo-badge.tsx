"use client"

import {
  goNoGoDecision,
  goNoGoReasonCodes,
  goNoGoUpdatedAt,
} from "@/lib/data/go-nogo-data"
import type { GoNoGoDecision } from "@/lib/data/go-nogo-data"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

const decisionConfig: Record<
  GoNoGoDecision,
  { label: string; className: string; Icon: typeof CheckCircle }
> = {
  GO: {
    label: "GO",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    Icon: CheckCircle,
  },
  "NO-GO": {
    label: "NO-GO",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-400",
    Icon: XCircle,
  },
  CONDITIONAL: {
    label: "CONDITIONAL",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    Icon: AlertCircle,
  },
}

export function GoNoGoBadge() {
  const config = decisionConfig[goNoGoDecision]
  const Icon = config.Icon

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${config.className}`}
    >
      <Icon className="w-6 h-6 flex-shrink-0" />
      <div>
        <div className="font-bold text-sm">Decision: {config.label}</div>
        {goNoGoReasonCodes.length > 0 && (
          <div className="text-[10px] opacity-90 mt-0.5">
            {goNoGoReasonCodes.join(", ")}
          </div>
        )}
        {goNoGoUpdatedAt && (
          <div className="text-[10px] opacity-75 mt-1">
            Updated: {new Date(goNoGoUpdatedAt).toISOString().split("T")[0]}
          </div>
        )}
      </div>
    </div>
  )
}
