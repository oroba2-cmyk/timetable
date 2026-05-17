import { AcademicEvent } from '@/generated/prisma'
import { eventCoversDateKey, toDateKey } from '@/lib/dates/date-key'
import { formatViewEntryLabel, type ViewEntryLabelInput } from '@/lib/schedule/format-view-entry-label'
/** 달력 칸 표시에 필요한 최소 필드 (view·calendar 공통) */
export type CalendarDisplayEntry = ViewEntryLabelInput & {
  id: string
  date: Date
  status: string
  periodId: string
}

interface Props {
  year: number
  month: number
  entries: CalendarDisplayEntry[]
  academicEvents: AcademicEvent[]
  roomFilter: string | null
  periodFilter?: number | null
  typeFilter?: 'all' | 'room' | 'specialist'
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay() // 0=일, 1=월, ..., 6=토
}

const DAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토']
/** 달력 칸마다 표시할 일정 최대 건수 */
const MAX_ENTRIES_PER_DAY = 10

export function CalendarView({ year, month, entries, academicEvents, roomFilter, periodFilter = null, typeFilter = 'all' }: Props) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(totalCells - firstDay - daysInMonth).fill(null),
  ]

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_HEADERS.map(d => (
          <div
            key={d}
            className="text-center text-xs font-semibold py-2 text-gray-600 border-r last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[100px] border-r border-b bg-gray-50"
              />
            )
          }

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

          const dayEvents = academicEvents.filter((e) => eventCoversDateKey(e, dateStr))

          const dayEntries = entries.filter(e => {
            if (toDateKey(new Date(e.date)) !== dateStr) return false
            if (e.status === 'EXCEPTION_CANCELLED') return false
            if (roomFilter && e.roomId !== roomFilter) return false
            if (periodFilter !== null && e.period.number !== periodFilter) return false
            if (typeFilter === 'room' && e.roomId === null) return false
            if (typeFilter === 'specialist' && e.roomId !== null) return false
            return true
          })

          const visibleEntries = dayEntries.slice(0, MAX_ENTRIES_PER_DAY)
          const extraCount = dayEntries.length - visibleEntries.length
          const isHoliday = dayEvents.some((e) => !e.allowException)
          const holidayLabels = dayEvents.filter((e) => !e.allowException)
          const otherEvents = dayEvents.filter((e) => e.allowException)

          return (
            <div
              key={dateStr}
              className={`min-h-[120px] border-r border-b p-1 ${isHoliday ? 'bg-red-50' : 'bg-white'}`}
            >
              <div className={`text-xs font-medium mb-1 ${isHoliday ? 'text-red-600' : 'text-gray-700'}`}>{day}</div>

              {/* 휴업·공휴일 (우선 표시) */}
              {holidayLabels.map((ev) => (
                <div
                  key={ev.id}
                  className="text-[10px] rounded px-1 py-0.5 mb-0.5 truncate bg-red-100 text-red-800 font-medium"
                  title={ev.note ? `${ev.eventType}: ${ev.note}` : ev.eventType}
                >
                  {ev.note ? `${ev.eventType}(${ev.note})` : ev.eventType}
                </div>
              ))}
              {otherEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="text-[10px] rounded px-1 py-0.5 mb-0.5 truncate bg-yellow-100 text-yellow-800"
                  title={ev.note ?? ev.eventType}
                >
                  {ev.note || ev.eventType}
                </div>
              ))}

              {/* Entry chips */}
              {visibleEntries.map(e => {
                const isForce = e.status === 'FORCE_ASSIGNED'
                const isSpecialist = e.roomId === null
                const label = formatViewEntryLabel(e)
                const colorClass = isSpecialist
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
                return (
                  <div
                    key={e.id}
                    className={`text-[10px] rounded px-1 py-0.5 mb-0.5 truncate ${colorClass} ${isForce ? 'ring-1 ring-red-400' : ''} ${isHoliday ? 'opacity-50' : ''}`}
                    title={isForce ? `[충돌] ${label}` : label}
                  >
                    {label}
                  </div>
                )
              })}

              {/* Overflow count */}
              {extraCount > 0 && (
                <div className="text-[10px] text-gray-500">+{extraCount}건 더</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
