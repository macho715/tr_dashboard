"use client"

import { useMemo } from "react"

import { scheduleActivities } from "@/lib/data/schedule-data"

interface DependencyHeatmapProps {
  onSelectActivity: (activityId: string) => void
}

type HeatmapItem = {
  id: string
  label: string
  risk: number
  chainLength: number
  upstreamCount: number
  downstreamCount: number
  hasLockedOrConstraint: boolean
}

const MAX_HEATMAP_ITEMS = 6

const buildDependencyMaps = (
  activityIds: string[],
  dependsOnMap: Map<string, string[]>
) => {
  const predecessorsById = new Map<string, string[]>()
  const successorsById = new Map<string, string[]>()

  for (const id of activityIds) {
    predecessorsById.set(id, dependsOnMap.get(id) ?? [])
    if (!successorsById.has(id)) {
      successorsById.set(id, [])
    }
  }

  for (const [activityId, predecessors] of predecessorsById.entries()) {
    for (const predecessorId of predecessors) {
      if (!successorsById.has(predecessorId)) {
        successorsById.set(predecessorId, [])
      }
      successorsById.get(predecessorId)!.push(activityId)
    }
  }

  return { predecessorsById, successorsById }
}

const collectChain = (
  startId: string,
  adjacency: Map<string, string[]>
): { ids: string[]; count: number } => {
  const visited = new Set<string>()
  const queue = [...(adjacency.get(startId) ?? [])]

  for (const id of queue) {
    visited.add(id)
  }

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    const neighbors = adjacency.get(current) ?? []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
  }

  return { ids: Array.from(visited), count: visited.size }
}

const calculateRiskScore = (
  chainLength: number,
  downstreamCount: number,
  hasLockedOrConstraint: boolean
): number => {
  const chainFactor = Math.min(2, Math.floor(chainLength / 3))
  const propagationFactor = downstreamCount > 0 ? 1 : 0
  const lockFactor = hasLockedOrConstraint ? 1 : 0
  return Math.min(5, 1 + chainFactor + propagationFactor + lockFactor)
}

const riskColor = (risk: number) => {
  if (risk >= 5) return "bg-rose-500/40"
  if (risk >= 4) return "bg-amber-500/40"
  if (risk >= 3) return "bg-yellow-500/30"
  return "bg-emerald-500/30"
}

export function DependencyHeatmap({ onSelectActivity }: DependencyHeatmapProps) {
  const heatmapData = useMemo<HeatmapItem[]>(() => {
    const activities = scheduleActivities.filter(
      (activity) => activity.activity_id !== null
    )
    const activityById = new Map(
      activities.map((activity) => [activity.activity_id!, activity])
    )

    const dependsOnMap = new Map<string, string[]>()
    for (const activity of activities) {
      const activityId = activity.activity_id!
      const predecessors = (activity.depends_on ?? [])
        .map((dependency) => dependency.predecessorId)
        .filter((id) => activityById.has(id))
      dependsOnMap.set(activityId, predecessors)
    }

    const { predecessorsById, successorsById } = buildDependencyMaps(
      Array.from(activityById.keys()),
      dependsOnMap
    )

    const items = Array.from(activityById.entries()).map(([id, activity]) => {
      const upstream = collectChain(id, predecessorsById)
      const downstream = collectChain(id, successorsById)
      const chainIds = new Set<string>([id, ...upstream.ids, ...downstream.ids])
      const hasLockedOrConstraint = Array.from(chainIds).some((activityId) => {
        const item = activityById.get(activityId)
        return Boolean(item?.is_locked || item?.constraint)
      })

      const chainLength = chainIds.size
      const risk = calculateRiskScore(
        chainLength,
        downstream.count,
        hasLockedOrConstraint
      )
      const label = `${id}: ${activity.activity_name || id}`

      return {
        id,
        label,
        risk,
        chainLength,
        upstreamCount: upstream.count,
        downstreamCount: downstream.count,
        hasLockedOrConstraint,
      }
    })

    return items
      .sort((a, b) => {
        if (b.risk !== a.risk) return b.risk - a.risk
        if (b.chainLength !== a.chainLength) return b.chainLength - a.chainLength
        return b.downstreamCount - a.downstreamCount
      })
      .slice(0, MAX_HEATMAP_ITEMS)
  }, [])

  return (
    <div className="mt-6 rounded-2xl border border-accent/15 bg-card/80 p-5 backdrop-blur-lg">
      <div className="mb-4 text-sm font-semibold text-foreground">Dependency Heatmap</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {heatmapData.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectActivity(item.id)}
            className={
              "rounded-xl border border-slate-700/60 p-3 text-left transition hover:border-cyan-500/40 " +
              riskColor(item.risk)
            }
          >
            <div className="text-xs font-semibold text-slate-200">{item.label}</div>
            <p className="mt-1 text-[11px] text-slate-400">
              Risk score {item.risk} · Chain {item.chainLength} · Downstream{" "}
              {item.downstreamCount} · Upstream {item.upstreamCount}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
