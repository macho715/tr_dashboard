/**
 * 날짜 문자열을 기준일과 비교해 상태를 반환한다. Returns a date status for UI highlights.
 */
export type DateStatus = "past" | "today" | "tomorrow" | "upcoming"

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

/**
 * "Jan 29" 또는 "Feb 04-06" 같은 문자열을 Date로 변환한다. Parses short dates to Date.
 */
export function parseShortDate(label: string, year: number): Date | null {
  const cleaned = label.split("-")[0]?.trim()
  if (!cleaned) return null
  const [monthToken, dayToken] = cleaned.split(" ")
  if (!monthToken || !dayToken) return null
  const monthIndex = MONTH_INDEX[monthToken]
  const dayNumber = Number(dayToken)
  if (Number.isNaN(dayNumber) || monthIndex === undefined) return null
  return new Date(Date.UTC(year, monthIndex, dayNumber, 12, 0, 0))
}

/**
 * 기준일 대비 상태를 반환한다. Returns the status relative to a reference date.
 */
export function getDateStatus(
  targetDate: Date | null,
  referenceDate: Date
): DateStatus | null {
  if (!targetDate) return null
  const ref = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      12,
      0,
      0
    )
  )
  const target = new Date(
    Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      12,
      0,
      0
    )
  )
  const diffDays = Math.round((target.getTime() - ref.getTime()) / 86_400_000)
  if (diffDays < 0) return "past"
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "tomorrow"
  return "upcoming"
}

/**
 * 상태에 따른 클래스 문자열을 반환한다. Returns utility classes for date status.
 */
export function getStatusClasses(status: DateStatus | null): string {
  if (status === "today") return "bg-cyan-500/20 text-cyan-200"
  if (status === "tomorrow") return "bg-amber-500/20 text-amber-200"
  if (status === "past") return "opacity-50"
  return ""
}
