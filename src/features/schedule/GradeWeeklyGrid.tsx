'use client'

import type { RoomEntryData, GridPeriodRow } from './RoomWeeklyGrid'

interface RoomInfo {
  id: string
  name: string
}

interface Props {
  weekDates: string[]
  periods: GridPeriodRow[]
  entries: RoomEntryData[]   // already filtered to selected grade
  rooms: RoomInfo[]
}

const DAY_LABELS = ['월', '화', '수', '목', '금']

export function GradeWeeklyGrid({ weekDates, periods, entries, rooms }: Props) {
  function getRoomName(roomId: string | null) {
    if (!roomId) return ''
    return rooms.find(r => r.id === roomId)?.name ?? roomId
  }

  function getEntries(date: string, row: GridPeriodRow): RoomEntryData[] {
    return entries.filter(
      e => String(e.date).slice(0, 10) === date && row.periodIds.includes(e.periodId)
    )
  }

  const isLunchRow = (row: GridPeriodRow) =>
    row.label != null && row.label.includes('점심')

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-200 px-3 py-2 text-left w-24">교시</th>
            {weekDates.map((date, i) => (
              <th key={date} className="border border-gray-200 px-3 py-2 text-center min-w-28">
                {DAY_LABELS[i]}<br />
                <span className="font-normal text-xs text-gray-500">{date.slice(5)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((row, idx) => {
            const lunch = isLunchRow(row)
            return (
              <tr key={`${row.number}-${idx}`} className={lunch ? 'bg-amber-50' : undefined}>
                <td className={`border border-gray-200 px-2 py-1.5 text-center whitespace-nowrap ${lunch ? 'bg-amber-100' : 'bg-gray-50'}`}>
                  {lunch ? (
                    <>
                      <div className="font-medium text-amber-700 text-xs">{row.label ?? '점심'}</div>
                      <div className="text-xs text-amber-500">{row.startTime}</div>
                      {row.gradeHint && <div className="text-xs text-amber-400 mt-0.5">{row.gradeHint}</div>}
                    </>
                  ) : (
                    <>
                      <div className="font-medium">{row.number}교시</div>
                      <div className="text-xs text-gray-400">{row.startTime}</div>
                      {row.gradeHint && <div className="text-xs text-blue-400 mt-0.5">{row.gradeHint}</div>}
                    </>
                  )}
                </td>
                {weekDates.map(date => {
                  const dayEntries = getEntries(date, row)
                  return (
                    <td
                      key={date}
                      className={`border border-gray-200 p-1.5 align-top ${lunch ? 'h-10' : 'h-16'}`}
                    >
                      {lunch ? (
                        <span className="text-amber-300 text-xs">—</span>
                      ) : dayEntries.length === 0 ? (
                        <span className="text-gray-200 text-center block text-sm leading-none mt-3">—</span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {dayEntries.map(e => (
                            <div
                              key={e.id}
                              className={`rounded px-1.5 py-0.5 text-xs font-medium truncate ${
                                e.status === 'FORCE_ASSIGNED'
                                  ? 'bg-red-100 border border-red-300 text-red-800'
                                  : 'bg-green-100 border border-green-300 text-green-800'
                              }`}
                              title={`${getRoomName(e.roomId)} (${e.classGroup.number}반)`}
                            >
                              {getRoomName(e.roomId)}<span className="opacity-60"> {e.classGroup.number}반</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
