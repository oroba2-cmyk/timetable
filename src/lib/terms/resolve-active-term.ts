/** 학기 목록에서 조회 기간·날짜에 맞는 학기를 고릅니다. */

export type TermLike = {
  id: string
  year: number
  semester: number
  startDate: Date
  endDate: Date
}

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function termContains(term: TermLike, date: Date): boolean {
  const d = utcDateOnly(date).getTime()
  const start = utcDateOnly(term.startDate).getTime()
  const end = utcDateOnly(term.endDate).getTime()
  return d >= start && d <= end
}

function rangeOverlapsTerm(term: TermLike, from: Date, to: Date): boolean {
  const start = utcDateOnly(term.startDate).getTime()
  const end = utcDateOnly(term.endDate).getTime()
  const f = utcDateOnly(from).getTime()
  const t = utcDateOnly(to).getTime()
  return f <= end && t >= start
}

/** 날짜가 학기 밖이면 가장 가까운 학기 */
function nearestTerm<T extends TermLike>(terms: T[], date: Date): T {
  const d = utcDateOnly(date).getTime()
  let best = terms[0]
  let bestDist = Number.POSITIVE_INFINITY

  for (const term of terms) {
    const start = utcDateOnly(term.startDate).getTime()
    const end = utcDateOnly(term.endDate).getTime()
    let dist = 0
    if (d < start) dist = start - d
    else if (d > end) dist = d - end
    if (dist < bestDist) {
      bestDist = dist
      best = term
    }
  }
  return best
}

/** 단일 날짜가 속한 학기 (없으면 가장 가까운 학기) */
export function resolveTermForDate<T extends TermLike>(terms: T[], date: Date): T | null {
  if (terms.length === 0) return null
  return terms.find((t) => termContains(t, date)) ?? nearestTerm(terms, date)
}

/** 기간과 겹치는 학기 (여러 개면 시작일이 from에 포함된 학기 우선) */
export function resolveTermForDateRange<T extends TermLike>(
  terms: T[],
  from: Date,
  to: Date
): T | null {
  if (terms.length === 0) return null

  const f = utcDateOnly(from) <= utcDateOnly(to) ? from : to
  const t = utcDateOnly(from) <= utcDateOnly(to) ? to : from

  const overlapping = terms.filter((term) => rangeOverlapsTerm(term, f, t))
  if (overlapping.length === 1) return overlapping[0]

  if (overlapping.length > 1) {
    const fromMatch = overlapping.find((term) => termContains(term, f))
    if (fromMatch) return fromMatch
    const mid = new Date((utcDateOnly(f).getTime() + utcDateOnly(t).getTime()) / 2)
    return resolveTermForDate(overlapping, mid)!
  }

  return resolveTermForDate(terms, f)
}

export function formatTermLabel(term: TermLike): string {
  return `${term.year}학년도 ${term.semester}학기`
}
