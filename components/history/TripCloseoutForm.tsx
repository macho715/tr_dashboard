'use client'

import { useState } from 'react'
import type { OptionC } from '@/src/types/ssot'
import { generateTripReport, tripReportToMarkdown, tripReportToJson } from '@/lib/reports/trip-report'

type TripCloseoutFormProps = {
  ssot: OptionC | null
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function TripCloseoutForm({ ssot }: TripCloseoutFormProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>('')

  const tripIds = ssot?.entities?.trips ? Object.keys(ssot.entities.trips) : []
  const tripId = (selectedTripId || tripIds[0]) ?? ''

  const handleExportMd = () => {
    if (!ssot || !tripId) return
    const report = generateTripReport(tripId, null, ssot)
    const md = tripReportToMarkdown(report)
    downloadBlob(new Blob([md], { type: 'text/markdown' }), `trip-report-${tripId}.md`)
  }

  const handleExportJson = () => {
    if (!ssot || !tripId) return
    const report = generateTripReport(tripId, null, ssot)
    const json = tripReportToJson(report)
    downloadBlob(new Blob([json], { type: 'application/json' }), `trip-report-${tripId}.json`)
  }

  if (!ssot) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-sm text-muted-foreground">
        Load SSOT to export
      </div>
    )
  }

  return (
    <div className="space-y-3" data-testid="trip-closeout-form">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Trip Closeout / Report Export
      </div>
      {tripIds.length > 1 && (
        <div>
          <label htmlFor="trip-select" className="sr-only">Select trip</label>
          <select
            id="trip-select"
            value={tripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="rounded border border-accent/30 px-2 py-1 text-xs"
            aria-label="Select trip"
          >
            {tripIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExportMd}
          disabled={!tripId}
          className="rounded border border-accent/30 px-3 py-2 text-xs hover:bg-accent/10 disabled:opacity-50"
          data-testid="export-trip-report-md"
        >
          Export MD
        </button>
        <button
          type="button"
          onClick={handleExportJson}
          disabled={!tripId}
          className="rounded border border-accent/30 px-3 py-2 text-xs hover:bg-accent/10 disabled:opacity-50"
          data-testid="export-trip-report-json"
        >
          Export JSON
        </button>
      </div>
    </div>
  )
}
