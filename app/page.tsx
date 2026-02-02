"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { DateProvider } from "@/lib/contexts/date-context"
import { DashboardHeader } from "@/components/dashboard/header"
import { StoryHeader } from "@/components/dashboard/StoryHeader"
import { type GanttChartHandle } from "@/components/dashboard/gantt-chart"
import type {
  HighlightFlags,
  TimelineView,
} from "@/components/dashboard/timeline-controls"
import { Footer } from "@/components/dashboard/footer"
import { BackToTop } from "@/components/dashboard/back-to-top"
import { VoyageFocusDrawer } from "@/components/dashboard/voyage-focus-drawer"
import { SectionNav } from "@/components/dashboard/section-nav"
import dynamic from "next/dynamic"
import { TrThreeColumnLayout } from "@/components/dashboard/layouts/tr-three-column-layout"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { NotesDecisions } from "@/components/dashboard/notes-decisions"

// Leaflet uses window - load MapPanelWrapper only on client
const MapPanelWrapper = dynamic(
  () => import("@/components/map/MapPanelWrapper").then((m) => m.MapPanelWrapper),
  { ssr: false }
)
import { WhyPanel } from "@/components/dashboard/WhyPanel"
import { ReflowPreviewPanel } from "@/components/dashboard/ReflowPreviewPanel"
import { DetailPanel } from "@/components/detail/DetailPanel"
import { ApprovalModeBanner } from "@/components/approval/ApprovalModeBanner"
import { CompareModeBanner } from "@/components/compare/CompareModeBanner"
import { HistoryEvidencePanel } from "@/components/history/HistoryEvidencePanel"
import { calculateSlack } from "@/lib/utils/slack-calc"
import { OverviewSection } from "@/components/dashboard/sections/overview-section"
import { KPISection } from "@/components/dashboard/sections/kpi-section"
import { AlertsSection } from "@/components/dashboard/sections/alerts-section"
import { VoyagesSection } from "@/components/dashboard/sections/voyages-section"
import { ScheduleSection } from "@/components/dashboard/sections/schedule-section"
import { GanttSection } from "@/components/dashboard/sections/gantt-section"
import { scheduleActivities } from "@/lib/data/schedule-data"
import { voyages } from "@/lib/dashboard-data"
import {
  runAgiOpsPipeline,
  createDefaultOpsState,
} from "@/lib/ops/agi-schedule/pipeline-runner"
import { runPipelineCheck } from "@/lib/ops/agi-schedule/pipeline-check"
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts"
import { reflowSchedule } from "@/lib/utils/schedule-reflow"
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store"
import type {
  ImpactReport,
  ScheduleActivity,
  ScheduleConflict,
  SuggestedAction,
} from "@/lib/ssot/schedule"

type SectionItem = {
  id: string
  label: string
  count?: number
}

const PROJECT_END_DATE = "2026-03-24"

function parseVoyageDate(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(" ")
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(Date.UTC(2026, month, day))
}

function findVoyageByActivityDate(
  activityStart: string,
  voyageList: typeof voyages
): (typeof voyages)[number] | null {
  const actDate = new Date(activityStart)
  for (const v of voyageList) {
    const loadOut = parseVoyageDate(v.loadOut)
    const jackDown = parseVoyageDate(v.jackDown)
    if (actDate >= loadOut && actDate <= jackDown) return v
  }
  return null
}

function findFirstActivityInVoyageRange(
  acts: ScheduleActivity[],
  voyage: (typeof voyages)[number]
): string | null {
  const loadOut = parseVoyageDate(voyage.loadOut)
  const jackDown = parseVoyageDate(voyage.jackDown)
  for (const a of acts) {
    if (!a.activity_id) continue
    const d = new Date(a.planned_start)
    if (d >= loadOut && d <= jackDown) return a.activity_id
  }
  return null
}

