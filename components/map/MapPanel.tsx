'use client'

import { useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { OptionC, Location, Activity } from '@/src/types/ssot'
import { calculateCurrentActivityForTR, calculateCurrentLocationForTR } from '@/src/lib/derived-calc'
import { activityStateToMapStatus, MAP_STATUS_HEX, COLLISION_OUTLINE } from '@/src/lib/map-status-colors'
import type { MapStatusToken } from '@/src/lib/map-status-colors'

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
)

// L must be imported for Leaflet to work (icon fix)
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icon in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

export type MapPanelProps = {
  ssot: OptionC | null
  selectedTripId?: string | null
  selectedTrIds?: string[]
  selectedActivityId?: string | null
  highlightedRouteId?: string | null
  riskOverlay?: 'none' | 'all' | 'wx' | 'resource' | 'permit'
  onTrClick?: (trId: string) => void
  onActivitySelect?: (activityId: string) => void
}

const DEFAULT_CENTER: [number, number] = [25.07, 55.15]
const DEFAULT_ZOOM = 12

function getRoutePolyline(
  locations: Record<string, Location>,
  fromId: string,
  toId: string
): [number, number][] {
  const from = locations[fromId]
  const to = locations[toId]
  if (!from || !to) return []
  return [
    [from.lat, from.lon],
    [to.lat, to.lon],
  ]
}

export function MapPanel({
  ssot,
  selectedTripId = null,
  selectedTrIds = [],
  selectedActivityId = null,
  highlightedRouteId = null,
  riskOverlay = 'none',
  onTrClick,
  onActivitySelect,
}: MapPanelProps) {
  const locations = ssot?.entities?.locations ?? {}
  const trs = ssot?.entities?.trs ?? {}
  const activities = ssot?.entities?.activities ?? {}
  const collisions = ssot?.collisions ?? {}

  // TR markers: current position from derived calc
  const trMarkers = useMemo(() => {
    const result: Array<{
      trId: string
      lat: number
      lon: number
      status: MapStatusToken
      hasBlockingCollision: boolean
      hasWarningCollision: boolean
      label: string
    }> = []

    for (const trId of Object.keys(trs)) {
      const tr = trs[trId]
      let locId = calculateCurrentLocationForTR(ssot!, trId)
      // Fallback: use SSOT calc or first activity's from_location
      if (!locId && tr?.calc?.current_location_id) {
        locId = tr.calc.current_location_id
      }
      if (!locId) {
        const acts = Object.values(activities).filter((a) => a.tr_ids?.includes(trId))
        const first = acts[0]
        if (first?.plan?.location?.from_location_id) {
          locId = first.plan.location.from_location_id
        }
      }
      const loc = locId ? locations[locId] : null
      if (!loc) continue

      const currentActivityId = calculateCurrentActivityForTR(ssot!, trId)
      const activity = currentActivityId ? activities[currentActivityId] : null
      const status = activity
        ? activityStateToMapStatus(activity.state)
        : ('planned' as MapStatusToken)

      let hasBlocking = false
      let hasWarning = false
      if (activity) {
        for (const colId of activity.calc.collision_ids) {
          const col = collisions[colId]
          if (col?.severity === 'blocking') hasBlocking = true
          if (col?.severity === 'warning') hasWarning = true
        }
      }

      result.push({
        trId,
        lat: loc.lat,
        lon: loc.lon,
        status,
        hasBlockingCollision: hasBlocking,
        hasWarningCollision: hasWarning,
        label: tr?.name ?? trId,
      })
    }
    return result
  }, [ssot, trs, locations, activities, collisions])

  // Route segments from activities with route_id
  const routeSegments = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{
      routeId: string
      coords: [number, number][]
      activityId: string
      isHighlighted: boolean
    }> = []

    for (const activity of Object.values(activities)) {
      const loc = activity.plan?.location
      if (!loc?.route_id) continue

      const key = `${loc.from_location_id}-${loc.to_location_id}-${loc.route_id}`
      if (seen.has(key)) continue
      seen.add(key)

      const coords = getRoutePolyline(locations, loc.from_location_id, loc.to_location_id)
      if (coords.length < 2) continue

      result.push({
        routeId: loc.route_id,
        coords,
        activityId: activity.activity_id,
        isHighlighted:
          highlightedRouteId === loc.route_id || selectedActivityId === activity.activity_id,
      })
    }
    return result
  }, [activities, locations, highlightedRouteId, selectedActivityId])

  const handleTrMarkerClick = useCallback(
    (trId: string) => {
      onTrClick?.(trId)
      const currentActivityId = ssot ? calculateCurrentActivityForTR(ssot, trId) : null
      if (currentActivityId) {
        onActivitySelect?.(currentActivityId)
      }
    },
    [onTrClick, onActivitySelect, ssot]
  )

  if (!ssot) {
    return (
      <div
        className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground"
        data-testid="map-panel-placeholder"
      >
        Load SSOT to display map
      </div>
    )
  }

  return (
    <div className="h-[280px] w-full overflow-hidden rounded-lg" data-testid="map-panel">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full rounded-lg"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route polylines (background layer) */}
        {routeSegments.map((seg) => (
          <Polyline
            key={`${seg.routeId}-${seg.activityId}`}
            positions={seg.coords}
            pathOptions={{
              color: seg.isHighlighted ? '#2563eb' : '#64748b',
              weight: seg.isHighlighted ? 4 : 2,
              opacity: 0.8,
            }}
          />
        ))}

        {/* Location markers (nodes: Yard, Jetty, etc.) */}
        {Object.entries(locations).map(([locId, loc]) => (
          <Marker key={locId} position={[loc.lat, loc.lon]}>
            <Popup>{loc.name}</Popup>
          </Marker>
        ))}

        {/* TR markers with state styling (patch §4.1) */}
        {trMarkers.map((m) => {
          const bgColor = MAP_STATUS_HEX[m.status]
          const outlineColor = m.hasBlockingCollision ? '#dc2626' : m.hasWarningCollision ? '#eab308' : 'white'
          const outlineWidth = m.hasBlockingCollision || m.hasWarningCollision ? 3 : 2
          const icon = L.divIcon({
            className: 'tr-marker',
            html: `<div style="width:32px;height:32px;border-radius:50%;background:${bgColor};border:${outlineWidth}px solid ${outlineColor};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.3);color:white;font-size:10px;font-weight:bold;">${m.trId.slice(-3)}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          return (
            <Marker
              key={m.trId}
              position={[m.lat, m.lon]}
              icon={icon}
              eventHandlers={{
                click: () => handleTrMarkerClick(m.trId),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{m.label}</strong>
                  <span className="ml-1 text-muted-foreground">({m.status})</span>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
