'use client'
import { useState, useCallback, useEffect } from 'react'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { GridCell } from './GridCell'
import { moveScheduleEntry } from './actions'

interface Period {
  id: string
  number: number
  startTime: string
  endTime: string
}

interface Entry {
  id: string
  date: Date | string  // comes as string after JSON serialization
  periodId: string
  roomId: string
  classId: string
  status: string
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
}

interface Props {
  weekDates: string[]  // 5 ISO date strings Mon~Fri
  periods: Period[]
  entries: Entry[]
  roomFilter: string | null
}

const DAY_LABELS = ['월', '화', '수', '목', '금']

export function WeeklyGrid({ weekDates, periods, entries, roomFilter }: Props) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setLocalEntries(entries)
  }, [entries])

  const filteredEntries = roomFilter
    ? localEntries.filter(e => e.roomId === roomFilter)
    : localEntries

  function getEntries(date: string, periodId: string) {
    return filteredEntries
      .filter(e => String(e.date).slice(0, 10) === date && e.periodId === periodId)
      .map(e => ({
        id: e.id,
        className: `${e.classGroup.grade.number}학년 ${e.classGroup.number}반`,
        subjectName: e.subject?.name ?? null,
        teacherName: e.teacher?.name ?? null,
        status: e.status,
      }))
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const entryId = active.id as string
    const [newDate, newPeriodId] = (over.id as string).split('__')
    if (!newDate || !newPeriodId) return

    setPending(true)
    try {
      const result = await moveScheduleEntry(entryId, newDate, newPeriodId)

      if (!result.success) {
        const confirmed = window.confirm(`충돌이 감지되었습니다. 강제로 이동하시겠습니까?\n${result.error}`)
        if (confirmed) {
          const forced = await moveScheduleEntry(entryId, newDate, newPeriodId, true)
          if (forced.success) {
            setLocalEntries(prev =>
              prev.map(e =>
                e.id === entryId
                  ? { ...e, date: newDate, periodId: newPeriodId, status: forced.data.entry.status }
                  : e
              )
            )
          }
        }
      } else {
        setLocalEntries(prev =>
          prev.map(e =>
            e.id === entryId
              ? { ...e, date: newDate, periodId: newPeriodId, status: result.data.entry.status }
              : e
          )
        )
      }
    } catch (err) {
      console.error('moveScheduleEntry failed', err)
    } finally {
      setPending(false)
    }
  }, [])

  const handleCancel = useCallback((_entryId: string) => {
    // handled by parent or future implementation
  }, [])

  return (
    <div className={pending ? 'opacity-50 pointer-events-none' : ''}>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-3 py-2 text-left w-20">교시</th>
                {weekDates.map((date, i) => (
                  <th key={date} className="border border-gray-200 px-3 py-2 text-center">
                    {DAY_LABELS[i]} ({date.slice(5)})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period.id}>
                  <td className="border border-gray-200 px-3 py-2 bg-gray-50 text-center">
                    <div className="font-medium">{period.number}교시</div>
                    <div className="text-xs text-gray-500">{period.startTime}</div>
                  </td>
                  {weekDates.map((date, dayIndex) => (
                    <GridCell
                      key={`${date}__${period.id}`}
                      dayIndex={dayIndex}
                      periodId={period.id}
                      entries={getEntries(date, period.id)}
                      date={date}
                      onCancel={handleCancel}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DndContext>
    </div>
  )
}
