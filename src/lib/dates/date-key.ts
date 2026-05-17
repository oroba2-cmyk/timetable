/** @db.Date / UTC 기준 YYYY-MM-DD (달력·학사일정 매칭용) */

export function toDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

export function termContainsDate(
  term: { startDate: Date; endDate: Date },
  dateKey: string
): boolean {
  const d = parseDateKey(dateKey).getTime()
  const start = parseDateKey(toDateKey(term.startDate)).getTime()
  const end = parseDateKey(toDateKey(term.endDate)).getTime()
  return d >= start && d <= end
}

export function eventCoversDateKey(
  event: { date: Date; endDate: Date | null },
  dateKey: string
): boolean {
  const start = toDateKey(event.date)
  const end = event.endDate ? toDateKey(event.endDate) : start
  return dateKey >= start && dateKey <= end
}

export const HOLIDAY_EVENT_TYPES = ['공휴일', '재량휴업일'] as const
