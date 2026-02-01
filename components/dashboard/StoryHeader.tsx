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
        className="rounded-xl border border-accent/30 bg-card/60 px-4 py-3 text-center text-sm text-muted-foreground"
        data-testid="story-header-empty"
      >
        Select TR to view story
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-accent/30 bg-card/60 px-4 py-3 grid gap-2 sm:grid-cols-3 sm:gap-4"
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
