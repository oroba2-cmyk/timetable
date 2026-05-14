import { ScheduleEntry, AcademicEvent, SpecialRoom } from '@/generated/prisma'

type EntryWithRelations = ScheduleEntry & {
  room: SpecialRoom
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
  period: { number: number }
}

interface Props {
  year: number
  month: number
  entries: EntryWithRelations[]
  academicEvents: AcademicEvent[]
  roomFilter: string | null
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const DAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']

export function CalendarView({ year, month, entries, academicEvents, roomFilter }: Props) {
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

          const dayEvents = academicEvents.filter(
            e => new Date(e.date).toISOString().slice(0, 10) === dateStr
          )

          const dayEntries = entries.filter(e => {
            if (new Date(e.date).toISOString().slice(0, 10) !== dateStr) return false
            if (e.status === 'EXCEPTION_CANCELLED') return false
            if (roomFilter && e.roomId !== roomFilter) return false
            return true
          })

          const visibleEntries = dayEntries.slice(0, 3)
          const extraCount = dayEntries.length - visibleEntries.length

          return (
            <div
              key={dateStr}
              className="min-h-[100px] border-r border-b p-1 bg-white"
            >
              <div className="text-xs font-medium text-gray-700 mb-1">{day}</div>

              {/* Academic event badges */}
              {dayEvents.map(ev => (
                <div
                  key={ev.id}
                  className="text-[10px] bg-yellow-100 text-yellow-800 rounded px-1 py-0.5 mb-0.5 truncate"
                  title={ev.note ?? ev.eventType}
                >
                  {ev.note || ev.eventType}
                </div>
              ))}

              {/* Entry chips */}
              {visibleEntries.map(e => {
                const isForce = e.status === 'FORCE_ASSIGNED'
                const label = [
                  e.classGroup.grade.number + '학년' + e.classGroup.number + '반',
                  e.subject?.name,
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <div
                    key={e.id}
                    className={`text-[10px] rounded px-1 py-0.5 mb-0.5 truncate ${
                      isForce
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                    title={label}
                  >
                    {e.period.number}교시 {label}
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
