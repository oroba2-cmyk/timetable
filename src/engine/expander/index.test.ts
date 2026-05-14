import { describe, it, expect } from 'vitest'
import { expandRule } from './index'
import type { RuleInput, AcademicEventInput } from './index'

const baseRule: RuleInput = {
  startDate: new Date('2026-03-02'), // Monday
  repeatInterval: 1,
  repeatUnit: 'WEEK',
  repeatDays: [0], // Monday only
  endType: 'COUNT',
  endCount: 4,
  endDate: null,
}

const noEvents: AcademicEventInput[] = []
const termEnd = new Date('2026-07-31')

describe('expandRule - WEEK 반복', () => {
  it('매주 월요일 4회 생성', () => {
    const dates = expandRule(baseRule, noEvents, termEnd)
    expect(dates).toHaveLength(4)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-09')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-16')
    expect(dates[3].toISOString().slice(0, 10)).toBe('2026-03-23')
  })

  it('격주 월요일 3회 생성', () => {
    const rule: RuleInput = { ...baseRule, repeatInterval: 2, endCount: 3 }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(3)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-16')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-30')
  })

  it('복수 요일 (월·수) 6회 생성', () => {
    const rule: RuleInput = { ...baseRule, repeatDays: [0, 2], endCount: 6 }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(6)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02') // Mon
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-04') // Wed
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-09') // Mon
  })

  it('종료 날짜 기준 정지', () => {
    const rule: RuleInput = {
      ...baseRule,
      endType: 'DATE',
      endDate: new Date('2026-03-15'),
      endCount: null,
    }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(2) // 3/2, 3/9 only
  })

  it('학사일정 날짜 제외', () => {
    const events: AcademicEventInput[] = [
      { date: new Date('2026-03-09'), allowException: false },
    ]
    const dates = expandRule(baseRule, events, termEnd)
    expect(dates).toHaveLength(4) // 4회이지만 3/9 건너뜀
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-16')
  })

  it('allowException=true인 날짜는 포함', () => {
    const events: AcademicEventInput[] = [
      { date: new Date('2026-03-09'), allowException: true },
    ]
    const dates = expandRule(baseRule, events, termEnd)
    expect(dates).toHaveLength(4)
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-09')
  })

  it('학기 종료일 초과 시 정지', () => {
    const rule: RuleInput = { ...baseRule, endType: 'NONE', endCount: null, endDate: null }
    const end = new Date('2026-03-20')
    const dates = expandRule(rule, noEvents, end)
    expect(dates.every(d => {
      const d2 = new Date(d)
      d2.setHours(0, 0, 0, 0)
      const e = new Date(end)
      e.setHours(0, 0, 0, 0)
      return d2 <= e
    })).toBe(true)
  })
})

describe('expandRule - DAY 반복', () => {
  it('3일마다 반복 (주말 포함)', () => {
    const rule: RuleInput = {
      startDate: new Date('2026-03-02'),
      repeatUnit: 'DAY',
      repeatInterval: 3,
      repeatDays: [],
      endType: 'COUNT',
      endCount: 4,
      endDate: null,
    }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(4)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-05')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-08')
    expect(dates[3].toISOString().slice(0, 10)).toBe('2026-03-11')
  })
})

describe('expandRule - MONTH 반복', () => {
  it('매월 같은 날짜로 3회 생성', () => {
    const rule: RuleInput = {
      startDate: new Date('2026-03-02'),
      repeatUnit: 'MONTH',
      repeatInterval: 1,
      repeatDays: [],
      endType: 'COUNT',
      endCount: 3,
      endDate: null,
    }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(3)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-04-02')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-05-02')
  })
})
