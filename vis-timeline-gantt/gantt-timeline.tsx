"use client"

import { useEffect, useRef, useState } from "react"
import { Timeline, DataSet } from "vis-timeline/standalone"
import "vis-timeline/styles/vis-timeline-graph2d.css"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"

interface Item {
  id: number
  group: number
  content: string
  title: string
  start: Date
  end: Date
  className: string
  progress?: number
  priority?: "Low" | "High" | "Urgent"
  assignee?: string
  type?: string
}

interface Group {
  id: number
  content: string
  title?: string
  nestedGroups?: number[]
  className?: string
}

export default function GanttTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [showGroups, setShowGroups] = useState(true)
  const [showTooltip, setShowTooltip] = useState(true)
  const [showMajorLabel, setShowMajorLabel] = useState(true)
  const [showMinorLabel, setShowMinorLabel] = useState(true)
  const [isDraggable, setIsDraggable] = useState(true)
  const [allowZoom, setAllowZoom] = useState(true)

  useEffect(() => {
    if (!timelineRef.current) return

    // Sample data
    const groups = new DataSet<Group>([
      { id: 1, content: "Planning", className: "group-header", nestedGroups: [2, 3] },
      { id: 2, content: "Briefing Meeting", className: "sub-group" },
      { id: 3, content: "Scope Definition", className: "sub-group" },
      { id: 10, content: "Visual Identity", className: "group-header", nestedGroups: [11, 12, 13] },
      { id: 11, content: "Logo Design", className: "sub-group" },
      { id: 12, content: "Visual Identity Guide", className: "sub-group" },
      { id: 13, content: "Final Presentation", className: "sub-group" },
      { id: 20, content: "Website Development", className: "group-header", nestedGroups: [21, 22, 23] },
      { id: 21, content: "Page Design", className: "sub-group" },
      { id: 22, content: "Front-end Development", className: "sub-group" },
      { id: 23, content: "Post-launch Support", className: "sub-group" },
    ])

    const items = new DataSet<Item>([
      {
        id: 1,
        group: 2,
        content: `<div class="item-content">
                    <span class="item-title">Briefing Meeting</span>
                    <span class="item-date">01/04</span>
                    <span class="item-priority low">Low</span>
                    <div class="progress-bar" style="width: 11%"></div>
                  </div>`,
        title: "CLINCH Fight Wear - Low - Progress 11%",
        start: new Date(2025, 2, 1),
        end: new Date(2025, 2, 5),
        className: "timeline-item low-priority",
        progress: 11,
        priority: "Low",
        assignee: "Tulio Portela",
      },
      {
        id: 2,
        group: 3,
        content: `<div class="item-content">
                    <span class="item-title">Scope Definition</span>
                    <span class="item-date">04/03</span>
                    <span class="item-priority low">Low</span>
                    <div class="progress-bar" style="width: 100%"></div>
                  </div>`,
        title: "CLINCH Fight Wear - Low - Progress 100%",
        start: new Date(2025, 1, 24),
        end: new Date(2025, 2, 4),
        className: "timeline-item low-priority",
        progress: 100,
        priority: "Low",
        assignee: "Tulio Portela",
      },
      {
        id: 3,
        group: 11,
        content: `<div class="item-content">
                    <span class="item-title">Logo Design</span>
                    <span class="item-date">02/03</span>
                    <span class="item-priority urgent">Urgent</span>
                    <div class="progress-bar" style="width: 65%"></div>
                  </div>`,
        title: "Shop Visual Identity - Urgent",
        start: new Date(2025, 1, 17),
        end: new Date(2025, 2, 2),
        className: "timeline-item urgent-priority",
        progress: 65,
        priority: "Urgent",
        assignee: "Nani Medeiros",
      },
      {
        id: 4,
        group: 12,
        content: `<div class="item-content">
                    <span class="item-title">Visual Identity Guide</span>
                    <span class="item-date">29/03</span>
                    <span class="item-priority low">Low</span>
                    <div class="progress-bar" style="width: 45%"></div>
                  </div>`,
        title: "CLINCH Fight Wear - Low - Progress 45%",
        start: new Date(2025, 2, 15),
        end: new Date(2025, 2, 29),
        className: "timeline-item low-priority",
        progress: 45,
        priority: "Low",
        assignee: "Nestor Portela",
      },
      {
        id: 5,
        group: 13,
        content: `<div class="item-content">
                    <span class="item-title">Final Presentation</span>
                    <span class="item-date">20/03</span>
                    <span class="item-priority low">Low</span>
                    <div class="progress-bar" style="width: 89%"></div>
                  </div>`,
        title: "Shop Visual Identity - Low - Progress 89%",
        start: new Date(2025, 2, 10),
        end: new Date(2025, 2, 20),
        className: "timeline-item low-priority",
        progress: 89,
        priority: "Low",
        assignee: "Nani Medeiros",
      },
      {
        id: 6,
        group: 21,
        content: `<div class="item-content">
                    <span class="item-title">Page Design</span>
                    <span class="item-date">07/03</span>
                    <span class="item-priority urgent">Urgent</span>
                    <div class="progress-bar" style="width: 100%"></div>
                  </div>`,
        title: "CLINCH Fight Wear - Urgent - Progress 100%",
        start: new Date(2025, 1, 25),
        end: new Date(2025, 2, 7),
        className: "timeline-item urgent-priority",
        progress: 100,
        priority: "Urgent",
        assignee: "Nestor Portela",
      },
      {
        id: 7,
        group: 22,
        content: `<div class="item-content">
                    <span class="item-title">Front-end Development</span>
                    <span class="item-date">13/03</span>
                    <span class="item-priority high">High</span>
                    <div class="progress-bar" style="width: 77%"></div>
                  </div>`,
        title: "CLINCH Fight Wear - High - Progress 77%",
        start: new Date(2025, 2, 1),
        end: new Date(2025, 2, 13),
        className: "timeline-item high-priority",
        progress: 77,
        priority: "High",
        assignee: "Tulio Portela",
      },
      {
        id: 8,
        group: 23,
        content: `<div class="item-content">
                    <span class="item-title">Post-launch Support</span>
                    <span class="item-date">10/04</span>
                    <span class="item-priority urgent">Urgent</span>
                  </div>`,
        title: "Shop Visual Identity - Urgent",
        start: new Date(2025, 3, 1),
        end: new Date(2025, 3, 10),
        className: "timeline-item urgent-priority",
        priority: "Urgent",
        assignee: "Nani Medeiros",
      },
    ])

    // Create timeline with options
    const options = {
      zoomable: allowZoom,
      moveable: true,
      selectable: true,
      editable: {
        add: false,
        updateTime: isDraggable,
        updateGroup: isDraggable,
        remove: false,
      },
      orientation: "top",
      stack: false,
      margin: {
        item: {
          horizontal: 0,
        },
      },
      showCurrentTime: true,
      format: {
        minorLabels: {
          day: "D",
        },
      },
      showMajorLabels: showMajorLabel,
      showMinorLabels: showMinorLabel,
      tooltip: {
        followMouse: true,
        overflowMethod: "cap",
      },
      groupTemplate: (group: any) => {
        if (!group || group.content === undefined) {
          return ""
        }
        return `<div class="custom-group">${group.content}</div>`
      },
      template: (item: any) => {
        return item.content
      },
      groupOrder: "id",
      horizontalScroll: true,
      verticalScroll: true,
      timeAxis: { scale: "day", step: 1 },
      start: new Date(2025, 1, 15),
      end: new Date(2025, 3, 15),
    }

    // Initialize timeline
    const newTimeline = new Timeline(timelineRef.current, items, groups, options)
    setTimeline(newTimeline)

    // Add event listeners for group clicking and collapsing
    newTimeline.on("click", (properties) => {
      if (properties.what === "group-label") {
        const clickedGroupId = properties.group
        const groupData = groups.get(clickedGroupId)

        // If the group has nested groups, toggle collapse/expand
        if (groupData && groupData.nestedGroups && groupData.nestedGroups.length > 0) {
          const isCollapsed = !groupData.className?.includes("collapsed")

          if (isCollapsed) {
            // Collapse: hide nested groups
            groupData.nestedGroups.forEach((nestedId) => {
              const nestedGroup = groups.get(nestedId)
              if (nestedGroup) {
                groups.update({ ...nestedGroup, visible: false })
              }
            })
            groups.update({ ...groupData, className: groupData.className + " collapsed" })
          } else {
            // Expand: show nested groups
            groupData.nestedGroups.forEach((nestedId) => {
              const nestedGroup = groups.get(nestedId)
              if (nestedGroup) {
                groups.update({ ...nestedGroup, visible: true })
              }
            })
            groups.update({ ...groupData, className: groupData.className?.replace(" collapsed", "") })
          }
        }

        // Scroll to the first item in this group
        scrollToGroupItems(clickedGroupId)
      }
    })

    // Function to scroll to items in a group
    const scrollToGroupItems = (groupId: number) => {
      const groupItems = items.get({
        filter: (item) => item.group === groupId,
      })

      if (groupItems.length > 0) {
        // Sort items by start date
        groupItems.sort((a, b) => a.start.getTime() - b.start.getTime())

        // Get the earliest start date and latest end date
        const earliestStart = groupItems[0].start
        const latestEnd = groupItems.reduce(
          (latest, item) => (item.end.getTime() > latest.getTime() ? item.end : latest),
          groupItems[0].end,
        )

        // Add some padding
        const startDate = new Date(earliestStart)
        startDate.setDate(startDate.getDate() - 2)

        const endDate = new Date(latestEnd)
        endDate.setDate(endDate.getDate() + 2)

        // Set the window to show these items
        newTimeline.setWindow(startDate, endDate)
      }
    }

    // Add current time marker
    const currentDate = new Date(2025, 2, 12)
    newTimeline.addCustomTime(currentDate, "current")
    newTimeline.setCustomTimeTitle("Today", "current")

    // Cleanup on unmount
    return () => {
      if (newTimeline) {
        newTimeline.destroy()
      }
    }
  }, [timelineRef, showGroups, showTooltip, showMajorLabel, showMinorLabel, isDraggable, allowZoom])

  const handleZoomIn = () => {
    if (timeline) {
      const currentRange = timeline.getWindow()
      const start = new Date(currentRange.start.valueOf())
      const end = new Date(currentRange.end.valueOf())
      const interval = end.getTime() - start.getTime()
      const newInterval = interval * 0.7
      const center = new Date((start.getTime() + end.getTime()) / 2)
      const newStart = new Date(center.getTime() - newInterval / 2)
      const newEnd = new Date(center.getTime() + newInterval / 2)
      timeline.setWindow(newStart, newEnd)
    }
  }

  const handleZoomOut = () => {
    if (timeline) {
      const currentRange = timeline.getWindow()
      const start = new Date(currentRange.start.valueOf())
      const end = new Date(currentRange.end.valueOf())
      const interval = end.getTime() - start.getTime()
      const newInterval = interval * 1.3
      const center = new Date((start.getTime() + end.getTime()) / 2)
      const newStart = new Date(center.getTime() - newInterval / 2)
      const newEnd = new Date(center.getTime() + newInterval / 2)
      timeline.setWindow(newStart, newEnd)
    }
  }

  const handleToday = () => {
    if (timeline) {
      const currentDate = new Date(2025, 2, 12)
      const start = new Date(currentDate)
      start.setDate(start.getDate() - 15)
      const end = new Date(currentDate)
      end.setDate(end.getDate() + 15)
      timeline.setWindow(start, end)
    }
  }

  const handleFitAll = () => {
    if (timeline) {
      timeline.fit()
    }
  }

  return (
    <Card className="gantt-timeline-container">
      <CardContent className="p-0">
        <div className="timeline-controls p-4 border-b flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (timeline) {
                const window = timeline.getWindow()
                const interval = window.end.getTime() - window.start.getTime()
                const distance = interval * 0.2
                const newStart = new Date(window.start.getTime() - distance)
                const newEnd = new Date(window.end.getTime() - distance)
                timeline.setWindow(newStart, newEnd)
              }
            }}
            title="Move Left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleToday} className="text-xs">
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (timeline) {
                const window = timeline.getWindow()
                const interval = window.end.getTime() - window.start.getTime()
                const distance = interval * 0.2
                const newStart = new Date(window.start.getTime() + distance)
                const newEnd = new Date(window.end.getTime() + distance)
                timeline.setWindow(newStart, newEnd)
              }
            }}
            title="Move Right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleFitAll} className="text-xs">
            Fit All
          </Button>
        </div>

        <div className="timeline-options p-4 border-b flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="showMajorLabel" checked={showMajorLabel} onCheckedChange={setShowMajorLabel} />
            <label
              htmlFor="showMajorLabel"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show Major Label
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="showMinorLabel" checked={showMinorLabel} onCheckedChange={setShowMinorLabel} />
            <label
              htmlFor="showMinorLabel"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show Minor Label
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="showTooltip" checked={showTooltip} onCheckedChange={setShowTooltip} />
            <label
              htmlFor="showTooltip"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show Tooltip
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isDraggable" checked={isDraggable} onCheckedChange={setIsDraggable} />
            <label
              htmlFor="isDraggable"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Always Draggable
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="allowZoom" checked={allowZoom} onCheckedChange={setAllowZoom} />
            <label
              htmlFor="allowZoom"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Allow Zoom
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="showGroups" checked={showGroups} onCheckedChange={setShowGroups} />
            <label
              htmlFor="showGroups"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Show Groups
            </label>
          </div>
        </div>

        <div ref={timelineRef} className="timeline-container" />
      </CardContent>
    </Card>
  )
}
