/** 주간 특별실 슬롯 (교시 1–6, 체육관만 5A·5B) */
export type RoomPeriodSlot = 1 | 2 | 3 | 4 | 5 | 6 | '5A' | '5B'

export interface RoomScheduleSlot {
  dayIndex: number // 0=월 … 4=금
  period: RoomPeriodSlot
  /** "3-2", "3학년", "3,4학년" 등 */
  cells: string[]
}
