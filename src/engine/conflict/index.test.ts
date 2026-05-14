import { describe, it, expect } from 'vitest'
import { checkConflict } from './index'
import type { EntryLike, RoomInfo, UnavailabilityInput } from './index'

const entry = {
  date: new Date('2026-03-02'), // Monday
  periodId: 'p1',
  roomId: 'r1',
  classId: 'c1',
  teacherId: 't1',
}

const room: RoomInfo = { id: 'r1', capacity: 1 }

describe('ROOM_CAPACITY', () => {
  it('동일 날짜·교시·특별실에 기존 배정 있으면 충돌', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c2', teacherId: null, status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.hasConflict).toBe(true)
    expect(result.conflicts.some(c => c.type === 'ROOM_CAPACITY')).toBe(true)
  })

  it('용량 2인 특별실은 1학급 추가 허용', () => {
    const bigRoom: RoomInfo = { id: 'r1', capacity: 2 }
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c2', teacherId: null, status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room: bigRoom, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'ROOM_CAPACITY')).toBe(false)
  })

  it('EXCEPTION_CANCELLED 상태는 용량에서 제외', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c2', teacherId: null, status: 'EXCEPTION_CANCELLED' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.hasConflict).toBe(false)
  })
})

describe('CLASS_DOUBLE_BOOKING', () => {
  it('같은 학급이 같은 날짜·교시에 다른 특별실에 있으면 충돌', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r2', classId: 'c1', teacherId: null, status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'CLASS_DOUBLE_BOOKING')).toBe(true)
  })
})

describe('TEACHER_DOUBLE_BOOKING', () => {
  it('같은 교사가 같은 날짜·교시에 중복되면 충돌', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r2', classId: 'c2', teacherId: 't1', status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'TEACHER_DOUBLE_BOOKING')).toBe(true)
  })

  it('교사 없는 배정은 교사 충돌 검사 생략', () => {
    const entryNoTeacher = { ...entry, teacherId: null }
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r2', classId: 'c2', teacherId: 't1', status: 'NORMAL' },
    ]
    const result = checkConflict({ entry: entryNoTeacher, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'TEACHER_DOUBLE_BOOKING')).toBe(false)
  })
})

describe('UNAVAILABILITY', () => {
  it('특별실 비가용 시간에 배정하면 충돌 (월=dayOfWeek 0)', () => {
    // entry.date = 2026-03-02 = 월요일 → dayOfWeek 0
    const unavail: UnavailabilityInput[] = [{ dayOfWeek: 0, periodId: 'p1' }]
    const result = checkConflict({ entry, existing: [], room, roomUnavailabilities: unavail, teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'ROOM_UNAVAILABLE')).toBe(true)
  })

  it('교사 비가용 시간에 배정하면 충돌', () => {
    const unavail: UnavailabilityInput[] = [{ dayOfWeek: 0, periodId: 'p1' }]
    const result = checkConflict({ entry, existing: [], room, roomUnavailabilities: [], teacherUnavailabilities: unavail })
    expect(result.conflicts.some(c => c.type === 'TEACHER_UNAVAILABLE')).toBe(true)
  })
})

describe('excludeEntryId', () => {
  it('자기 자신은 충돌에서 제외', () => {
    const existing: EntryLike[] = [
      { id: 'self', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c1', teacherId: 't1', status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [], excludeEntryId: 'self' })
    expect(result.hasConflict).toBe(false)
  })
})
