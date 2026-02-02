"use client"

import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react"
import { DataSet } from "vis-data"
import { Timeline } from "vis-timeline/standalone"
import type { VisGroup, VisItem } from "@/lib/gantt/visTimelineMapper"
import { PROJECT_START, PROJECT_END } from "@/lib/dashboard-data"
import { toUtcNoon } from "@/lib/ssot/schedule"
import {
  type GanttEventBase,
  createItemSelectedEvent,
  createGanttReadyEvent,
  type TripId,
} from "@/lib/gantt/gantt-contract"

/** Task 9: Zoom/Controls - zoomIn, zoomOut, fit, moveToToday, panLeft, panRight */
export interface VisTimelineGanttHandle {
  scrollToActivity: (activityId: string) => void
  zoomIn: (percentage?: number) => void
  zoomOut: (percentage?: number) => void
  fit: () => void
  moveToToday: (date?: Date) => void
  panLeft: () => void
  panRight: () => void
}

export type TimelineView = "Day" | "Week"

type Props = {
  groups: VisGroup[]
  items: VisItem[]
  selectedDate?: Date
  /** Task 9: Day=14d visible, Week=56d visible */
  view?: TimelineView
  /** GANTTPATCH2: Event stream (ITEM_SELECTED, GANTT_READY) */
  onEvent?: (event: GanttEventBase) => void
  onItemClick?: (itemId: string) => void
  /** Bug 3: 배경 클릭 시 선택 해제 → 화면 고정 해제 */
  onDeselect?: () => void
  focusedActivityId?: string | null
  /** GANTTPATCH2: Trip context for events */
  tripId?: TripId
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const DAY_VIEW_DAYS = 14
const WEEK_VIEW_DAYS = 56

export const VisTimelineGantt = forwardRef<VisTimelineGanttHandle, Props>(
  function VisTimelineGantt(
    { groups, items, selectedDate, view = "Day", onEvent, onItemClick, onDeselect, focusedActivityId, tripId = 1 },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const timelineRef = useRef<Timeline | null>(null)
    const onItemClickRef = useRef(onItemClick)
    const onDeselectRef = useRef(onDeselect)
    const onEventRef = useRef(onEvent)
    onItemClickRef.current = onItemClick
    onDeselectRef.current = onDeselect
    onEventRef.current = onEvent

    const groupsDS = useMemo(() => new DataSet<VisGroup>([]), [])
    const itemsDS = useMemo(() => new DataSet<VisItem>([]), [])

    useImperativeHandle(ref, () => ({
      scrollToActivity(activityId: string) {
        const timeline = timelineRef.current
        if (timeline) {
          timeline.setSelection([activityId], { focus: true, animation: { duration: 200 } })
        }
      },
      zoomIn(percentage = 0.2) {
        timelineRef.current?.zoomIn(percentage, { animation: true })
      },
      zoomOut(percentage = 0.2) {
        timelineRef.current?.zoomOut(percentage, { animation: true })
      },
      fit() {
        timelineRef.current?.fit({ animation: true })
      },
      moveToToday(date?: Date) {
        const target = date ?? selectedDate ?? new Date()
        timelineRef.current?.moveTo(toUtcNoon(target), { animation: true })
      },
      panLeft() {
        const timeline = timelineRef.current
        if (!timeline) return
        const win = timeline.getWindow()
        const newStart = new Date(win.start.getTime() - 7 * MS_PER_DAY)
        const newEnd = new Date(win.end.getTime() - 7 * MS_PER_DAY)
        timeline.setWindow(newStart, newEnd, { animation: true })
      },
      panRight() {
        const timeline = timelineRef.current
        if (!timeline) return
        const win = timeline.getWindow()
        const newStart = new Date(win.start.getTime() + 7 * MS_PER_DAY)
        const newEnd = new Date(win.end.getTime() + 7 * MS_PER_DAY)
        timeline.setWindow(newStart, newEnd, { animation: true })
      },
    }), [selectedDate])

    useEffect(() => {
      if (!containerRef.current) return

      groupsDS.clear()
      groupsDS.add(groups)
      itemsDS.clear()
      itemsDS.add(items)

      const endWithPadding = new Date(PROJECT_END)
      endWithPadding.setUTCDate(endWithPadding.getUTCDate() + 1)

      const options = {
        start: PROJECT_START,
        end: endWithPadding,
        stack: false,
        multiselect: false,
        selectable: true,
        /** 액티비티 드래그로 시간 이동 (vis-timeline-gantt PoC와 동일) */
        editable: true,
        /** 선택 없이 바로 드래그 가능 (range=바 차트) */
        itemsAlwaysDraggable: { item: true, range: true },
        zoomable: true,
        moveable: true,
        /** Bug 1: 날짜를 Gantt 위에 표시 (legacy와 동일) */
        orientation: { axis: "top", item: "top" },
        showMajorLabels: true,
        showMinorLabels: true,
      }

      const timeline = new Timeline(
        containerRef.current,
        itemsDS,
        groupsDS,
        options
      )
      timelineRef.current = timeline

      timeline.on("select", (ev: { items?: (string | number)[] }) => {
        const id = ev.items?.[0]
        if (id != null) {
          const itemId = String(id)
          onItemClickRef.current?.(itemId)
          onEventRef.current?.(createItemSelectedEvent(itemId, tripId, itemId))
        } else {
          onDeselectRef.current?.()
        }
      })

      onEventRef.current?.(createGanttReadyEvent(tripId))

      if (selectedDate) {
        const noon = toUtcNoon(selectedDate)
        timeline.addCustomTime(noon, "selected-date")
        timeline.setCustomTimeTitle(`Selected Date (${noon.toISOString().split("T")[0]} UTC)`, "selected-date")
      }

      return () => {
        timeline.destroy()
        timelineRef.current = null
      }
    }, [groupsDS, itemsDS])

    useEffect(() => {
      itemsDS.clear()
      itemsDS.add(items)
    }, [itemsDS, items])

    useEffect(() => {
      groupsDS.clear()
      groupsDS.add(groups)
    }, [groupsDS, groups])

    useEffect(() => {
      const timeline = timelineRef.current
      if (!timeline || !selectedDate) return
      const noon = toUtcNoon(selectedDate)
      try {
        timeline.setCustomTime(noon, "selected-date")
      } catch {
        timeline.addCustomTime(noon, "selected-date")
      }
    }, [selectedDate])

    useEffect(() => {
      const timeline = timelineRef.current
      if (!timeline) return
      if (focusedActivityId) {
        timeline.setSelection([focusedActivityId], { focus: false, animation: { duration: 0 } })
      } else {
        timeline.setSelection([])
      }
    }, [focusedActivityId])

    /** Task 9: Sync visible window when view changes (Day=14d, Week=56d) */
    useEffect(() => {
      const timeline = timelineRef.current
      if (!timeline || !selectedDate) return
      const center = toUtcNoon(selectedDate).getTime()
      const days = view === "Week" ? WEEK_VIEW_DAYS : DAY_VIEW_DAYS
      const halfMs = (days / 2) * MS_PER_DAY
      const start = new Date(Math.max(PROJECT_START.getTime(), center - halfMs))
      const end = new Date(Math.min(PROJECT_END.getTime() + MS_PER_DAY, center + halfMs))
      timeline.setWindow(start, end, { animation: false })
    }, [view, selectedDate])

    return <div ref={containerRef} className="gantt-vis-wrapper h-full min-h-[400px] w-full" />
  }
)
