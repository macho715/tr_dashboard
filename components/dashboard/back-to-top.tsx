"use client"

import { ArrowUp } from "lucide-react"

export function BackToTop() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-30 p-3 bg-glass backdrop-blur-xl rounded-full border border-accent/30 shadow-glow hover:bg-accent/20 transition-all hover:scale-110"
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5 text-cyan-400" />
    </button>
  )
}
