"use client"

import { useState } from "react"
import { StickyNote, ChevronDown } from "lucide-react"

const notes = [
  { title: "Weather window", detail: "Monitor NW wind surge for Jan 23-24.", time: "Today" },
  { title: "Port congestion", detail: "MZP slot confirmation pending for Voyage 2.", time: "Jan 21" },
  { title: "Crew rotation", detail: "SPMT team shift change scheduled for Feb 01.", time: "Jan 20" },
]

export function NotesDecisions() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className="sticky top-24 rounded-2xl border border-accent/15 bg-card/80 p-4 backdrop-blur-lg shadow-glow">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-cyan-300" />
          Notes & Decisions
        </span>
        <ChevronDown
          className={"h-4 w-4 text-slate-400 transition-transform " + (collapsed ? "-rotate-90" : "")}
        />
      </button>
      {!collapsed && (
        <div className="mt-4 space-y-3">
          {notes.map((note) => (
            <div key={note.title} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-200">{note.title}</div>
                <span className="text-xs text-slate-500">{note.time}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{note.detail}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
