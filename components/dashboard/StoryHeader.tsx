"use client"

/**
 * Story Header (patch.md §2.1)
 * TR 선택 시 3초 내: WHERE / WHEN/WHAT / EVIDENCE
 */
type StoryHeaderProps = {
  trId: string | null
  where?: string
  whenWhat?: string
  evidence?: string
}

export function StoryHeader({ trId, where, whenWhat, evidence }: StoryHeaderProps) {
  if (!trId) {
    return (
      <div
        className="min-h-[96px] rounded-xl border border-accent/30 bg-card/60 px-4 py-3"
        data-testid="story-header-empty"
        role="region"
        aria-label="TR story summary"
      >
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-4">
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              WHERE
            </span>
            <p className="text-sm font-medium text-foreground">좌측 지도에서 TR 선택</p>
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              WHEN/WHAT
            </span>
            <p className="text-sm font-medium text-foreground">중앙 타임라인을 확인</p>
          </div>
          <div className="min-w-0 space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              EVIDENCE
            </span>
            <p className="text-sm font-medium text-foreground">우측 증빙 탭에서 확인</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="grid min-h-[96px] gap-2 rounded-xl border border-accent/30 bg-card/60 px-4 py-3 sm:grid-cols-3 sm:gap-4"
      data-testid="story-header"
      role="region"
      aria-label="TR story summary"
    >
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          WHERE
        </span>
        <p className="truncate text-sm font-medium text-foreground" title={where}>
          {where ?? "—"}
        </p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          WHEN/WHAT
        </span>
        <p className="truncate text-sm font-medium text-foreground" title={whenWhat}>
          {whenWhat ?? "—"}
        </p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          EVIDENCE
        </span>
        <p className="truncate text-sm font-medium text-foreground" title={evidence}>
          {evidence ?? "—"}
        </p>
      </div>
    </div>
  )
}