export default function Page() {
  const [activities, setActivities] = useState(scheduleActivities)
  const [activeSection, setActiveSection] = useState("overview")
  const [timelineView, setTimelineView] = useState<TimelineView>("Week")
  const [highlightFlags, setHighlightFlags] = useState<HighlightFlags>({
    delay: true,
    lock: false,
    constraint: true,
  })
  const [jumpDate, setJumpDate] = useState<string>("")
  const [jumpTrigger, setJumpTrigger] = useState(0)
  const [selectedVoyage, setSelectedVoyage] = useState<(typeof voyages)[number] | null>(null)
  const [selectedCollision, setSelectedCollision] = useState<ScheduleConflict | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [focusedActivityId, setFocusedActivityId] = useState<string | null>(null)
  const conflicts = useMemo(() => detectResourceConflicts(activities), [activities])
  const slackMap = useMemo(
    () => calculateSlack(activities, PROJECT_END_DATE),
    [activities]
  )
  const [ops, setOps] = useState(() =>
    createDefaultOpsState({ activities: scheduleActivities, projectEndDate: PROJECT_END_DATE })
  )
  const ganttRef = useRef<GanttChartHandle>(null)
  const evidenceRef = useRef<HTMLDivElement>(null)
  const [trips, setTrips] = useState<{ trip_id: string; name: string }[]>([])
  const [trs, setTrs] = useState<{ tr_id: string; name: string }[]>([])
  const [reflowPreview, setReflowPreview] = useState<{
    changes: ImpactReport["changes"]
    conflicts: ImpactReport["conflicts"]
    nextActivities: ScheduleActivity[]
  } | null>(null)

  useEffect(() => {
    fetch("/api/ssot")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.entities?.trips) {
          setTrips(
            Object.values(data.entities.trips).map((t: { trip_id: string; name: string }) => ({
              trip_id: t.trip_id,
              name: t.name,
            }))
          )
        }
        if (data?.entities?.trs) {
          setTrs(
            Object.values(data.entities.trs).map((t: { tr_id: string; name: string }) => ({
              tr_id: t.tr_id,
              name: t.name,
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const handleApplyPreview = (
    nextActivities: ScheduleActivity[],
    _impactReport: ImpactReport | null
  ) => {
    setActivities(nextActivities)
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
    if (!selectedVoyage || !ganttRef.current) return
    const activityId = findFirstActivityInVoyageRange(activities, selectedVoyage)
    if (activityId) ganttRef.current.scrollToActivity(activityId)
  }, [selectedVoyage, activities])

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

  const sections: SectionItem[] = [
    { id: "overview", label: "Overview" },
    { id: "kpi", label: "KPI", count: 6 },
    { id: "alerts", label: "Alerts", count: 2 },
    { id: "voyages", label: "Voyages", count: voyages.length },
    { id: "schedule", label: "Schedule", count: scheduleActivities.length },
    { id: "gantt", label: "Gantt" },
  ]

  const handleActivityClick = (activityId: string, start: string) => {
    setSelectedActivityId(activityId)
    const v = findVoyageByActivityDate(start, voyages)
    if (v) setSelectedVoyage(v)
  }

  const nextActivityName = useMemo(() => {
    if (!selectedVoyage) return "—"
    const activityId = findFirstActivityInVoyageRange(activities, selectedVoyage)
    if (!activityId) return "—"
    const activity = activities.find((a) => a.activity_id === activityId)
    return activity?.activity_name ?? "—"
  }, [selectedVoyage, activities])

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

  const focusTimelineActivity = (activityId: string) => {
    setFocusedActivityId(activityId)
    ganttRef.current?.scrollToActivity(activityId)
    const ganttSection = document.getElementById("gantt")
    ganttSection?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleViewInTimeline = (collision: ScheduleConflict, activityId?: string) => {
    const targetId = activityId ?? collision.activity_id
    if (!targetId) return
    focusTimelineActivity(targetId)
  }

  const handleJumpToEvidence = () => {
    evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const viewMode = useViewModeOptional()
  const canApplyReflow = viewMode?.canApplyReflow ?? true

  const handleApplyAction = (_collision: ScheduleConflict, action: SuggestedAction) => {
    if (action.kind !== "shift_activity") return
    const activityId = action.params?.activity_id as string | undefined
    const newStart = action.params?.new_start as string | undefined
    if (!activityId || !newStart) return

    try {
      const result = reflowSchedule(activities, activityId, newStart, {
        respectLocks: true,
        checkResourceConflicts: true,
      })
      setReflowPreview({
        changes: result.impact_report.changes,
        conflicts: result.impact_report.conflicts,
        nextActivities: result.activities,
      })
    } catch {
      setReflowPreview(null)
    }
  }

  const handleApplyPreviewFromWhy = () => {
    if (!reflowPreview) return
    setActivities(reflowPreview.nextActivities)
    setReflowPreview(null)
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
        <DashboardLayout
          trips={trips}
          trs={trs}
          onReflowPreview={() => setJumpTrigger((n) => n + 1)}
        >
        <ApprovalModeBanner activities={activities} />
        <CompareModeBanner
          compareResult={
            viewMode?.state.mode === "compare"
              ? calculateDelta(scheduleActivities, activities, conflicts.length, conflicts.length)
              : null
          }
        />
        <StoryHeader
          trId={selectedVoyage ? String(selectedVoyage.voyage) : null}
          where={
            selectedVoyage
              ? `Now @ Load-out ${selectedVoyage.loadOut} | ETA Sail ${selectedVoyage.sailDate}`
              : undefined
          }
          whenWhat={
            selectedVoyage
              ? `Next: ${nextActivityName} | Blockers: —`
              : undefined
          }
          evidence={
            selectedVoyage
              ? `Last: — | Missing: 0 | PTW: —`
              : undefined
          }
        />
        <OverviewSection
          activities={activities}
          onApplyActivities={handleApplyPreview}
          onSetActivities={setActivities}
          onFocusActivity={(id) => ganttRef.current?.scrollToActivity(id)}
        />
        <SectionNav activeSection={activeSection} sections={sections} />

        <div className="space-y-6">
          <KPISection />
          <AlertsSection />
          <TrThreeColumnLayout
            mapSlot={
              <div className="space-y-3">
                <MapPanelWrapper
                  selectedActivityId={selectedActivityId ?? selectedCollision?.activity_id ?? null}
                  onTrClick={() => {
                    // Phase 5: TR click → onActivitySelect fires with current activity
                  }}
                  onActivitySelect={(activityId) => {
                    setSelectedActivityId(activityId)
                    ganttRef.current?.scrollToActivity?.(activityId)
                  }}
                />
                <VoyagesSection
                  onSelectVoyage={setSelectedVoyage}
                  selectedVoyage={selectedVoyage}
                />
              </div>
            }
            timelineSlot={
              <>
                <ScheduleSection />
                <GanttSection
                  ganttRef={ganttRef}
                  activities={activities}
                  view={timelineView}
                  onViewChange={setTimelineView}
                  highlightFlags={highlightFlags}
                  onHighlightFlagsChange={setHighlightFlags}
                  jumpDate={jumpDate}
                  onJumpDateChange={setJumpDate}
                  jumpTrigger={jumpTrigger}
                  onJumpRequest={() => setJumpTrigger((n) => n + 1)}
                  onActivityClick={handleActivityClick}
                  conflicts={conflicts}
                  onCollisionClick={(col) => {
                    setSelectedCollision(col)
                    if (col.activity_id) setSelectedActivityId(col.activity_id)
                  }}
                  focusedActivityId={focusedActivityId}
                  compareDelta={
                    viewMode?.state.mode === "compare"
                      ? calculateDelta(scheduleActivities, activities, conflicts.length, conflicts.length)
                      : null
                  }
                />
              </>
            }
            detailSlot={
              <div className="space-y-3">
                <DetailPanel
                  activity={
                    selectedActivityId
                      ? activities.find((a) => a.activity_id === selectedActivityId) ?? null
                      : null
                  }
                  slackResult={
                    selectedActivityId ? slackMap.get(selectedActivityId) ?? null : null
                  }
                  conflicts={conflicts}
                  onClose={() => setSelectedActivityId(null)}
                  onCollisionClick={(col) => {
                    setSelectedCollision(col)
                    if (col.activity_id) setSelectedActivityId(col.activity_id)
                  }}
                />
                <WhyPanel
                  collision={selectedCollision}
                  onClose={() => setSelectedCollision(null)}
                  onViewInTimeline={handleViewInTimeline}
                  onJumpToEvidence={handleJumpToEvidence}
                  onRelatedActivityClick={focusTimelineActivity}
                  onApplyAction={handleApplyAction}
                />
                {reflowPreview && (
                  <ReflowPreviewPanel
                    changes={reflowPreview.changes}
                    conflicts={reflowPreview.conflicts.map((c) => ({
                      message: c.message,
                      severity: c.severity,
                    }))}
                    onApply={handleApplyPreviewFromWhy}
                    onCancel={() => setReflowPreview(null)}
                    canApply={canApplyReflow}
                  />
                )}
                <HistoryEvidencePanel
                  selectedActivityId={selectedActivityId ?? selectedCollision?.activity_id ?? null}
                  onUploadClick={(_activityId, _evidenceType) => {
                    // Phase 8: Evidence upload - TODO: open upload modal
                  }}
                />
                <div ref={evidenceRef}>
                  <NotesDecisions />
                </div>
              </div>
            }
          />
        </div>
        </DashboardLayout>

        <Footer />
        <BackToTop />
        {selectedVoyage && (
          <VoyageFocusDrawer
            voyage={selectedVoyage}
            onClose={() => setSelectedVoyage(null)}
          />
        )}
      </div>
    </DateProvider>
  )
}
