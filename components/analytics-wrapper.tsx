"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"

export function AnalyticsWrapper() {
  const [mounted, setMounted] = useState(false)
  const [storageBlocked, setStorageBlocked] = useState(false)

  useEffect(() => {
    setMounted(true)

    try {
      const testKey = "__analytics_test__"
      window.localStorage.setItem(testKey, "1")
      window.localStorage.removeItem(testKey)
    } catch {
      console.warn("[Analytics] Storage access not available, Analytics disabled")
      setStorageBlocked(true)
    }
  }, [])

  if (!mounted || storageBlocked) return null

  return <Analytics />
}
