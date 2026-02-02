import { parseUTCDate, toUtcNoon } from "@/lib/ssot/schedule"

/** Noon UTC for consistency with parseDateInput (Bug #1: date range validation at boundaries) */
export const PROJECT_START = toUtcNoon(parseUTCDate("2026-01-26"))
export const PROJECT_END = toUtcNoon(parseUTCDate("2026-03-22"))
// 포함일 기준 계산: Jan 26 = Day 1, Mar 22 = Day 56
export const TOTAL_DAYS =
  Math.floor((PROJECT_END.getTime() - PROJECT_START.getTime()) / (1000 * 60 * 60 * 24)) + 1

export const kpiData = [
  { icon: "calendar", value: "56", label: "Total Days" },
  { icon: "ship", value: "7", label: "Voyages" },
  { icon: "tool", value: "2", label: "SPMT Set" },
  { icon: "package", value: "7", label: "TR Units" },
  { icon: "flag", value: "Jan 26", label: "Start Date" },
  { icon: "target", value: "Mar 22", label: "End Date" },
]

export const voyages = [
  {
    voyage: 1,
    trUnit: "TR Unit 1",
    loadOut: "Jan 29",
    loadIn: "Feb 02",
    jackDown: "Feb 07",
    sailDate: "Jan 31",
    bay: "Bay 4",
    arrivalMZP: "Jan 27",
    sailAway: "Jan 31",
    agiArrival: "Feb 01",
    turning: "Feb 04-06",
  },
  {
    voyage: 2,
    trUnit: "TR Unit 2",
    loadOut: "Feb 05",
    loadIn: "Feb 09",
    jackDown: "Feb 14",
    sailDate: "Feb 07",
    bay: "Bay 3",
    arrivalMZP: "Feb 04",
    sailAway: "Feb 07",
    agiArrival: "Feb 08",
    turning: "Feb 11-13",
  },
  {
    voyage: 3,
    trUnit: "TR Unit 3",
    loadOut: "Feb 12",
    loadIn: "Feb 16",
    jackDown: "Feb 21",
    sailDate: "Feb 14",
    bay: "Bay 2",
    arrivalMZP: "Feb 11",
    sailAway: "Feb 14",
    agiArrival: "Feb 15",
    turning: "Feb 18-20",
  },
  {
    voyage: 4,
    trUnit: "TR Unit 4",
    loadOut: "Feb 19",
    loadIn: "Feb 23",
    jackDown: "Feb 28",
    sailDate: "Feb 21",
    bay: "Bay 1",
    arrivalMZP: "Feb 18",
    sailAway: "Feb 21",
    agiArrival: "Feb 22",
    turning: "Feb 25-27",
  },
  {
    voyage: 5,
    trUnit: "TR Unit 5",
    loadOut: "Feb 26",
    loadIn: "Mar 02",
    jackDown: "Mar 07",
    sailDate: "Feb 28",
    bay: "Bay 5",
    arrivalMZP: "Feb 25",
    sailAway: "Feb 28",
    agiArrival: "Mar 01",
    turning: "Mar 04-06",
  },
  {
    voyage: 6,
    trUnit: "TR Unit 6",
    loadOut: "Mar 05",
    loadIn: "Mar 09",
    jackDown: "Mar 14",
    sailDate: "Mar 07",
    bay: "Bay 6",
    arrivalMZP: "Mar 04",
    sailAway: "Mar 07",
    agiArrival: "Mar 08",
    turning: "Mar 11-13",
  },
  {
    voyage: 7,
    trUnit: "TR Unit 7",
    loadOut: "Mar 12",
    loadIn: "Mar 16",
    jackDown: "Mar 21",
    sailDate: "Mar 14",
    bay: "Bay 7",
    arrivalMZP: "Mar 11",
    sailAway: "Mar 14",
    agiArrival: "Mar 15",
    turning: "Mar 18-20",
  },
]

export type ActivityType =
  | "mobilization"
  | "loadout"
  | "transport"
  | "loadin"
  | "turning"
  | "jackdown"

export interface Activity {
  start: string
  end: string
  type: ActivityType
  label: string
}

export interface GanttRow {
  name: string
  isHeader?: boolean
  activities?: Activity[]
}

