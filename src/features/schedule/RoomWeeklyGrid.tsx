'use client'

import { useState } from 'react'

export interface RoomEntryData {
  id: string
  date: string
  periodId: string
  roomId: string | null
  sourceRuleId: string | null
  classGroup: { number: number; grade: { number: number } }
  status: string
}

export interface GridPeriodRow {
  number: number
  label: string | null
  startTime: string
  endTime: string
  periodIds: string[]
  gradeHint: string | null
}

interface Props {
  weekDates: string[]
  periods: GridPeriodRow[]
  entries: RoomEntryData[]
  onCellClick: (date: string, periodId: string) => void
  onEntryAction: (entryId: string, sourceRuleId: string | null, action: 'cancel' | 'deleteRule') => void
  // When true, show room name in chips (used in "모든 특별실" mode)
  showRoom?: boolean
  rooms?: { id: string; name: string }[]
  // When true, clicking to assign is disabled (e.g. no room selected)
  readOnly?: boolean
}

const DAY_LABELS = ['월', '화', '수', '목', '금']

export function RoomWeeklyGrid({ weekDates, periods, entries, onCellClick, onEntryAction, showRoom, rooms, readOnly }: Props) {
  function getRoomName(roomId: string | null) {
    if (!roomId) return ''
    return rooms?.find(r => r.id === roomId)?.name ?? ''
  }

  function getEntry(date: string, row: GridPeriodRow): RoomEntryData[] {
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
                  const cellEntries = getEntry(date, row)
                  const isEmpty = cellEntries.length === 0
                  const canClick = isEmpty && !readOnly

                  return (
                    <td
                      key={date}
                      className={`border border-gray-200 p-1.5 align-top ${
                        lunch ? 'h-12 bg-amber-50/50' : 'h-16'
                      } ${canClick ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                      onClick={() => canClick && onCellClick(date, row.periodIds[0])}
                    >
                      {isEmpty ? (
                        <span className={`block text-center leading-none mt-2 select-none ${
                          lunch ? 'text-amber-200 text-xs' : 'text-gray-300 text-lg'
                        } ${canClick ? '' : 'cursor-default'}`}>
                          +
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {cellEntries.map(entry => (
                            <EntryChip
                              key={entry.id}
                              entry={entry}
                              onAction={onEntryAction}
                              roomLabel={showRoom ? getRoomName(entry.roomId) : null}
                            />
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

function EntryChip({
  entry,
  onAction,
  roomLabel,
}: {
  entry: RoomEntryData
  onAction: (entryId: string, sourceRuleId: string | null, action: 'cancel' | 'deleteRule') => void
  roomLabel: string | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isConflict = entry.status === 'FORCE_ASSIGNED'

  const classLabel = `${entry.classGroup.grade.number}-${entry.classGroup.number}반`
  const displayLabel = roomLabel ? `${roomLabel} ${classLabel}` : classLabel

  return (
    <div className="relative inline-block w-full">
      <div
        className={`rounded px-1.5 py-1 text-xs font-medium cursor-pointer select-none leading-tight ${
          isConflict
            ? 'bg-red-100 border border-red-400 text-red-800'
            : roomLabel
              ? 'bg-green-100 border border-green-300 text-green-800'
              : 'bg-blue-100 border border-blue-300 text-blue-800'
        }`}
        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
      >
        {displayLabel}
      </div>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute z-20 left-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg text-left min-w-32">
            <button
              className="block w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 text-left"
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onAction(entry.id, null, 'cancel') }}
            >
              이번만 취소
            </button>
            {entry.sourceRuleId && (
              <button
                className="block w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 text-left"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onAction(entry.id, entry.sourceRuleId, 'deleteRule') }}
              >
                규칙 전체 삭제
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
