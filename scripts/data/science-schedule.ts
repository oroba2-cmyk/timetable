import type { RoomPeriodSlot, RoomScheduleSlot } from './room-schedule-types'

function daySlots(
  dayIndex: number,
  blocks: { periods: number[]; cell: string }[]
): RoomScheduleSlot[] {
  const out: RoomScheduleSlot[] = []
  for (const { periods, cell } of blocks) {
    for (const period of periods) {
      out.push({
        dayIndex,
        period: period as RoomPeriodSlot,
        cells: [cell],
      })
    }
  }
  return out
}

function daySlotsOverlap(
  dayIndex: number,
  items: { period: number; cells: string[] }[]
): RoomScheduleSlot[] {
  return items.map(({ period, cells }) => ({
    dayIndex,
    period: period as RoomPeriodSlot,
    cells,
  }))
}

/**
 * 과학실1(2층): 3학년(화~금) + 6학년(월~금)
 * 화~금 1~4교시는 3·6학년 동시 사용(capacity 2)
 */
export const SCIENCE1_SCHEDULE: RoomScheduleSlot[] = [
  // 6학년 — 월요일만 단독
  ...daySlots(0, [
    { periods: [1, 2], cell: '6-1' },
    { periods: [3, 4], cell: '6-2' },
  ]),
  // 화요일
  ...daySlotsOverlap(1, [
    { period: 1, cells: ['3-1', '6-3'] },
    { period: 2, cells: ['3-1', '6-3'] },
    { period: 3, cells: ['3-2', '6-4'] },
    { period: 4, cells: ['3-2', '6-4'] },
  ]),
  // 수요일
  ...daySlotsOverlap(2, [
    { period: 1, cells: ['3-3', '6-5'] },
    { period: 2, cells: ['3-3', '6-5'] },
    { period: 3, cells: ['3-4', '6-6'] },
    { period: 4, cells: ['3-4', '6-6'] },
  ]),
  // 목요일
  ...daySlotsOverlap(3, [
    { period: 1, cells: ['3-5', '6-7'] },
    { period: 2, cells: ['3-5', '6-7'] },
    { period: 3, cells: ['3-6', '6-8'] },
    { period: 4, cells: ['3-6', '6-8'] },
  ]),
  // 금요일 (6학년은 1~2교시만)
  ...daySlotsOverlap(4, [
    { period: 1, cells: ['3-7', '6-9'] },
    { period: 2, cells: ['3-7', '6-9'] },
    { period: 3, cells: ['3-8'] },
    { period: 4, cells: ['3-8'] },
  ]),
]

/**
 * 과학실2(2층): 4학년 + 5학년 (월~금 1~4교시 동시)
 */
export const SCIENCE2_SCHEDULE: RoomScheduleSlot[] = (() => {
  const g4 = ['4-1', '4-2', '4-3', '4-4', '4-5', '4-6', '4-7', '4-8', '4-9', '4-10']
  const g5 = ['5-1', '5-2', '5-3', '5-4', '5-5', '5-6', '5-7', '5-8', '5-9', '5-10']
  const out: RoomScheduleSlot[] = []
  for (let day = 0; day <= 4; day++) {
    out.push(
      ...daySlotsOverlap(day, [
        { period: 1, cells: [g4[day * 2], g5[day * 2]] },
        { period: 2, cells: [g4[day * 2], g5[day * 2]] },
        { period: 3, cells: [g4[day * 2 + 1], g5[day * 2 + 1]] },
        { period: 4, cells: [g4[day * 2 + 1], g5[day * 2 + 1]] },
      ])
    )
  }
  return out
})()
