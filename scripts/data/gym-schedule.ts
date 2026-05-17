/**
 * 체육관 주간 사용표 (PDF 기준)
 * period: 1–4, 6 = 해당 교시 / 5A = 3·4학년 5교시(12:20–13:00) / 5B = 5·6학년 5교시(13:00–13:40)
 */
import type { RoomScheduleSlot } from './room-schedule-types'

export const GYM_SCHEDULE: RoomScheduleSlot[] = [
  { dayIndex: 0, period: 1, cells: ['3-2', '3-3'] },
  { dayIndex: 0, period: 2, cells: ['3-1', '3-4'] },
  { dayIndex: 0, period: 3, cells: ['3-5', '3-6'] },
  { dayIndex: 0, period: 4, cells: ['3-7', '3-8'] },
  { dayIndex: 0, period: '5A', cells: ['3학년'] },
  { dayIndex: 0, period: '5B', cells: ['5학년'] },
  { dayIndex: 0, period: 6, cells: ['5학년'] },

  { dayIndex: 1, period: 1, cells: ['4-1', '4-2'] },
  { dayIndex: 1, period: 2, cells: ['4-4', '4-6'] },
  { dayIndex: 1, period: 3, cells: ['4-3', '4-5'] },
  { dayIndex: 1, period: 4, cells: ['4-8', '4-9'] },
  { dayIndex: 1, period: '5A', cells: ['4학년'] },
  { dayIndex: 1, period: '5B', cells: ['6학년'] },
  { dayIndex: 1, period: 6, cells: ['5학년'] },

  { dayIndex: 2, period: 1, cells: ['4-10', '4-7'] },
  { dayIndex: 2, period: 2, cells: ['5-1', '5-2'] },
  { dayIndex: 2, period: 3, cells: ['5-3', '5-5'] },
  { dayIndex: 2, period: 4, cells: ['5-4', '5-8'] },
  { dayIndex: 2, period: '5A', cells: ['3학년'] },
  { dayIndex: 2, period: '5B', cells: ['5학년'] },

  { dayIndex: 3, period: 1, cells: ['5-6', '5-9'] },
  { dayIndex: 3, period: 2, cells: ['6-1', '6-3'] },
  { dayIndex: 3, period: 3, cells: ['5-10', '5-7'] },
  { dayIndex: 3, period: 4, cells: ['6-2', '6-5'] },
  { dayIndex: 3, period: '5A', cells: ['3,4학년'] },
  { dayIndex: 3, period: '5B', cells: ['6-6', '6-8'] },
  { dayIndex: 3, period: 6, cells: ['6학년'] },

  { dayIndex: 4, period: 1, cells: ['1학년'] },
  { dayIndex: 4, period: 2, cells: ['2학년'] },
  { dayIndex: 4, period: 3, cells: ['6-4', '6-7'] },
  { dayIndex: 4, period: 4, cells: ['6-9'] },
  { dayIndex: 4, period: '5A', cells: ['4학년'] },
  { dayIndex: 4, period: '5B', cells: ['6학년'] },
  { dayIndex: 4, period: 6, cells: ['6학년'] },
]
