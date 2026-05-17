import type { RoomScheduleSlot } from './room-schedule-types'

/** 시청각실 주간 사용표 */
export const AUDIOVISUAL_SCHEDULE: RoomScheduleSlot[] = [
  { dayIndex: 0, period: 1, cells: ['2학년'] },
  { dayIndex: 0, period: 2, cells: ['2학년'] },
  { dayIndex: 0, period: 3, cells: ['3학년'] },
  { dayIndex: 0, period: 4, cells: ['3학년'] },
  { dayIndex: 0, period: 5, cells: ['5학년'] },
  { dayIndex: 0, period: 6, cells: ['5학년'] },

  { dayIndex: 1, period: 1, cells: ['1학년'] },
  { dayIndex: 1, period: 2, cells: ['1학년'] },
  { dayIndex: 1, period: 3, cells: ['4학년'] },
  { dayIndex: 1, period: 4, cells: ['4학년'] },

  { dayIndex: 2, period: 1, cells: ['5학년'] },
  { dayIndex: 2, period: 2, cells: ['5학년'] },
  { dayIndex: 2, period: 3, cells: ['6학년'] },
  { dayIndex: 2, period: 4, cells: ['6학년'] },

  { dayIndex: 3, period: 1, cells: ['1학년'] },
  { dayIndex: 3, period: 2, cells: ['1학년'] },
  { dayIndex: 3, period: 3, cells: ['3학년'] },
  { dayIndex: 3, period: 4, cells: ['3학년'] },
  { dayIndex: 3, period: 5, cells: ['6학년'] },
  { dayIndex: 3, period: 6, cells: ['6학년'] },

  { dayIndex: 4, period: 1, cells: ['2학년'] },
  { dayIndex: 4, period: 2, cells: ['2학년'] },
  { dayIndex: 4, period: 3, cells: ['4학년'] },
  { dayIndex: 4, period: 4, cells: ['4학년'] },
]
