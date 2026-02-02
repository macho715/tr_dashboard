'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import type { Activity, OptionC, ReflowChange } from '@/src/types/ssot'
import {
  buildGanttRows,
  calcBarPosition,
  barRight,
  getProjectDateRange,
  getConstraintBadges,
  buildDependencyEdges,
  CONSTRAINT_ICONS,
  type GanttRow,
  type DependencyEdge,
} from '@/src/lib/timeline/gantt-utils'
import { cn } from '@/lib/utils'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const ROW_HEIGHT = 40

/** Dependency line SVG layer (T6.3: FS/SS/FF/SF arrows) */
function DependencyLinesLayer({
  edges,
  rows,
  rowHeight,
}: {
  edges: DependencyEdge[]
  rows: GanttRow[]
  rowHeight: number
}) {
  if (edges.length === 0) return null
  const totalHeight = rows.length * rowHeight
  const timelineLeftPx = 200
  const n = Math.max(1, rows.length)
  const toY = (rowIndex: number) => ((rowIndex + 0.5) / n) * 100

  return (
    <svg
      className="absolute pointer-events-none z-10"
      style={{
        top: 48,
        left: timelineLeftPx,
        width: `calc(100% - ${timelineLeftPx}px)`,
        height: totalHeight,
      }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 6 3, 0 6" fill="currentColor" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const predY = toY(e.predRowIndex)
        const succY = toY(e.succRowIndex)
        let x1: number, y1: number, x2: number, y2: number
        switch (e.type) {
          case 'fs':
            x1 = e.predRight
            y1 = predY
            x2 = e.succLeft
            y2 = succY
            break
          case 'ss':
            x1 = e.predLeft
            y1 = predY
            x2 = e.succLeft
            y2 = succY
            break
          case 'ff':
            x1 = e.predRight
            y1 = predY
            x2 = e.succRight
            y2 = succY
            break
          case 'sf':
            x1 = e.predLeft
            y1 = predY
            x2 = e.succRight
            y2 = succY
            break
          default:
            x1 = e.predRight
            y1 = predY
            x2 = e.succLeft
            y2 = succY
        }
        const midX = (x1 + x2) / 2
        const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
        return (
          <g key={`${e.predActivityId}-${e.succActivityId}-${i}`}>
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeOpacity="0.6"
              markerEnd="url(#arrowhead)"
              className="text-cyan-500"
            />
            {e.lagMin > 0 && (
              <text
                x={midX}
                y={(y1 + y2) / 2 - 2}
                fontSize="6"
                fill="currentColor"
                textAnchor="middle"
                className="text-slate-400"
              >
                +{e.lagMin}m
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** State-based bar colors (Contract v0.8.0 semantic tokens) */
const STATE_COLORS: Record<string, string> = {
  draft: 'bg-slate-500/70',
  planned: 'bg-cyan-500/80',
  ready: 'bg-emerald-500/80',
  in_progress: 'bg-amber-500/80',
  paused: 'bg-orange-500/80',
  blocked: 'bg-red-500/80',
  completed: 'bg-teal-500/80',
  canceled: 'bg-slate-400/60',
  aborted: 'bg-red-900/60',
}

/** Collision badge colors by severity */
const COLLISION_COLORS: Record<string, string> = {
  blocking: 'bg-red-600 text-red-100',
  warning: 'bg-amber-600 text-amber-100',
  info: 'bg-blue-600 text-blue-100',
}

export interface TimelineGanttProps {
  ssot: OptionC
  focusTripId?: string
  dateCursor?: Date
  onDateCursorChange?: (date: Date) => void
  /** T6.7: Ghost bars from reflow preview (proposed_changes) */
  proposedChanges?: ReflowChange[]
  selectedActivityId?: string | null
  onActivityClick?: (activityId: string) => void
  onCollisionClick?: (activityId: string, collisionIds: string[]) => void
}

export function TimelineGantt({
  ssot,
  focusTripId,
  dateCursor,
  onDateCursorChange,
  proposedChanges,
  selectedActivityId,
  onActivityClick,
  onCollisionClick,
}: TimelineGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null)
  const [isDraggingCursor, setIsDraggingCursor] = useState(false)

  const { start: projectStart, end: projectEnd } = useMemo(
    () => getProjectDateRange(ssot),
    [ssot]
  )
  const totalDays = Math.max(
    1,
    Math.ceil((projectEnd.getTime() - projectStart.getTime()) / MS_PER_DAY)
  )

  const rows = useMemo(
    () => buildGanttRows(ssot, focusTripId),
    [ssot, focusTripId]
  )

  const proposedBarPositions = useMemo(() => {
    if (!proposedChanges?.length) return new Map<string, { start_ts: string; end_ts: string }>()
    const map = new Map<string, { start_ts: string; end_ts: string }>()
    for (const c of proposedChanges) {
      if (c.path !== 'plan.start_ts' && c.path !== 'plan.end_ts') continue
      const existing = map.get(c.activity_id) ?? { start_ts: '', end_ts: '' }
      if (c.path === 'plan.start_ts' && typeof c.to === 'string') existing.start_ts = c.to
      if (c.path === 'plan.end_ts' && typeof c.to === 'string') existing.end_ts = c.to
      map.set(c.activity_id, existing)
    }
    return map
  }, [proposedChanges])

  const { activityPositions, dependencyEdges } = useMemo(() => {
    const positions = new Map<string, { left: number; right: number }>()
    rows.forEach((row) => {
      if (row.type !== 'activity' || row.activities.length === 0) return
      const act = row.activities[0]
      const pos = calcBarPosition(
        act.plan.start_ts,
        act.plan.end_ts,
        act.plan.duration_min,
        projectStart,
        projectEnd,
        totalDays
      )
      if (pos) positions.set(act.activity_id, { left: pos.left, right: barRight(pos) })
    })
    const edges = buildDependencyEdges(rows, positions)
    return { activityPositions: positions, dependencyEdges: edges }
  }, [rows, projectStart, projectEnd, totalDays])

  const dateMarks = useMemo(() => {
    const marks: { date: Date; label: string }[] = []
    const step = Math.max(1, Math.floor(totalDays / 14))
    for (let i = 0; i < totalDays; i += step) {
      const date = new Date(projectStart.getTime() + i * MS_PER_DAY)
      marks.push({
        date,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }
    return marks
  }, [projectStart, totalDays])

  const cursorDate = dateCursor ?? projectStart
  const cursorLeft =
    ((cursorDate.getTime() - projectStart.getTime()) / MS_PER_DAY / totalDays) * 100

  const handleCursorDrag = useCallback(
    (e: React.MouseEvent) => {
      const chart = chartAreaRef.current
      if (!chart || !onDateCursorChange) return
      const rect = chart.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      const daysFromStart = pct * totalDays
      const newDate = new Date(projectStart.getTime() + daysFromStart * MS_PER_DAY)
      onDateCursorChange(newDate)
    },
    [projectStart, totalDays, onDateCursorChange]
  )

  useEffect(() => {
    if (!isDraggingCursor || !onDateCursorChange) return
    const onMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const labelWidth = 200
      const chartLeft = rect.left + labelWidth
      const chartWidth = rect.width - labelWidth
      if (chartWidth <= 0) return
      const x = e.clientX - chartLeft
      const pct = Math.max(0, Math.min(1, x / chartWidth))
      const daysFromStart = pct * totalDays
      const newDate = new Date(projectStart.getTime() + daysFromStart * MS_PER_DAY)
      onDateCursorChange(newDate)
    }
    const onUp = () => setIsDraggingCursor(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDraggingCursor, projectStart, totalDays, onDateCursorChange])

  const handleBarClick = (activity: Activity) => {
    onActivityClick?.(activity.activity_id)
  }

  const handleCollisionBadgeClick = (e: React.MouseEvent, activity: Activity) => {
    e.stopPropagation()
    if (activity.calc.collision_ids.length > 0) {
      onCollisionClick?.(activity.activity_id, activity.calc.collision_ids)
    }
  }

  return (
    <section
      className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15"
      data-testid="timeline-gantt"
    >
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Calendar className="w-5 h-5 text-cyan-400" />
        Timeline (When/What)
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 p-4 bg-glass rounded-xl mb-5 border border-accent/15">
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span>Plan</span>
          <div className="w-7 h-3.5 rounded bg-cyan-500/80" />
        </div>
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span>Actual</span>
          <div className="w-7 h-3.5 rounded border-2 border-white/50 bg-cyan-500/80" />
        </div>
        <div className="flex items-center gap-2.5 text-xs font-medium text-slate-400">
          <span>Critical</span>
          <div className="w-7 h-3.5 rounded ring-2 ring-amber-400" />
        </div>
        <span className="text-slate-500">|</span>
        <div className="flex flex-wrap gap-2 text-[10px] font-medium text-slate-500">
          {Object.entries(CONSTRAINT_ICONS).map(([k, v]) => (
            <span key={k} title={k}>
              [{v}]
            </span>
          ))}
          <span className="text-red-400" title="Collision">
            [COL]
          </span>
        </div>
      </div>

      {/* Gantt */}
      <div className="overflow-x-auto" ref={containerRef}>
        <div className="relative min-w-[800px]">
          {/* Date header */}
          <div className="flex ml-[200px] mb-3 border-b border-accent/15 pb-3">
            {dateMarks.map((m) => (
              <div
                key={m.label}
                className="flex-1 min-w-[40px] text-center font-mono text-xs text-cyan-400"
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Date cursor line (T6.7: draggable) */}
          {cursorLeft >= 0 && cursorLeft <= 100 && (
            <div
              className="absolute top-9 bottom-0 z-20 cursor-grab active:cursor-grabbing"
              style={{
                left: `calc(200px + (100% - 200px) * ${cursorLeft} / 100)`,
                width: 12,
                marginLeft: -6,
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                setIsDraggingCursor(true)
              }}
              title="Drag to change date cursor"
            >
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-full bg-amber-400 pointer-events-none" />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                {cursorDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          )}

          {/* Dependency lines (T6.3) */}
          <DependencyLinesLayer
            edges={dependencyEdges}
            rows={rows}
            rowHeight={40}
          />

          {/* Rows */}
          {rows.map((row) => (
            <GanttRow
              key={row.id}
              row={row}
              projectStart={projectStart}
              projectEnd={projectEnd}
              totalDays={totalDays}
              proposedBarPositions={proposedBarPositions}
              selectedActivityId={selectedActivityId}
              hoveredActivity={hoveredActivity}
              onHover={setHoveredActivity}
              onBarClick={handleBarClick}
              onCollisionBadgeClick={handleCollisionBadgeClick}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

interface GanttRowProps {
  row: GanttRow
  projectStart: Date
  projectEnd: Date
  totalDays: number
  proposedBarPositions: Map<string, { start_ts: string; end_ts: string }>
  selectedActivityId?: string | null
  hoveredActivity: string | null
  onHover: (id: string | null) => void
  onBarClick: (activity: Activity) => void
  onCollisionBadgeClick: (e: React.MouseEvent, activity: Activity) => void
}

function GanttRow({
  row,
  projectStart,
  projectEnd,
  totalDays,
  proposedBarPositions,
  selectedActivityId,
  hoveredActivity,
  onHover,
  onBarClick,
  onCollisionBadgeClick,
}: GanttRowProps) {
  if (row.type === 'trip' || row.type === 'tr') {
    return (
      <div className="flex items-center mb-2">
        <div
          className={cn(
            'w-[200px] text-xs pr-4 flex-shrink-0',
            row.type === 'trip' ? 'font-bold text-amber-400 pt-4' : 'font-medium text-slate-400 pl-4'
          )}
        >
          {row.label}
        </div>
        <div className="flex-1 h-6" />
      </div>
    )
  }

  return (
    <div className="flex items-center mb-2">
      <div className="w-[200px] text-xs pr-4 flex-shrink-0 pl-8 text-slate-500">
        {row.label}
      </div>
      <div className="flex-1 h-8 relative bg-cyan-500/[0.03] rounded border border-cyan-500/[0.08]">
        {row.activities.map((activity) => (
          <ActivityBar
            key={activity.activity_id}
            activity={activity}
            projectStart={projectStart}
            projectEnd={projectEnd}
            totalDays={totalDays}
            proposedBar={proposedBarPositions.get(activity.activity_id)}
            isSelected={selectedActivityId === activity.activity_id}
            isHovered={hoveredActivity === activity.activity_id}
            onHover={onHover}
            onClick={onBarClick}
            onCollisionBadgeClick={onCollisionBadgeClick}
          />
        ))}
      </div>
    </div>
  )
}

interface ActivityBarProps {
  activity: Activity
  projectStart: Date
  projectEnd: Date
  totalDays: number
  proposedBar?: { start_ts: string; end_ts: string }
  isSelected: boolean
  isHovered: boolean
  onHover: (id: string | null) => void
  onClick: (activity: Activity) => void
  onCollisionBadgeClick: (e: React.MouseEvent, activity: Activity) => void
}

function ActivityBar({
  activity,
  projectStart,
  projectEnd,
  totalDays,
  proposedBar,
  isSelected,
  isHovered,
  onHover,
  onClick,
  onCollisionBadgeClick,
}: ActivityBarProps) {
  const planPos = calcBarPosition(
    activity.plan.start_ts,
    activity.plan.end_ts,
    activity.plan.duration_min,
    projectStart,
    projectEnd,
    totalDays
  )

  const actualPos =
    activity.actual.start_ts && activity.actual.end_ts
      ? calcBarPosition(
          activity.actual.start_ts,
          activity.actual.end_ts,
          null,
          projectStart,
          projectEnd,
          totalDays
        )
      : null

  const calcPos =
    activity.calc.es_ts && activity.calc.ef_ts
      ? calcBarPosition(
          activity.calc.es_ts,
          activity.calc.ef_ts,
          null,
          projectStart,
          projectEnd,
          totalDays
        )
      : null

  const stateColor = STATE_COLORS[activity.state] ?? 'bg-slate-500/70'
  const constraintBadges = getConstraintBadges(activity)
  const collisionCount = activity.calc.collision_ids.length
  const severity = activity.calc.collision_severity_max
  const collisionColor = severity ? COLLISION_COLORS[severity] : ''
  const slack = activity.calc.slack_min
  const isCritical = activity.calc.critical_path

  if (!planPos) return null

  return (
    <>
      {/* Plan bar (main) */}
      <div
        className={cn(
          'absolute h-6.5 top-[3px] rounded font-mono text-[9px] flex items-center justify-center gap-0.5 text-slate-900 font-bold cursor-pointer transition-all',
          stateColor,
          isCritical && 'ring-2 ring-amber-400',
          isSelected && 'ring-2 ring-cyan-400 ring-offset-2',
          (activity.actual.start_ts || activity.actual.end_ts) && 'opacity-70'
        )}
        style={{
          left: `${planPos.left}%`,
          width: `${Math.max(planPos.width, 2)}%`,
        }}
        onMouseEnter={() => onHover(activity.activity_id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onClick(activity)}
      >
        <span className="truncate px-1">{activity.title || activity.activity_id}</span>
        {constraintBadges.map((b) => (
          <span
            key={b.kind}
            className="shrink-0 rounded bg-slate-900/40 px-0.5 text-[8px]"
            title={b.kind}
          >
            {b.icon.length <= 3 ? `[${b.icon}]` : b.icon}
          </span>
        ))}
        {collisionCount > 0 && (
          <span
            className={cn('shrink-0 cursor-pointer rounded px-0.5 text-[8px]', collisionColor)}
            title="Collision - click for details"
            onClick={(e) => onCollisionBadgeClick(e, activity)}
          >
            [COL:{collisionCount}]
          </span>
        )}
        {slack !== null && slack > 0 && (
          <span className="shrink-0 text-[8px] text-slate-700">+{slack}m</span>
        )}
      </div>

      {/* Actual bar (overlay) */}
      {actualPos && (
        <div
          className={cn(
            'absolute h-6.5 top-[3px] rounded border-2 border-white/50 font-mono text-[8px] flex items-center justify-center text-slate-900 font-bold shadow-lg',
            stateColor
          )}
          style={{
            left: `${actualPos.left}%`,
            width: `${Math.max(actualPos.width, 2)}%`,
            zIndex: 5,
          }}
          title={`Actual: ${activity.actual.start_ts} → ${activity.actual.end_ts}`}
        >
          ACT
        </div>
      )}

      {/* Calc ghost bar (preview) - only if different from plan */}
      {calcPos && !activity.plan.start_ts && (
        <div
          className="absolute h-5 top-1 rounded border border-dashed border-cyan-400/60 bg-cyan-500/20 pointer-events-none"
          style={{
            left: `${calcPos.left}%`,
            width: `${Math.max(calcPos.width, 2)}%`,
          }}
        />
      )}
      {/* T6.7: Proposed bar from reflow preview */}
      {proposedBar && (proposedBar.start_ts !== activity.plan.start_ts || proposedBar.end_ts !== activity.plan.end_ts) && (() => {
        const pos = calcBarPosition(proposedBar.start_ts, proposedBar.end_ts, null, projectStart, projectEnd, totalDays)
        if (!pos) return null
        return (
          <div
            className="absolute h-5 top-1 rounded border border-dashed border-amber-400/70 bg-amber-500/25 pointer-events-none"
            style={{
              left: `${pos.left}%`,
              width: `${Math.max(pos.width, 2)}%`,
            }}
            title="Reflow preview"
          />
        )
      })()}
    </>
  )
}
