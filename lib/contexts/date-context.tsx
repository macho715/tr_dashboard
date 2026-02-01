"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { PROJECT_START } from "@/lib/dashboard-data"

// Fixed initial date for SSR hydration (noon UTC avoids timezone boundary issues)
const INITIAL_DATE = new Date("2026-01-26T12:00:00.000Z")

interface DateContextType {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  dayNumber: number
  formattedDate: string
}

const DateContext = createContext<DateContextType | undefined>(undefined)

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(INITIAL_DATE.getTime()))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const effectiveDate = mounted ? selectedDate : INITIAL_DATE

  // 포함일 기준 Day Number 계산: Jan 26 = Day 1
  const dayNumber =
    Math.floor(
      (effectiveDate.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

  const formattedDate = effectiveDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return (
    <DateContext.Provider
      value={{
        selectedDate: effectiveDate,
        setSelectedDate,
        dayNumber: Math.max(1, dayNumber),
        formattedDate,
      }}
    >
      {children}
    </DateContext.Provider>
  )
}

export function useDate() {
  const context = useContext(DateContext)
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider")
  }
  return context
}
