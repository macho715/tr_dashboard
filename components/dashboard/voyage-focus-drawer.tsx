"use client"

import { useMemo } from "react"
import { X, Anchor, AlertTriangle, CalendarCheck } from "lucide-react"
import { voyages } from "@/lib/dashboard-data"
import { useDate } from "@/lib/contexts/date-context"
import { scheduleActivities } from "@/lib/data/schedule-data"
import { diffUTCDays, parseUTCDate } from "@/lib/ssot/schedule"

type Voyage = (typeof voyages)[number]

interface VoyageFocusDrawerProps {
  voyage: Voyage | null
  onClose: () => void
}

const DELAY_THRESHOLD_DAYS = 2
const RISK_LEVELS = [
  { label: "Low", color: "text-emerald-300" },
  { label: "Medium", color: "text-amber-300" },
  { label: "High", color: "text-rose-300" },
]

const formatMetric = (value: number) => value.toFixed(2)

const pickRiskLevel = (score: number) => {
  if (score >= 7) return RISK_LEVELS[2]
  if (score >= 3) return RISK_LEVELS[1]
  return RISK_LEVELS[0]
}

export function VoyageFocusDrawer({ voyage, onClose }: VoyageFocusDrawerProps) {
  const { selectedDate } = useDate()
  const miniTimeline = useMemo(() => {
    if (!voyage) return []
    return [
      { label: "Load-out", date: voyage.loadOut },
      { label: "Sail-away", date: voyage.sailDate },
      { label: "Load-in", date: voyage.loadIn },
      { label: "Turning", date: voyage.turning },
      { label: "Jack-down", date: voyage.jackDown },
    ]
  }, [voyage])

  const riskSnapshot = useMemo(() => {
    if (!voyage) {
      return {
        delayDays: 0,
        risk: RISK_LEVELS[0],
      }
    }

    const trUnitId = `TR-${voyage.voyage}`
    const voyageId = `V${voyage.voyage}`
    const voyageActivities = scheduleActivities.filter(
      (activity) => activity.tr_unit_id === trUnitId || activity.voyage_id === voyageId
    )

    const latestFinish = voyageActivities.reduce<string | null>((latest, activity) => {
      if (!activity.activity_id || !activity.planned_finish) return latest
      if (!latest) return activity.planned_finish
      return parseUTCDate(activity.planned_finish) > parseUTCDate(latest)
        ? activity.planned_finish
        : latest
    }, null)

    const selectedDateStr = selectedDate.toISOString().split("T")[0]
    const delayDays = latestFinish
      ? Math.max(0, diffUTCDays(latestFinish, selectedDateStr))
      : 0

    const delayScore = delayDays > DELAY_THRESHOLD_DAYS ? 3 : delayDays > 0 ? 1 : 0
    const riskScore = delayScore

    return {
      delayDays,
      risk: pickRiskLevel(riskScore),
    }
  }, [voyage, selectedDate])

  if (!voyage) return null

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={[
          "absolute right-0 top-0 h-full w-full max-w-md bg-slate-900/95",
          "border-l border-cyan-500/30 p-6 shadow-2xl",
        ].join(" ")}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-500">Voyage Focus</div>
            <h3 className="text-lg font-semibold text-foreground">
              Voyage {voyage.voyage} · {voyage.trUnit}
            </h3>
            <p className="text-xs text-slate-400">Bay: {voyage.bay}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-slate-700/60 p-2 text-slate-400 hover:text-cyan-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">Risk Level</div>
              <div className={`text-xs font-semibold ${riskSnapshot.risk.color}`}>
                {riskSnapshot.risk.label}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Weather window tightening after {voyage.sailDate}
            </div>
            <div className="mt-3 space-y-1 text-[11px] text-slate-400">
              <div>
                Delay days: {formatMetric(riskSnapshot.delayDays)}
              </div>
              <div className="text-[10px] text-slate-500">
                Threshold: {formatMetric(DELAY_THRESHOLD_DAYS)} days
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Anchor className="h-4 w-4 text-cyan-300" />
              Activity Summary
            </div>
            <div className="grid gap-2 text-[11px] text-slate-400">
              <div>Arrival MZP: {voyage.arrivalMZP}</div>
              <div>SPMT Load-out: {voyage.loadOut}</div>
              <div>Sail-away: {voyage.sailAway}</div>
              <div>AGI Arrival: {voyage.agiArrival}</div>
              <div>Turning: {voyage.turning}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <CalendarCheck className="h-4 w-4 text-emerald-300" />
              Mini Gantt
            </div>
            <div className="space-y-2">
              {miniTimeline.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-300">{item.label}</span>
                  <span className="text-[11px] text-slate-500">{item.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
