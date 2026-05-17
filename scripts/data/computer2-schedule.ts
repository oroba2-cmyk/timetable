import type { RoomScheduleSlot } from './room-schedule-types'

/** 컴퓨터실2(4층) 주간 사용표 — 학급별 배정 */
export const COMPUTER2_SCHEDULE: RoomScheduleSlot[] = [
  { dayIndex: 0, period: 1, cells: ['4-9'] },
  { dayIndex: 0, period: 2, cells: ['1-7'] },
  { dayIndex: 0, period: 3, cells: ['6-3'] },
  { dayIndex: 0, period: 4, cells: ['6-1'] },
  { dayIndex: 0, period: 5, cells: ['6-2'] },

  { dayIndex: 1, period: 1, cells: ['1-1'] },
  { dayIndex: 1, period: 2, cells: ['1-3'] },
  { dayIndex: 1, period: 3, cells: ['6-8'] },
  { dayIndex: 1, period: 4, cells: ['4-2'] },
  { dayIndex: 1, period: 5, cells: ['6-9'] },

  { dayIndex: 2, period: 1, cells: ['1-5'] },
  { dayIndex: 2, period: 2, cells: ['1-6'] },
  { dayIndex: 2, period: 3, cells: ['4-1'] },
  { dayIndex: 2, period: 4, cells: ['4-7'] },
  { dayIndex: 2, period: 5, cells: ['1-2'] },

  { dayIndex: 3, period: 1, cells: ['4-3'] },
  { dayIndex: 3, period: 2, cells: ['4-4'] },
  { dayIndex: 3, period: 3, cells: ['4-5'] },
  { dayIndex: 3, period: 4, cells: ['1-4'] },
  { dayIndex: 3, period: 5, cells: ['4-6'] },

  { dayIndex: 4, period: 1, cells: ['4-8'] },
  { dayIndex: 4, period: 2, cells: ['4-10'] },
  { dayIndex: 4, period: 3, cells: ['6-5'] },
  { dayIndex: 4, period: 4, cells: ['6-4'] },
  { dayIndex: 4, period: 5, cells: ['6-6'] },
  { dayIndex: 4, period: 6, cells: ['6-7'] },
]
