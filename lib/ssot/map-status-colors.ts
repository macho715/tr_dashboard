/**
 * Map status colors (patch.md §4.1)
 * Route/Segment 상태 색상
 */
export type MapSegmentStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "blocked"
  | "delayed"

export const MAP_STATUS_COLORS: Record<MapSegmentStatus, string> = {
  planned: "border-slate-500/60 bg-slate-800/80", // 회색
  in_progress: "border-blue-500/60 bg-blue-900/40", // 파랑
  completed: "border-emerald-500/60 bg-emerald-900/30", // 초록
  blocked: "border-red-500/60 bg-red-900/40", // 빨강
  delayed: "border-amber-500/60 bg-amber-900/30 ring-1 ring-amber-400/50", // 주황
}

export function getMapStatusColor(status: MapSegmentStatus): string {
  return MAP_STATUS_COLORS[status] ?? MAP_STATUS_COLORS.planned
}
