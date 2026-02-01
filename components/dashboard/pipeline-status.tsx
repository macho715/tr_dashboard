"use client"

import type { PipelineCheckItem } from "@/lib/ops/agi-schedule/types"
import { summarizePipeline } from "@/lib/utils/pipeline-summary"

type PipelineStatusProps = {
  items: PipelineCheckItem[]
}

const STATUS_CLASSES: Record<PipelineCheckItem["status"], string> = {
  PASS: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  WARN: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  FAIL: "bg-rose-500/20 text-rose-200 border-rose-400/30",
}

/**
 * 파이프라인 상태 바를 표시한다. Renders the pipeline status bar.
 */
export function PipelineStatusBar({ items }: PipelineStatusProps) {
  const summary = summarizePipeline(items)

  return (
    <div className="rounded-2xl border border-accent/15 bg-card/80 p-5 backdrop-blur-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Pipeline Status (A~N)
          </div>
          <div className="text-xs text-slate-400">
            Pass {summary.counts.PASS.toFixed(2)} · Warn{" "}
            {summary.counts.WARN.toFixed(2)} · Fail{" "}
            {summary.counts.FAIL.toFixed(2)}
          </div>
        </div>
        <div
          className={
            "rounded-full border px-4 py-1 text-[10px] font-semibold uppercase tracking-widest " +
            (summary.status === "PASS"
              ? "border-emerald-400/40 text-emerald-300"
              : summary.status === "WARN"
              ? "border-amber-400/40 text-amber-300"
              : "border-rose-400/40 text-rose-300")
          }
        >
          Data Consistency · {summary.label}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={
              "flex items-center justify-between rounded-lg border px-3 py-2 text-xs " +
              STATUS_CLASSES[item.status]
            }
          >
            <span className="font-semibold">{String.fromCharCode(65 + index)}</span>
            <span className="truncate">{item.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
