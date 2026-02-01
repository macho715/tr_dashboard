import type { PipelineCheckItem } from "@/lib/ops/agi-schedule/types"

/**
 * 파이프라인 점검 상태를 요약한다. Summarizes pipeline check status.
 */
export function summarizePipeline(items: PipelineCheckItem[]) {
  const counts = items.reduce(
    (acc, item) => {
      acc.total += 1
      acc[item.status] += 1
      return acc
    },
    { total: 0, PASS: 0, WARN: 0, FAIL: 0 }
  )

  const status =
    counts.FAIL > 0 ? "FAIL" : counts.WARN > 0 ? "WARN" : counts.total ? "PASS" : "WARN"

  const label =
    status === "PASS" ? "Consistent" : status === "WARN" ? "Attention" : "At Risk"

  return { status, label, counts }
}
