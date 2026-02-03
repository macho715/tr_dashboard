"use client"

import type { ReactNode } from "react"
import { NotesDecisions } from "@/components/dashboard/notes-decisions"

type DashboardShellProps = {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
      <main id="main" className="space-y-6">
        {children}
      </main>

      <NotesDecisions />
    </div>
  )
}
