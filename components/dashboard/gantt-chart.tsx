"use client"

import React from "react"

import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { Calendar } from "lucide-react"
import {
  legendItems,
  milestones,
  PROJECT_START,
  PROJECT_END,
  TOTAL_DAYS,
  type Activity,
  type ActivityType,
  activityTypeNames,
} from "@/lib/dashboard-data"
import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data"
import type {
  DateChange,
  ScheduleActivity,
  ScheduleConflict,
} from "@/lib/ssot/schedule"
import { ResourceConflictsPanel } from "@/components/gantt/ResourceConflictsPanel"
import {
  TimelineControls,
  type HighlightFlags,
  type TimelineView,
} from "@/components/dashboard/timeline-controls"
import { DependencyHeatmap } from "@/components/dashboard/dependency-heatmap"
import { ChangeImpactStack } from "@/components/dashboard/change-impact-stack"
import { cn } from "@/lib/utils"
import { useDate } from "@/lib/contexts/date-context"

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAYS_PER_WEEK = 7

const activityColors: Record<ActivityType, string> = {
  mobilization: "bg-gradient-to-r from-violet-400 to-violet-500 shadow-violet-500/40",
  loadout: "bg-gradient-to-r from-cyan-300 to-cyan-500 shadow-cyan-500/40",
  transport: "bg-gradient-to-r from-amber-300 to-amber-500 shadow-amber-500/40",
  loadin: "bg-gradient-to-r from-emerald-300 to-emerald-500 shadow-emerald-500/40",
  turning: "bg-gradient-to-r from-pink-400 to-pink-500 shadow-pink-500/40",
  jackdown: "bg-gradient-to-r from-blue-400 to-blue-500 shadow-blue-500/40",
}

const legendColors: Record<string, string> = {
  mobilization: "bg-gradient-to-r from-violet-400 to-violet-500",
  loadout: "bg-gradient-to-r from-cyan-300 to-cyan-500",
  transport: "bg-gradient-to-r from-amber-300 to-amber-500",
  loadin: "bg-gradient-to-r from-emerald-300 to-emerald-500",
  turning: "bg-gradient-to-r from-pink-400 to-pink-500",
  jackdown: "bg-gradient-to-r from-blue-400 to-blue-500",
}

function calcPosition(
  startDate: string,
  endDate: string,
  view: TimelineView,
  totalUnits: number
) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const startDays =
    Math.floor((start.getTime() - PROJECT_START.getTime()) / MS_PER_DAY) + 1
  const duration =
    Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1
  if (view === "Week") {
    const startWeeks = Math.floor((startDays - 1) / DAYS_PER_WEEK) + 1
    const durationWeeks = Math.max(1, Math.ceil(duration / DAYS_PER_WEEK))
    return {
      left: ((startWeeks - 1) / totalUnits) * 100,
      width: Math.max((durationWeeks / totalUnits) * 100, 3),
    }
  }
  return {
    left: ((startDays - 1) / totalUnits) * 100,
    width: Math.max((duration / totalUnits) * 100, 1.8),
  }
}

function formatShortDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${month}-${day}`
}

function parseJumpDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  activity: Activity | null
}

export interface GanttChartHandle {
  scrollToActivity: (activityId: string) => void
}

interface GanttChartProps {
  activities: ScheduleActivity[]
  conflicts?: ScheduleConflict[]
  resourceFilter?: string
  onResourceFilterChange?: (resource: string) => void
  view: TimelineView
  onViewChange: (view: TimelineView) => void
  highlightFlags: HighlightFlags
  onHighlightFlagsChange: (flags: HighlightFlags) => void
  jumpDate: string
  onJumpDateChange: (value: string) => void
  jumpTrigger?: number
  onJumpRequest?: () => void
  changeImpactItems?: Array<DateChange & { appliedAt: string }>
  onUndoChangeImpact?: () => void
}

export const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(function GanttChart(
  {
    activities,
    conflicts = [],
    resourceFilter,
    onResourceFilterChange,
    view,
    onViewChange,
    highlightFlags,
    onHighlightFlagsChange,
    jumpDate,
    onJumpDateChange,
    jumpTrigger = 0,
    onJumpRequest,
    changeImpactItems = [],
    onUndoChangeImpact,
  },
  ref
) {
  const { selectedDate, setSelectedDate } = useDate()
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    activity: null,
  })
  const ganttContainerRef = useRef<HTMLDivElement>(null)
  const activityRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const ganttRows = scheduleActivitiesToGanttRows(activities)
  const totalWeeks = Math.ceil(TOTAL_DAYS / DAYS_PER_WEEK)
  const totalUnits = view === "Day" ? TOTAL_DAYS : totalWeeks
  const unitWidth = view === "Day" ? 22 : 120
  const chartWidth = Math.max(1000, totalUnits * unitWidth)

  const activityMeta = useMemo(() => {
    const map = new Map<string, ScheduleActivity>()
    for (const activity of activities) {
      if (activity.activity_id) {
        map.set(activity.activity_id, activity)
      }
    }
    return map
  }, [activities])

  const dateMarks = useMemo(() => {
    const marks: string[] = []
    const step = view === "Day" ? 1 : DAYS_PER_WEEK
    const totalSteps = view === "Day" ? TOTAL_DAYS : totalWeeks
    for (let i = 0; i < totalSteps; i += 1) {
      const offset = i * step
      const date = new Date(PROJECT_START.getTime() + offset * MS_PER_DAY)
      marks.push(formatShortDate(date))
    }
    return marks
  }, [view, totalWeeks])

  const getDatePosition = (date: Date) => {
    const daysFromStart =
      Math.floor((date.getTime() - PROJECT_START.getTime()) / MS_PER_DAY) + 1
    if (view === "Week") {
      const weeksFromStart = Math.floor((daysFromStart - 1) / DAYS_PER_WEEK) + 1
      return Math.max(0, Math.min(100, ((weeksFromStart - 0.5) / totalUnits) * 100))
    }
    return Math.max(0, Math.min(100, ((daysFromStart - 0.5) / totalUnits) * 100))
  }

  const scrollToActivity = (activityId: string) => {
    const normalizedId = activityId.split(":")[0].trim()
    const el = activityRefs.current.get(normalizedId)
    if (!el) {
      for (const [key, value] of activityRefs.current.entries()) {
        const keyId = key.split(":")[0].trim()
        if (key.startsWith(normalizedId) || normalizedId.startsWith(keyId)) {
          value.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
          return
        }
      }
      return
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
  }

  useImperativeHandle(ref, () => ({ scrollToActivity }), [])

  const selectedDatePosition = getDatePosition(selectedDate)

  useEffect(() => {
    activityRefs.current.clear()
  }, [ganttRows])

  useEffect(() => {
    if (jumpTrigger === 0) return
    if (!jumpDate) return
    const parsed = parseJumpDate(jumpDate)
    if (!parsed) return
    const clamped = new Date(
      Math.min(Math.max(parsed.getTime(), PROJECT_START.getTime()), PROJECT_END.getTime())
    )
    setSelectedDate(clamped)

    const container = ganttContainerRef.current
    if (!container) return
    const content = container.firstElementChild as HTMLElement | null
    const contentWidth = content?.offsetWidth ?? container.scrollWidth
    const targetLeft = (getDatePosition(clamped) / 100) * contentWidth
    const nextScrollLeft = Math.max(0, targetLeft - container.clientWidth / 2)
    container.scrollTo({ left: nextScrollLeft, behavior: "smooth" })
    // Only run when Go is clicked (jumpTrigger). Omit setSelectedDate from deps:
    // it's a stable setState setter; including it can cause redundant runs if
    // DateProvider re-renders and context value reference changes.
  }, [jumpTrigger, jumpDate, view])

  const getHighlightClass = (meta: ScheduleActivity | undefined, activityEnd: string) => {
    if (!meta) return ""
    const isLocked = Boolean(meta.is_locked)
    const hasConstraint = Boolean(meta.constraint)
    const plannedFinish = new Date(`${activityEnd}T12:00:00.000Z`)
    const isDelayed =
      meta.status === "blocked" ||
      (meta.status !== "done" && plannedFinish.getTime() < selectedDate.getTime())
    if (highlightFlags.delay && isDelayed) {
      return "ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-900"
    }
    if (highlightFlags.lock && isLocked) {
      return "ring-2 ring-fuchsia-400/80 ring-offset-2 ring-offset-slate-900"
    }
    if (highlightFlags.constraint && hasConstraint) {
      return "ring-2 ring-sky-400/80 ring-offset-2 ring-offset-slate-900"
    }
    return ""
  }

  const handleMouseEnter = (e: React.MouseEvent, activity: Activity) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      activity,
    })
  }

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, activity: null })
  }

  return (
    <section className="bg-card/85 backdrop-blur-lg rounded-2xl p-6 border border-accent/15">
      <h2 className="text-foreground text-base font-bold mb-5 flex items-center gap-2 tracking-tight">
        <Calendar className="w-5 h-5 text-cyan-400" />
        Gantt Chart (Jan 26 - Mar 22, 2026)
        <span className="flex-1 h-px bg-gradient-to-r from-accent/40 to-transparent ml-3" />
      </h2>

      <TimelineControls
        view={view}
        onViewChange={onViewChange}
        highlightFlags={highlightFlags}
        onHighlightFlagsChange={onHighlightFlagsChange}
        jumpDate={jumpDate}
        onJumpDateChange={onJumpDateChange}
        onJumpRequest={onJumpRequest}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-5 p-4 bg-glass rounded-xl mb-5 border border-accent/15">
        {legendItems.map((item) => (
          <div
            key={item.type}
            className="flex items-center gap-2.5 text-xs font-medium text-slate-400"
          >
            <div
              className={cn("w-7 h-3.5 rounded shadow-md", legendColors[item.type])}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Gantt Container */}
      <div className="overflow-x-auto" ref={ganttContainerRef}>
        <div className="relative" style={{ minWidth: `${chartWidth}px` }}>
          {/* Date Header */}
          <div className="flex ml-[200px] lg:ml-[220px] mb-3 border-b border-accent/15 pb-3">
            {dateMarks.map((date) => (
              <div
                key={date}
                className="flex-1 text-center font-mono text-xs text-cyan-400 font-semibold tracking-wide"
              >
                {date}
              </div>
            ))}
          </div>

          {selectedDate >= PROJECT_START && selectedDate <= PROJECT_END && (
            <div
              className="absolute top-[36px] bottom-0 w-0.5 bg-amber-400 z-20 pointer-events-none"
              style={{ left: `${selectedDatePosition}%` }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                {selectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          )}

          {/* Gantt Rows */}
          {ganttRows.map((row, index) => (
            <div key={index} className="flex items-center mb-2">
              <div
                className={cn(
                  "w-[200px] lg:w-[220px] text-xs pr-4 flex-shrink-0",
                  row.isHeader
                    ? "font-bold text-amber-400 pt-4 tracking-wide"
                    : "font-medium text-slate-400"
                )}
              >
                {row.name}
              </div>
              <div className="flex-1 h-8 relative bg-cyan-500/[0.03] rounded border border-cyan-500/[0.08]">
                {row.activities?.map((activity, actIndex) => {
                  const pos = calcPosition(activity.start, activity.end, view, totalUnits)
                  const refKey = activity.label.split(":")[0].trim()
                  const meta = activityMeta.get(refKey)
                  const highlightClass = getHighlightClass(meta, activity.end)
                  return (
                    <div
                      key={actIndex}
                      ref={(node) => {
                        if (node && activity.label) {
                          activityRefs.current.set(refKey, node)
                        }
                      }}
                      className={cn(
                        "absolute h-6.5 top-[3px] rounded font-mono text-[9px] flex items-center justify-center text-slate-900 font-bold cursor-pointer transition-transform hover:scale-y-110 hover:scale-x-[1.02] hover:z-10 shadow-md",
                        activityColors[activity.type],
                        highlightClass
                      )}
                      style={{
                        left: `${pos.left}%`,
                        width: `${pos.width}%`,
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, activity)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span className="truncate px-1">{activity.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="flex justify-between items-start px-6 py-7 bg-glass rounded-xl mt-6 relative border border-accent/15">
        <div className="absolute top-12 left-[70px] right-[70px] h-0.5 bg-gradient-to-r from-cyan-500 via-amber-400 via-emerald-500 to-blue-500 rounded" />
        {milestones.map((milestone, index) => (
          <div key={index} className="text-center relative z-10">
            <div className="w-4.5 h-4.5 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full mx-auto mb-3 border-[3px] border-slate-800 shadow-[0_0_0_3px_rgba(6,182,212,0.3)]" />
            <div className="font-mono text-sm font-bold text-cyan-400 mb-1">
              {milestone.date}
            </div>
            <div className="text-[10px] font-medium text-slate-500 max-w-[80px]">
              {milestone.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.activity && (
        <div
          className="fixed z-50 bg-slate-800 border border-cyan-500/40 rounded-lg px-4 py-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-bold text-foreground text-sm mb-1">
            {tooltip.activity.label}
          </div>
          <div className="text-xs text-slate-400 space-y-0.5">
            <p>
              <strong className="text-slate-300">Period:</strong>{" "}
              {tooltip.activity.start} ~ {tooltip.activity.end}
            </p>
            <p>
              <strong className="text-slate-300">Type:</strong>{" "}
              {activityTypeNames[tooltip.activity.type]}
            </p>
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <ResourceConflictsPanel
          conflicts={conflicts}
          onSelectActivity={scrollToActivity}
          resourceFilter={resourceFilter}
          onResourceFilterChange={onResourceFilterChange}
        />
      )}

      <DependencyHeatmap onSelectActivity={scrollToActivity} />
      <ChangeImpactStack
        changes={changeImpactItems}
        onUndo={onUndoChangeImpact}
      />
    </section>
  )
})
