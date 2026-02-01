"use client"

import { Megaphone } from "lucide-react"
import { OperationalNotice } from "@/components/dashboard/alerts"

/**
 * 공지 섹션을 렌더링한다. Renders the notice section.
 */
export function NoticeSection() {
  return (
    <section id="notice" aria-label="Operational Notice">
      <div className="rounded-2xl border border-accent/15 bg-card/80 p-6 backdrop-blur-lg">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Megaphone className="h-4 w-4 text-rose-300" />
          Operational Notice
        </div>
        <OperationalNotice />
      </div>
    </section>
  )
}
