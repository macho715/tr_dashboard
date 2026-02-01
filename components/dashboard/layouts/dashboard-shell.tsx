"use client"

import type { ReactNode } from "react"
import { ResourceUtilizationPanel } from "@/components/dashboard/resource-utilization-panel"
import { NotesDecisions } from "@/components/dashboard/notes-decisions"

type DashboardShellProps = {
  selectedResource: string | null
  onSelectResource: (resource: string | null) => void
  children: ReactNode
}

export function DashboardShell({
  selectedResource,
  onSelectResource,
  children,
}: DashboardShellProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
      <ResourceUtilizationPanel
        selectedResource={selectedResource}
        onSelectResource={onSelectResource}
      />

      <main id="main" className="space-y-6">
        {children}
      </main>

      <NotesDecisions />
    </div>
  )
}
