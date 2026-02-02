'use client'

import type { ReactNode } from 'react'
import { ViewModeProvider } from '@/src/lib/stores/view-mode-store'
import { GlobalControlBar } from '@/components/control-bar/GlobalControlBar'

type DashboardLayoutProps = {
  children: ReactNode
  trips?: { trip_id: string; name: string }[]
  trs?: { tr_id: string; name: string }[]
  onDateCursorChange?: (cursor: string) => void
  onReflowPreview?: () => void
}

/**
 * Dashboard layout (patch.md §2.1)
 * Global Control Bar + 3-column layout + Bottom panel
 */
export function DashboardLayout({
  children,
  trips = [],
  trs = [],
  onDateCursorChange,
  onReflowPreview,
}: DashboardLayoutProps) {
  return (
    <ViewModeProvider>
      <div className="flex flex-1 flex-col min-h-0 space-y-4" data-testid="dashboard-layout">
        <GlobalControlBar
          trips={trips}
          trs={trs}
          onDateCursorChange={onDateCursorChange}
          onReflowPreview={onReflowPreview}
        />
        {children}
      </div>
    </ViewModeProvider>
  )
}
