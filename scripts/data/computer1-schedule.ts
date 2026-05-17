import type { RoomScheduleSlot } from './room-schedule-types'

/** 컴퓨터실1(2층) 주간 사용표 — 학급별 배정 */
export const COMPUTER1_SCHEDULE: RoomScheduleSlot[] = [
  { dayIndex: 0, period: 1, cells: ['3-7'] },
  { dayIndex: 0, period: 2, cells: ['5-2'] },
  { dayIndex: 0, period: 3, cells: ['5-1'] },
  { dayIndex: 0, period: 4, cells: ['5-3'] },
  { dayIndex: 0, period: 5, cells: ['5-8'] },

  { dayIndex: 1, period: 1, cells: ['2-1'] },
  { dayIndex: 1, period: 2, cells: ['2-2'] },
  { dayIndex: 1, period: 3, cells: ['2-3'] },
  { dayIndex: 1, period: 4, cells: ['2-4'] },
  { dayIndex: 1, period: 5, cells: ['5-7'] },
  { dayIndex: 1, period: 6, cells: ['5-9'] },

  { dayIndex: 2, period: 1, cells: ['2-5'] },
  { dayIndex: 2, period: 2, cells: ['2-6'] },
  { dayIndex: 2, period: 3, cells: ['2-7'] },
  { dayIndex: 2, period: 4, cells: ['3-1'] },
  { dayIndex: 2, period: 5, cells: ['5-6'] },

  { dayIndex: 3, period: 1, cells: ['3-2'] },
  { dayIndex: 3, period: 2, cells: ['3-3'] },
  { dayIndex: 3, period: 3, cells: ['3-4'] },
  { dayIndex: 3, period: 4, cells: ['3-5'] },
  { dayIndex: 3, period: 5, cells: ['5-10'] },
  { dayIndex: 3, period: 6, cells: ['5-5'] },

  { dayIndex: 4, period: 1, cells: ['3-6'] },
  { dayIndex: 4, period: 2, cells: ['3-8'] },
  { dayIndex: 4, period: 4, cells: ['5-4'] },
]
