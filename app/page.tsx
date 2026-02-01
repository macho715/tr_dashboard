"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { DateProvider } from "@/lib/contexts/date-context"
import { DashboardHeader } from "@/components/dashboard/header"
import { type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type {
  HighlightFlags,
  TimelineView,
} from "@/components/dashboard/timeline-controls"
import { Footer } from "@/components/dashboard/footer"
import { BackToTop } from "@/components/dashboard/back-to-top"
import { VoyageFocusDrawer } from "@/components/dashboard/voyage-focus-drawer"
import { SectionNav } from "@/components/dashboard/section-nav"
import { DashboardShell } from "@/components/dashboard/layouts/dashboard-shell"
import { OverviewSection } from "@/components/dashboard/sections/overview-section"
import { KPISection } from "@/components/dashboard/sections/kpi-section"
import { AlertsSection } from "@/components/dashboard/sections/alerts-section"
import { VoyagesSection } from "@/components/dashboard/sections/voyages-section"
import { ScheduleSection } from "@/components/dashboard/sections/schedule-section"
import { GanttSection } from "@/components/dashboard/sections/gantt-section"
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts"
import { scheduleActivities } from "@/lib/data/schedule-data"
import { voyages } from "@/lib/dashboard-data"
import {
  runAgiOpsPipeline,
  createDefaultOpsState,
} from "@/lib/ops/agi-schedule/pipeline-runner"
import { runPipelineCheck } from "@/lib/ops/agi-schedule/pipeline-check"
import type { ImpactReport, ScheduleActivity, ScheduleConflict } from "@/lib/ssot/schedule"

type SectionItem = {
  id: string
  label: string
  count?: number
}

const PROJECT_END_DATE = "2026-03-24"
const MAX_CHANGE_STACK = 6

type ChangeBatch = {
  appliedAt: string
  changes: ImpactReport["changes"]
  previousActivities: ScheduleActivity[]
}

export default function Page() {
  const [activities, setActivities] = useState(scheduleActivities)
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([])
  const [activeSection, setActiveSection] = useState("overview")
  const [resourceFilter, setResourceFilter] = useState<string>("ALL")
  const [timelineView, setTimelineView] = useState<TimelineView>("Week")
  const [highlightFlags, setHighlightFlags] = useState<HighlightFlags>({
    delay: true,
    lock: false,
    constraint: true,
  })
  const [jumpDate, setJumpDate] = useState<string>("")
  const [jumpTrigger, setJumpTrigger] = useState(0)
  const [selectedVoyage, setSelectedVoyage] = useState<(typeof voyages)[number] | null>(null)
  const [changeBatches, setChangeBatches] = useState<ChangeBatch[]>([])
  const [ops, setOps] = useState(() =>
    createDefaultOpsState({ activities: scheduleActivities, projectEndDate: PROJECT_END_DATE })
  )
  const ganttRef = useRef<GanttChartHandle>(null)

  useEffect(() => {
    setConflicts(detectResourceConflicts(activities))
  }, [activities])

  const changeImpactItems = useMemo(() => {
    const flattened = changeBatches.flatMap((batch) =>
      batch.changes.map((change) => ({
        ...change,
        appliedAt: batch.appliedAt,
      }))
    )
    return flattened.slice(-MAX_CHANGE_STACK).reverse()
  }, [changeBatches])

  const handleApplyPreview = (
    nextActivities: ScheduleActivity[],
    impactReport: ImpactReport | null
  ) => {
    setActivities((prevActivities) => {
      if (impactReport?.changes?.length) {
        setChangeBatches((prev) => {
          const nextBatch: ChangeBatch = {
            appliedAt: new Date().toISOString(),
            changes: impactReport.changes,
            previousActivities: prevActivities,
          }
          const updated = [...prev, nextBatch]
          return updated.slice(-MAX_CHANGE_STACK)
        })
      }
      return nextActivities
    })
  }

  const handleUndoChangeImpact = () => {
    setChangeBatches((prev) => {
      if (prev.length === 0) return prev
      const nextBatches = prev.slice(0, -1)
      const lastBatch = prev[prev.length - 1]
      setActivities(lastBatch.previousActivities)
      return nextBatches
    })
  }

  useEffect(() => {
    setOps((prev) => ({
      ...prev,
      pipeline: runPipelineCheck({
        activities,
        noticeDate: prev.notice.date,
        weatherDaysCount: prev.weather.days.length,
        projectEndDate: PROJECT_END_DATE,
      }),
    }))
  }, [activities])

  useEffect(() => {
    const ids = ["overview", "kpi", "alerts", "voyages", "schedule", "gantt"]
    const handler = () => {
      const scrollPosition = window.scrollY + 120
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= scrollPosition) {
          current = id
        }
      }
      setActiveSection(current)
    }
    handler()
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [])

  const sections = useMemo<SectionItem[]>(
    () => [
      { id: "overview", label: "Overview" },
      { id: "kpi", label: "KPI", count: 6 },
      { id: "alerts", label: "Alerts", count: 2 },
      { id: "voyages", label: "Voyages", count: voyages.length },
      { id: "schedule", label: "Schedule", count: scheduleActivities.length },
      { id: "gantt", label: "Gantt", count: conflicts.length },
    ],
    [conflicts.length]
  )

  const handleOpsCommand = (cmd: Parameters<typeof runAgiOpsPipeline>[0]["command"]) => {
    const { nextActivities, nextOps } = runAgiOpsPipeline({
      activities,
      ops,
      command: cmd,
      projectEndDate: PROJECT_END_DATE,
    })
    setActivities(nextActivities)
    setOps(nextOps)
  }

  return (
    <DateProvider>
      <div className="relative z-10 max-w-[1800px] mx-auto px-4 sm:px-6 py-6">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 bg-card/95 border border-accent/20 rounded-lg px-3 py-2 text-sm font-medium text-foreground shadow-glow"
        >
          Skip to content
        </a>

        <DashboardHeader />
        <OverviewSection
          conflictCount={conflicts.length}
          activities={activities}
          onApplyActivities={handleApplyPreview}
          onSetActivities={setActivities}
          onFocusActivity={(id) => ganttRef.current?.scrollToActivity(id)}
        />
        <SectionNav activeSection={activeSection} sections={sections} />

        <DashboardShell
          selectedResource={resourceFilter === "ALL" ? null : resourceFilter}
          onSelectResource={(resource) => setResourceFilter(resource ?? "ALL")}
        >
          <KPISection />
          <AlertsSection />
          <VoyagesSection onSelectVoyage={setSelectedVoyage} />
          <ScheduleSection />
          <GanttSection
            ganttRef={ganttRef}
            activities={activities}
            conflicts={conflicts}
            resourceFilter={resourceFilter}
            onResourceFilterChange={setResourceFilter}
            view={timelineView}
            onViewChange={setTimelineView}
            highlightFlags={highlightFlags}
            onHighlightFlagsChange={setHighlightFlags}
            jumpDate={jumpDate}
            onJumpDateChange={setJumpDate}
            jumpTrigger={jumpTrigger}
            onJumpRequest={() => setJumpTrigger((n) => n + 1)}
            changeImpactItems={changeImpactItems}
            onUndoChangeImpact={handleUndoChangeImpact}
          />
        </DashboardShell>

        <Footer />
        <BackToTop />
        {selectedVoyage && (
          <VoyageFocusDrawer
            voyage={selectedVoyage}
            onClose={() => setSelectedVoyage(null)}
            conflicts={conflicts}
          />
        )}
      </div>
    </DateProvider>
  )
}
