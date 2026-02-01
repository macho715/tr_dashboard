/**
 * Weather Data Loader
 *
 * data/schedule/weather.json -> WeatherBlock props
 */

import weatherDataRaw from "../../data/schedule/weather.json"

export interface WeatherForecastDay {
  date: string
  summary: string
}

export interface WeatherData {
  lastUpdated: string
  forecast: WeatherForecastDay[]
  heatmapUrl?: string
}

const weatherData = weatherDataRaw as WeatherData

export const weatherLastUpdated = weatherData.lastUpdated ?? ""
export const weatherForecast = weatherData.forecast ?? []
export const weatherHeatmapUrl = weatherData.heatmapUrl ?? ""
