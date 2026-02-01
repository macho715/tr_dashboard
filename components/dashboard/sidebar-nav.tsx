"use client"

import {
  ClipboardList,
  Cloud,
  LayoutPanelLeft,
  ListChecks,
  Megaphone,
  Route,
} from "lucide-react"

type NavItem = {
  id: string
  label: string
  icon: JSX.Element
}

type SidebarNavProps = {
  activeSection: string
  sections: Array<{ id: string; label: string }>
}

const ICONS: Record<string, JSX.Element> = {
  timeline: <Route className="h-4 w-4 text-cyan-300" />,
  voyages: <LayoutPanelLeft className="h-4 w-4 text-amber-300" />,
  weather: <Cloud className="h-4 w-4 text-sky-300" />,
  kpi: <ListChecks className="h-4 w-4 text-emerald-300" />,
  notice: <Megaphone className="h-4 w-4 text-rose-300" />,
  logs: <ClipboardList className="h-4 w-4 text-slate-300" />,
}

/**
 * 좌측 내비게이션을 렌더링한다. Renders the left navigation rail.
 */
export function SidebarNav({ activeSection, sections }: SidebarNavProps) {
  const navItems: NavItem[] = sections.map((section) => ({
    id: section.id,
    label: section.label,
    icon:
      ICONS[section.id] ?? <ClipboardList className="h-4 w-4 text-slate-300" />,
  }))

  return (
    <nav
      aria-label="Primary navigation"
      className="rounded-2xl border border-accent/15 bg-card/80 p-4 backdrop-blur-lg shadow-glow"
    >
      <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Navigation
      </div>
      <div className="space-y-2">
        {navItems.map((item) => {
          const isActive = item.id === activeSection
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={
                "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition " +
                (isActive
                  ? "border-cyan-400/50 bg-cyan-500/10 text-foreground"
                  : "border-transparent text-slate-400 hover:border-accent/25 hover:text-slate-200")
              }
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
