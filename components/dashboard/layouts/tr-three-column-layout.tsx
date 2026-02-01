"use client"

import type { ReactNode } from "react"

type TrThreeColumnLayoutProps = {
  mapSlot: ReactNode
  timelineSlot: ReactNode
  detailSlot: ReactNode
}

/**
 * 3열 레이아웃 (patch.md §2.1)
 * Map (Where) | Timeline (When/What) | Detail
 */
export function TrThreeColumnLayout({
  mapSlot,
  timelineSlot,
  detailSlot,
}: TrThreeColumnLayoutProps) {
  return (
    <div
      className="grid gap-4 lg:grid-cols-[minmax(180px,1fr)_2fr_minmax(200px,1fr)]"
      data-testid="tr-three-column-layout"
    >
      <aside
        className="min-h-[200px] rounded-xl border border-accent/20 bg-card/60 p-4"
        aria-label="WHERE (Map)"
      >
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          WHERE (Map)
        </h3>
        {mapSlot}
      </aside>
      <main
        className="min-h-[300px] rounded-xl border border-accent/20 bg-card/60 p-4"
        aria-label="WHEN/WHAT (Timeline)"
      >
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          WHEN/WHAT (Timeline)
        </h3>
        {timelineSlot}
      </main>
      <aside
        className="min-h-[200px] rounded-xl border border-accent/20 bg-card/60 p-4"
        aria-label="DETAIL"
      >
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          DETAIL
        </h3>
        {detailSlot}
      </aside>
    </div>
  )
}
