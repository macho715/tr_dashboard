"use client"

import type { OpsAuditEntry, OpsState } from "@/lib/ops/agi-schedule/types"
import { PipelineStatusBar } from "@/components/dashboard/pipeline-status"
import { OpsPanel } from "@/components/ops/OpsPanel"

type LogsSectionProps = {
  ops: OpsState
  auditEntries: OpsAuditEntry[]
}

/**
 * 로그 및 파이프라인 섹션을 렌더링한다. Renders the logs and pipeline section.
 */
export function LogsSection({ ops, auditEntries }: LogsSectionProps) {
  return (
    <section id="logs" aria-label="Ops Logs" className="space-y-4">
      <PipelineStatusBar items={ops.pipeline} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-accent/15 bg-card/80 p-5 backdrop-blur-lg">
          <div className="mb-4 text-sm font-semibold text-foreground">Ops Activity Log</div>
          <div className="space-y-3">
            {auditEntries.length === 0 ? (
              <div className="text-xs text-slate-500">No commands logged yet.</div>
            ) : (
              auditEntries.map((entry) => (
                <div
                  key={entry.ts + entry.command}
                  className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between text-slate-200">
                    <span className="font-semibold">{entry.command}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(entry.ts).toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-400">{entry.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-accent/15 bg-card/80 p-4 backdrop-blur-lg">
          <OpsPanel ops={ops} />
        </div>
      </div>
    </section>
  )
}
