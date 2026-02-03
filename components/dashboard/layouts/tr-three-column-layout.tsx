"use client"

import type { ReactNode } from "react"

type TrThreeColumnLayoutProps = {
  mapSlot: ReactNode
  timelineSlot: ReactNode
  detailSlot: ReactNode
}

/**
 * 2열 레이아웃: 좌 1/3 (WHERE + DETAIL), 우 2/3 (WHEN/WHAT Gantt)
 * patch.md §2.1, AGENTS.md 3열 권장 → 사용자 요청 2열
 */
export function TrThreeColumnLayout({
  mapSlot,
  timelineSlot,
  detailSlot,
}: TrThreeColumnLayoutProps) {
  return (
    <div
      className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_2fr] lg:min-h-[480px]"
      data-testid="tr-three-column-layout"
    >
      {/* Variable height: grows with detail when activity selected */}
      <div className="flex min-h-[200px] flex-col gap-4 lg:min-h-0" aria-label="WHERE and DETAIL">
        <aside
          className="min-h-[200px] flex-shrink-0 rounded-xl border border-accent/20 bg-card/60 p-4"
          aria-label="WHERE (Map)"
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            WHERE (Map)
          </h3>
          {mapSlot}
        </aside>
        <aside
          className="min-h-[200px] flex-1 rounded-xl border border-accent/20 bg-card/60 p-4"
          aria-label="DETAIL"
        >
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            DETAIL
          </h3>
          {detailSlot}
        </aside>
      </div>
      <main
        className="flex min-h-[300px] flex-col flex-1 lg:min-h-0 rounded-xl border border-accent/20 bg-card/60 p-4"
        aria-label="WHEN/WHAT (Timeline)"
      >
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          WHEN/WHAT (Timeline)
        </h3>
        {timelineSlot}
      </main>
    </div>
  )
}
