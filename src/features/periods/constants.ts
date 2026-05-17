export type PeriodRow = {
  number: number
  gradeNumber: number
  label: string | null
  startTime: string
  endTime: string
}

export const DEFAULT_PERIOD_ROWS: Omit<PeriodRow, 'gradeNumber'>[] = [
  { number: 1, label: null, startTime: '09:00', endTime: '09:40' },
  { number: 2, label: null, startTime: '09:50', endTime: '10:30' },
  { number: 3, label: null, startTime: '10:40', endTime: '11:20' },
  { number: 4, label: null, startTime: '11:30', endTime: '12:10' },
  { number: 0, label: '점심시간', startTime: '12:10', endTime: '13:00' },
  { number: 5, label: null, startTime: '13:00', endTime: '13:40' },
  { number: 6, label: null, startTime: '13:50', endTime: '14:30' },
  { number: 7, label: null, startTime: '14:40', endTime: '15:20' },
  { number: 8, label: null, startTime: '15:30', endTime: '16:10' },
]
