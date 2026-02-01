import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse date string in format "Jan 29" or "Feb 02" to Date object
 * Assumes year 2026
 */
export function parseDateString(dateStr: string): Date {
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  const parts = dateStr.trim().split(' ')
  const month = monthMap[parts[0]]
  const day = parseInt(parts[1], 10)
  return new Date(2026, month, day)
}

/**
 * Check if a date falls within a date range (inclusive)
 */
export function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const start = parseDateString(startStr)
  const end = parseDateString(endStr)
  return date >= start && date <= end
}

/**
 * Check if a date falls within any activity date range
 */
export function isDateInActivityRange(date: Date, start: string, end: string): boolean {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return date >= startDate && date <= endDate
}
