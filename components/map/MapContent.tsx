'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
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

const DEFAULT_CENTER: [number, number] = [25.07, 55.15]
const DEFAULT_ZOOM = 12

export type MapContentProps = {
  locations: Record<string, { location_id: string; name: string; lat: number; lon: number }>
  routeSegments: Array<{
    routeId: string
    coords: [number, number][]
    activityId: string
    isHighlighted: boolean
  }>
  trMarkers: Array<{
    trId: string
    lat: number
    lon: number
    status: string
    hasBlockingCollision: boolean
    hasWarningCollision: boolean
    label: string
  }>
  onTrMarkerClick: (trId: string) => void
  mapStatusHex: Record<string, string>
}

export function MapContent({
  locations,
  routeSegments,
  trMarkers,
  onTrMarkerClick,
  mapStatusHex,
}: MapContentProps) {
  return (
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
        const bgColor = mapStatusHex[m.status] ?? '#64748b'
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
              click: () => onTrMarkerClick(m.trId),
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
  )
}
