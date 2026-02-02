'use client'

import { Search, Calendar } from 'lucide-react'
import { useViewMode } from '@/src/lib/stores/view-mode-store'
import type { ViewMode, RiskOverlay } from '@/src/lib/stores/view-mode-store'

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'history', label: 'History' },
  { value: 'approval', label: 'Approval' },
  { value: 'compare', label: 'Compare' },
]

const RISK_OVERLAYS: { value: RiskOverlay; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'all', label: 'All' },
  { value: 'wx', label: 'Weather' },
  { value: 'resource', label: 'Resource' },
  { value: 'permit', label: 'Permit' },
]

type GlobalControlBarProps = {
  trips?: { trip_id: string; name: string }[]
  trs?: { tr_id: string; name: string }[]
  onDateCursorChange?: (cursor: string) => void
  onReflowPreview?: () => void
}

export function GlobalControlBar({
  trips = [],
  trs = [],
  onDateCursorChange,
  onReflowPreview,
}: GlobalControlBarProps) {
  const {
    state,
    setMode,
    setDateCursor,
    setSelectedTrip,
    setSelectedTrs,
    setRiskOverlay,
    setSearch,
  } = useViewMode()

  const handleDateChange = (value: string) => {
    setDateCursor(value)
    onDateCursorChange?.(value)
    onReflowPreview?.()
  }

  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-xl border border-accent/20 bg-card/80 px-4 py-3"
      data-testid="global-control-bar"
    >
      {/* Trip selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Trip</span>
        <select
          value={state.selectedTripId ?? ''}
          onChange={(e) => setSelectedTrip(e.target.value || null)}
          className="h-8 w-[140px] rounded-md border border-input bg-background px-2 text-xs"
          data-testid="trip-select"
          aria-label="Select trip"
        >
          <option value="">Select trip</option>
          {trips.map((t) => (
            <option key={t.trip_id} value={t.trip_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* TR selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">TR</span>
        <select
          value={state.selectedTrIds[0] ?? ''}
          onChange={(e) => setSelectedTrs(e.target.value ? [e.target.value] : [])}
          className="h-8 w-[120px] rounded-md border border-input bg-background px-2 text-xs"
          data-testid="tr-select"
          aria-label="Select TR"
        >
          <option value="">Select TR</option>
          {trs.map((t) => (
            <option key={t.tr_id} value={t.tr_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Cursor */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <input
          type="datetime-local"
          value={state.dateCursor.slice(0, 16)}
          onChange={(e) => handleDateChange(new Date(e.target.value).toISOString())}
          disabled={state.mode === 'history'}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          data-testid="date-cursor"
          aria-label="Date cursor"
          title="Date cursor"
        />
      </div>

      {/* View Mode switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">View</span>
        <div className="flex rounded-lg border border-input p-0.5">
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                state.mode === m.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
              data-testid={`view-mode-${m.value}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Overlay */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Risk</span>
        <select
          value={state.riskOverlay}
          onChange={(e) => setRiskOverlay(e.target.value as RiskOverlay)}
          className="h-8 w-[100px] rounded-md border border-input bg-background px-2 text-xs"
          data-testid="risk-overlay-select"
        >
          {RISK_OVERLAYS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search..."
          value={state.searchQuery}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-[160px] rounded-md border border-input bg-background pl-8 pr-2 text-xs"
          data-testid="search-input"
        />
      </div>
    </div>
  )
}
