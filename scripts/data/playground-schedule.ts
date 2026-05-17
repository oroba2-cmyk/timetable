import type { RoomScheduleSlot } from './room-schedule-types'

/** 운동장 주간 사용표 */
export const PLAYGROUND_SCHEDULE: RoomScheduleSlot[] = [
  { dayIndex: 0, period: 1, cells: ['4-2', '4-8'] },
  { dayIndex: 0, period: 2, cells: ['4-10', '4-5'] },
  { dayIndex: 0, period: 3, cells: ['4-1', '4-6'] },
  { dayIndex: 0, period: 4, cells: ['4-7', '4-9'] },
  { dayIndex: 0, period: 5, cells: ['4-3', '4-4'] },
  { dayIndex: 0, period: 6, cells: ['6학년'] },

  { dayIndex: 1, period: 1, cells: ['6-1', '6-4'] },
  { dayIndex: 1, period: 2, cells: ['6-6', '6-7'] },
  { dayIndex: 1, period: 3, cells: ['6-2', '6-5'] },
  { dayIndex: 1, period: 4, cells: ['6-3', '6-9'] },
  { dayIndex: 1, period: 5, cells: ['1-1', '1-2'] },
  { dayIndex: 1, period: 6, cells: ['6-8'] },

  { dayIndex: 2, period: 1, cells: ['1-3', '2-1'] },
  { dayIndex: 2, period: 2, cells: ['1-4', '1-5'] },
  { dayIndex: 2, period: 3, cells: ['1-6', '1-7'] },
  { dayIndex: 2, period: 4, cells: ['2-2', '2-3'] },
  { dayIndex: 2, period: 5, cells: ['2-4', '2-5'] },

  { dayIndex: 3, period: 1, cells: ['3-3', '3-6'] },
  { dayIndex: 3, period: 2, cells: ['3-1', '3-8'] },
  { dayIndex: 3, period: 3, cells: ['3-2', '3-5'] },
  { dayIndex: 3, period: 4, cells: ['3-4', '3-7'] },
  { dayIndex: 3, period: 5, cells: ['2-6', '2-7'] },

  { dayIndex: 4, period: 1, cells: ['5-1', '5-2'] },
  { dayIndex: 4, period: 2, cells: ['5-3', '5-8'] },
  { dayIndex: 4, period: 3, cells: ['5-4', '5-5'] },
  { dayIndex: 4, period: 4, cells: ['5-6', '5-9'] },
  { dayIndex: 4, period: 5, cells: ['5-10', '5-7'] },
  { dayIndex: 4, period: 6, cells: ['5학년'] },
]
