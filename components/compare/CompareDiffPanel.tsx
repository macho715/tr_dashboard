'use client'

import { useMemo } from 'react'
import type { OptionC } from '@/src/types/ssot'
import { computeActivityDiff, type ActivityDiffItem } from '@/lib/baseline/baseline-compare'

type CompareDiffPanelProps = {
  ssot: OptionC | null
  baselineId?: string | null
}

function formatTs(ts: string | null): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    return d.toISOString().slice(0, 16).replace('T', ' ')
  } catch {
    return ts
  }
}

function formatDelta(min: number): string {
  if (min === 0) return '0'
  const sign = min > 0 ? '+' : ''
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  if (d !== 0) return `${sign}${d}d`
  if (h !== 0) return `${sign}${h}h`
  return `${sign}${min}m`
}

export function CompareDiffPanel({ ssot, baselineId }: CompareDiffPanelProps) {
  const diffItems = useMemo((): ActivityDiffItem[] => {
    if (!ssot) return []
    const baseline = ssot.baselines?.items?.[baselineId ?? ssot.baselines?.current_baseline_id ?? '']
    if (!baseline?.snapshot) return []
    const activities = ssot.entities?.activities ?? {}
    return computeActivityDiff(baseline.snapshot, activities)
  }, [ssot, baselineId])

  if (!ssot) {
    return (
      <div
        className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-sm text-muted-foreground"
        data-testid="compare-diff-placeholder"
      >
        Load SSOT to compare
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="compare-diff-panel">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Compare Diff (Baseline vs Current)
      </div>
      <div className="max-h-[320px] overflow-x-auto overflow-y-auto rounded-lg border border-accent/20 bg-background/50">
        {diffItems.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No changes vs baseline
          </div>
        ) : (
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="border-b border-accent/20 bg-accent/5">
                <th className="px-2 py-1.5 text-left font-medium">Activity</th>
                <th className="px-2 py-1.5 text-left font-medium">Baseline</th>
                <th className="px-2 py-1.5 text-left font-medium">Current</th>
                <th className="px-2 py-1.5 text-left font-medium">Δ</th>
                <th className="px-2 py-1.5 text-left font-medium">Changed</th>
                <th className="px-2 py-1.5 text-left font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {diffItems.map((item) => (
                <tr
                  key={item.activity_id}
                  className="border-b border-accent/10 hover:bg-accent/5"
                  data-testid={`compare-diff-row-${item.activity_id}`}
                >
                  <td className="px-2 py-1.5">
                    <span className="font-mono">{item.activity_id}</span>
                    <br />
                    <span className="text-muted-foreground truncate max-w-[120px] block">{item.name}</span>
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {formatTs(item.baseline_start)} → {formatTs(item.baseline_end)}
                  </td>
                  <td className="px-2 py-1.5">
                    {formatTs(item.current_start)} → {formatTs(item.current_end)}
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={item.delta_minutes_start !== 0 ? 'text-amber-600' : ''}>
                      {formatDelta(item.delta_minutes_start)}
                    </span>
                    {' / '}
                    <span className={item.delta_minutes_end !== 0 ? 'text-amber-600' : ''}>
                      {formatDelta(item.delta_minutes_end)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {item.changed_fields.join(', ')}
                  </td>
                  <td className="px-2 py-1.5">
                    {item.collision_ids?.length ? (
                      <span className="rounded bg-red-500/20 px-1 py-0.5 text-red-600" title={item.collision_ids.join(', ')}>
                        COL
                      </span>
                    ) : item.constraint_flags?.length ? (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-amber-600" title={item.constraint_flags.join(', ')}>
                        {item.constraint_flags[0]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