export const ganttData: GanttRow[] = [
  { name: "Mobilization", isHeader: true },
  {
    name: "SPMT Mobilization",
    activities: [
      { start: "2026-01-26", end: "2026-01-26", type: "mobilization", label: "MOB" },
    ],
  },
  { name: "Voyage 1: TR Unit 1 → Bay 4", isHeader: true },
  {
    name: "TR Unit 1",
    activities: [
      { start: "2026-01-29", end: "2026-01-29", type: "loadout", label: "Load-out" },
      { start: "2026-01-31", end: "2026-01-31", type: "transport", label: "Sail" },
      { start: "2026-02-02", end: "2026-02-02", type: "loadin", label: "Load-in" },
      { start: "2026-02-04", end: "2026-02-06", type: "turning", label: "Turning" },
      { start: "2026-02-07", end: "2026-02-07", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Voyage 2: TR Unit 2 → Bay 3", isHeader: true },
  {
    name: "TR Unit 2",
    activities: [
      { start: "2026-02-05", end: "2026-02-05", type: "loadout", label: "Load-out" },
      { start: "2026-02-07", end: "2026-02-07", type: "transport", label: "Sail" },
      { start: "2026-02-09", end: "2026-02-09", type: "loadin", label: "Load-in" },
      { start: "2026-02-11", end: "2026-02-13", type: "turning", label: "Turning" },
      { start: "2026-02-14", end: "2026-02-14", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Voyage 3: TR Unit 3 → Bay 2", isHeader: true },
  {
    name: "TR Unit 3",
    activities: [
      { start: "2026-02-12", end: "2026-02-12", type: "loadout", label: "Load-out" },
      { start: "2026-02-14", end: "2026-02-14", type: "transport", label: "Sail" },
      { start: "2026-02-16", end: "2026-02-16", type: "loadin", label: "Load-in" },
      { start: "2026-02-18", end: "2026-02-20", type: "turning", label: "Turning" },
      { start: "2026-02-21", end: "2026-02-21", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Voyage 4: TR Unit 4 → Bay 1", isHeader: true },
  {
    name: "TR Unit 4",
    activities: [
      { start: "2026-02-19", end: "2026-02-19", type: "loadout", label: "Load-out" },
      { start: "2026-02-21", end: "2026-02-21", type: "transport", label: "Sail" },
      { start: "2026-02-23", end: "2026-02-23", type: "loadin", label: "Load-in" },
      { start: "2026-02-25", end: "2026-02-27", type: "turning", label: "Turning" },
      { start: "2026-02-28", end: "2026-02-28", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Voyage 5: TR Unit 5 → Bay 5", isHeader: true },
  {
    name: "TR Unit 5",
    activities: [
      { start: "2026-02-26", end: "2026-02-26", type: "loadout", label: "Load-out" },
      { start: "2026-02-28", end: "2026-02-28", type: "transport", label: "Sail" },
      { start: "2026-03-02", end: "2026-03-02", type: "loadin", label: "Load-in" },
      { start: "2026-03-04", end: "2026-03-06", type: "turning", label: "Turning" },
      { start: "2026-03-07", end: "2026-03-07", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Voyage 6: TR Unit 6 → Bay 6", isHeader: true },
  {
    name: "TR Unit 6",
    activities: [
      { start: "2026-03-05", end: "2026-03-05", type: "loadout", label: "Load-out" },
      { start: "2026-03-07", end: "2026-03-07", type: "transport", label: "Sail" },
      { start: "2026-03-09", end: "2026-03-09", type: "loadin", label: "Load-in" },
      { start: "2026-03-11", end: "2026-03-13", type: "turning", label: "Turning" },
      { start: "2026-03-14", end: "2026-03-14", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Voyage 7: TR Unit 7 → Bay 7 (Final)", isHeader: true },
  {
    name: "TR Unit 7",
    activities: [
      { start: "2026-03-12", end: "2026-03-12", type: "loadout", label: "Load-out" },
      { start: "2026-03-14", end: "2026-03-14", type: "transport", label: "Sail" },
      { start: "2026-03-16", end: "2026-03-16", type: "loadin", label: "Load-in" },
      { start: "2026-03-18", end: "2026-03-20", type: "turning", label: "Turning" },
      { start: "2026-03-21", end: "2026-03-21", type: "jackdown", label: "JD" },
    ],
  },
  { name: "Demobilization", isHeader: true },
  {
    name: "SPMT Demobilization",
    activities: [
      { start: "2026-03-19", end: "2026-03-22", type: "mobilization", label: "DEMOB" },
    ],
  },
]

export const milestones = [
  { date: "Jan 26", label: "Project Start" },
  { date: "Jan 31", label: "V1 Sail TR1" },
  { date: "Feb 14", label: "V3 Sail TR3" },
  { date: "Feb 28", label: "V5 Sail TR5" },
  { date: "Mar 14", label: "V7 Sail TR7" },
  { date: "Mar 22", label: "Complete" },
]

export const legendItems = [
  { type: "mobilization", label: "Mobilization/Demob" },
  { type: "loadout", label: "Load-out (MZP)" },
  { type: "transport", label: "Sea Transport (LCT)" },
  { type: "loadin", label: "Load-in (AGI)" },
  { type: "turning", label: "Turning (180°)" },
  { type: "jackdown", label: "Jack-down" },
]

export const activityTypeNames: Record<ActivityType, string> = {
  mobilization: "Mobilization / Demobilization",
  loadout: "Load-out (Mina Zayed Port)",
  transport: "Sea Transport (LCT BUSHRA)",
  loadin: "Load-in (AGI Site Jetty)",
  turning: "Turning Operation (180°)",
  jackdown: "Jack-down to Foundation",
}
