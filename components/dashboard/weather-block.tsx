"use client"

import { AlertTriangle } from "lucide-react"
import {
  weatherLastUpdated,
  weatherForecast,
  weatherHeatmapUrl,
} from "@/lib/data/weather-data"

export function WeatherBlock() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-500/35 rounded-xl px-6 py-5 flex items-start gap-4">
      <AlertTriangle className="w-7 h-7 text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="text-amber-400 text-sm font-bold mb-2 tracking-tight">
          Weather & Marine Risk Update (Mina Zayed Port)
        </h4>
        <p className="text-slate-500 text-[10px] mb-2">
          Last Updated: {weatherLastUpdated} | Update Frequency: Weekly
        </p>
        <div className="text-slate-400 text-xs leading-relaxed space-y-2">
          {weatherForecast.map((day) => (
            <p key={day.date}>
              <strong className="text-amber-300">{day.date}:</strong> {day.summary}
            </p>
          ))}
        </div>
        {weatherHeatmapUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-accent/10 max-w-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={weatherHeatmapUrl}
              alt="4-day weather heatmap"
              className="w-full h-auto object-contain"
            />
          </div>
        )}
      </div>
    </div>
  )
}
