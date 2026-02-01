"use client"

import type { ReactNode } from "react"
import { ResourceUtilizationPanel } from "@/components/dashboard/resource-utilization-panel"
import { NotesDecisions } from "@/components/dashboard/notes-decisions"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"

type DashboardShellProps = {
  selectedResource: string | null
  onSelectResource: (resource: string | null) => void
  activeSection: string
  sections: Array<{ id: string; label: string }>
  viewMode: "standard" | "compact" | "fullscreen"
  children: ReactNode
}

/**
 * 대시보드 레이아웃 셸을 렌더링한다. Renders the dashboard layout shell.
 */
export function DashboardShell({
  selectedResource,
  onSelectResource,
  activeSection,
  sections,
  viewMode,
  children,
}: DashboardShellProps) {
  const showSidebars = viewMode !== "fullscreen"
  const showRightSidebar = viewMode === "standard"
  const gridClass =
    viewMode === "fullscreen"
      ? "grid gap-6"
      : viewMode === "compact"
      ? "grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]"
      : "grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_240px]"
  return (
    <div className={gridClass}>
      {showSidebars && (
        <aside className="space-y-4">
          <div className="sticky top-24 space-y-4">
            <SidebarNav activeSection={activeSection} sections={sections} />
            <ResourceUtilizationPanel
              selectedResource={selectedResource}
              onSelectResource={onSelectResource}
            />
          </div>
        </aside>
      )}

      <main id="main" className="space-y-6">
        {children}
      </main>

      {showRightSidebar ? <NotesDecisions /> : null}
    </div>
  )
}
