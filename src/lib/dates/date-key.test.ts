import { describe, it, expect } from 'vitest'
import { toDateKey, eventCoversDateKey, termContainsDate } from './date-key'

describe('toDateKey', () => {
  it('uses UTC calendar date', () => {
    expect(toDateKey(new Date('2026-03-01T00:00:00.000Z'))).toBe('2026-03-01')
  })
})

describe('eventCoversDateKey', () => {
  it('matches single day', () => {
    expect(
      eventCoversDateKey(
        { date: new Date('2026-05-05T00:00:00.000Z'), endDate: null },
        '2026-05-05'
      )
    ).toBe(true)
  })
})

describe('termContainsDate', () => {
  it('checks term range', () => {
    const term = {
      startDate: new Date('2026-03-03T00:00:00.000Z'),
      endDate: new Date('2026-07-27T00:00:00.000Z'),
    }
    expect(termContainsDate(term, '2026-03-15')).toBe(true)
    expect(termContainsDate(term, '2026-08-01')).toBe(false)
  })
})
