export type RepeatUnit = 'DAY' | 'WEEK' | 'MONTH'
export type EndType = 'NONE' | 'DATE' | 'COUNT'

export interface RuleInput {
  startDate: Date
  repeatInterval: number
  repeatUnit: RepeatUnit
  repeatDays: number[] // 0=월, 1=화, 2=수, 3=목, 4=금 (WEEK 시만 사용)
  endType: EndType
  endDate: Date | null
  endCount: number | null
}

export interface AcademicEventInput {
  date: Date
  endDate?: Date | null
  allowException: boolean
}

// Work entirely in UTC to avoid timezone shifts
function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function toMondayBasedDayUTC(date: Date): number {
  // JS UTC: 0=일, 1=월...6=토 → 0=월, 1=화...4=금, 5=토, 6=일
  const d = date.getUTCDay()
  return d === 0 ? 6 : d - 1
}

function getMondayOfWeekUTC(date: Date): Date {
  const d = utcDateOnly(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function isBlocked(date: Date, events: AcademicEventInput[]): boolean {
  return events.some((e) => {
    if (e.allowException) return false
    const start = utcDateOnly(e.date)
    const end = e.endDate ? utcDateOnly(e.endDate) : start
    return date >= start && date <= end
  })
}

export function expandRule(
  rule: RuleInput,
  academicEvents: AcademicEventInput[],
  termEndDate: Date
): Date[] {
  const dates: Date[] = []

  // All dates normalized to UTC midnight
  const current = utcDateOnly(rule.startDate)
  const termEnd = utcDateOnly(termEndDate)
  const startMonday = getMondayOfWeekUTC(rule.startDate)
  const startUTC = utcDateOnly(rule.startDate)

  let count = 0

  while (current <= termEnd) {
    if (rule.endType === 'DATE' && rule.endDate) {
      const end = utcDateOnly(rule.endDate)
      if (current > end) break
    }
    if (rule.endType === 'COUNT' && rule.endCount !== null && count >= rule.endCount) break

    let matches = false

    if (rule.repeatUnit === 'WEEK') {
      const dayOfWeek = toMondayBasedDayUTC(current)
      if (rule.repeatDays.includes(dayOfWeek)) {
        const currentMonday = getMondayOfWeekUTC(current)
        const weeksDiff = Math.round(
          (currentMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
        if (weeksDiff >= 0 && weeksDiff % rule.repeatInterval === 0) {
          matches = true
        }
      }
    } else if (rule.repeatUnit === 'DAY') {
      const daysDiff = Math.round(
        (current.getTime() - startUTC.getTime()) / (24 * 60 * 60 * 1000)
      )
      if (daysDiff >= 0 && daysDiff % rule.repeatInterval === 0) {
        matches = true
      }
    } else if (rule.repeatUnit === 'MONTH') {
      if (current.getUTCDate() === startUTC.getUTCDate()) {
        const monthsDiff =
          (current.getUTCFullYear() - startUTC.getUTCFullYear()) * 12 +
          (current.getUTCMonth() - startUTC.getUTCMonth())
        if (monthsDiff >= 0 && monthsDiff % rule.repeatInterval === 0) {
          matches = true
        }
      }
    }

    if (matches && !isBlocked(current, academicEvents)) {
      dates.push(new Date(current))
      count++
    }

    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}
