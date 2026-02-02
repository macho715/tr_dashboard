"use client"

type SectionItem = {
  id: string
  label: string
  count?: number
}

type SectionNavProps = {
  activeSection: string
  sections: SectionItem[]
}

export function SectionNav({ activeSection, sections }: SectionNavProps) {
  return (
    <nav
      className="sticky top-0 z-20 mb-4 bg-glass backdrop-blur-xl rounded-2xl border border-accent/15 shadow-glow"
      aria-label="Section navigation"
    >
      <div className="flex flex-wrap items-center gap-2 p-3">
        {sections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <a
              key={section.id}
              className={
                "px-3 py-1.5 rounded-lg text-sm transition-colors font-medium flex items-center gap-2 " +
                (isActive
                  ? "bg-cyan-500/20 text-foreground"
                  : "hover:bg-accent/20 text-slate-300 hover:text-foreground")
              }
              href={`#${section.id}`}
            >
              {section.label}
              {typeof section.count === "number" && (
                <span className="text-xs rounded-full border border-slate-700/60 px-2 py-0.5 text-slate-400">
                  {section.count}
                </span>
              )}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
