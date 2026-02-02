'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { OptionC } from '@/src/types/ssot'

// Leaflet uses window - must load only on client
const MapPanel = dynamic(() => import('./MapPanel').then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground"
      data-testid="map-panel-loading"
    >
      Loading map…
    </div>
  ),
})

type MapPanelWrapperProps = {
  selectedTripId?: string | null
  selectedTrIds?: string[]
  selectedActivityId?: string | null
  highlightedRouteId?: string | null
  onTrClick?: (trId: string) => void
  onActivitySelect?: (activityId: string) => void
}

export function MapPanelWrapper({
  selectedTripId = null,
  selectedTrIds = [],
  selectedActivityId = null,
  highlightedRouteId = null,
  onTrClick,
  onActivitySelect,
}: MapPanelWrapperProps) {
  const [ssot, setSsot] = useState<OptionC | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ssot')
      .then((res) => {
        if (!res.ok) throw new Error(`SSOT fetch failed: ${res.status}`)
        return res.json()
      })
      .then((data: OptionC) => setSsot(data))
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div
        className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-red-300 bg-red-50 text-sm text-red-700"
        data-testid="map-panel-error"
      >
        {error}
      </div>
    )
  }

  return (
    <MapPanel
      ssot={ssot}
      selectedTripId={selectedTripId}
      selectedTrIds={selectedTrIds}
      selectedActivityId={selectedActivityId}
      highlightedRouteId={highlightedRouteId}
      onTrClick={onTrClick}
      onActivitySelect={onActivitySelect}
    />
  )
}
