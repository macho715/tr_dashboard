import GanttTimeline from "@/gantt-timeline"
import "@/gantt-timeline.css"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Gantt Timeline</h1>
      <p className="mb-6 text-gray-600">
        A customized vis-timeline component styled to match the Gantt timeline from Bubble.io plugin.
      </p>
      <GanttTimeline />
    </main>
  )
}
