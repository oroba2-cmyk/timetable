import { describe, it, expect } from 'vitest'
import { resolveTermForDate, resolveTermForDateRange } from './resolve-active-term'

const terms = [
  {
    id: 's1',
    year: 2026,
    semester: 1,
    startDate: new Date('2026-03-03'),
    endDate: new Date('2026-07-27'),
  },
  {
    id: 's2',
    year: 2026,
    semester: 2,
    startDate: new Date('2026-08-26'),
    endDate: new Date('2027-01-15'),
  },
]

describe('resolveTermForDate', () => {
  it('picks semester 1 for March', () => {
    expect(resolveTermForDate(terms, new Date('2026-03-15'))?.id).toBe('s1')
  })

  it('picks semester 2 for September', () => {
    expect(resolveTermForDate(terms, new Date('2026-09-01'))?.id).toBe('s2')
  })
})

describe('resolveTermForDateRange', () => {
  it('picks semester 1 for March range', () => {
    const t = resolveTermForDateRange(
      terms,
      new Date('2026-03-01'),
      new Date('2026-03-31')
    )
    expect(t?.id).toBe('s1')
  })

  it('picks semester 2 for October range', () => {
    const t = resolveTermForDateRange(
      terms,
      new Date('2026-10-01'),
      new Date('2026-10-31')
    )
    expect(t?.id).toBe('s2')
  })
})
