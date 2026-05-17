import { AcademicEvent } from '@/generated/prisma'
import { formatSpecialistSubjectTeacher } from '@/lib/schedule/format-view-entry-label'
import type { ViewScheduleEntry } from '@/lib/schedule/view-entry-query'

interface UsageStat {
  roomId: string
  roomName: string
  totalDays: number
  totalSessions: number
}

function computeUsageStats(entries: ViewScheduleEntry[]): UsageStat[] {
  const map = new Map<string, { roomName: string; dates: Set<string>; sessions: number }>()

  for (const e of entries) {
    if (e.status === 'EXCEPTION_CANCELLED') continue

    const roomKey = e.roomId ?? '__no_room__'
    if (!map.has(roomKey)) {
      map.set(roomKey, { roomName: e.room?.name ?? '(미지정)', dates: new Set(), sessions: 0 })
    }
    const stat = map.get(roomKey)!
    const dateStr = e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10)
    stat.dates.add(dateStr)
    stat.sessions += 1
  }

  return Array.from(map.entries()).map(([roomId, stat]) => ({
    roomId,
    roomName: stat.roomName,
    totalDays: stat.dates.size,
    totalSessions: stat.sessions,
  }))
}

function computeSchoolDays(termStart: Date, termEnd: Date, academicEvents: AcademicEvent[]): number {
  const blocked = new Set<string>()
  for (const e of academicEvents) {
    if (!e.allowException) {
      const start = new Date(e.date)
      const end = e.endDate ? new Date(e.endDate) : new Date(e.date)
      start.setUTCHours(0, 0, 0, 0)
      end.setUTCHours(0, 0, 0, 0)
      const cur = new Date(start)
      while (cur <= end) {
        blocked.add(cur.toISOString().slice(0, 10))
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
    }
  }

  let count = 0
  const cur = new Date(termStart)
  // Normalize to UTC midnight to avoid timezone drift
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(termEnd)
  end.setUTCHours(0, 0, 0, 0)

  while (cur <= end) {
    const day = cur.getUTCDay() // 0=Sun, 6=Sat
    const dateStr = cur.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !blocked.has(dateStr)) {
      count++
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  return count
}

interface Props {
  entries: ViewScheduleEntry[]
  academicEvents: AcademicEvent[]
  termStart: Date | string
  termEnd: Date | string
  roomFilter: string | null
  classFilter: string | null
  periodFilter?: number | null
  typeFilter?: 'all' | 'room' | 'specialist'
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().slice(0, 10)
}

function statusLabel(status: string): { text: string; className: string } {
  switch (status) {
    case 'FORCE_ASSIGNED':
      return { text: '충돌', className: 'text-red-600 font-semibold' }
    case 'NORMAL':
      return { text: '정상', className: 'text-green-600 font-semibold' }
    case 'EXCEPTION_ALLOWED':
      return { text: '예외허용', className: 'text-yellow-600 font-semibold' }
    default:
      return { text: status, className: 'text-gray-500' }
  }
}

export function ListView({ entries, academicEvents, termStart, termEnd, roomFilter, classFilter, periodFilter = null, typeFilter = 'all' }: Props) {
  const tsDate = new Date(termStart)
  const teDate = new Date(termEnd)

  // Filter entries
  const filtered = entries.filter(e => {
    if (e.status === 'EXCEPTION_CANCELLED') return false
    if (roomFilter && e.roomId !== roomFilter) return false
    if (classFilter && e.classId !== classFilter) return false
    if (periodFilter !== null && e.period.number !== periodFilter) return false
    if (typeFilter === 'room' && e.roomId === null) return false
    if (typeFilter === 'specialist' && e.roomId !== null) return false
    return true
  })

  const stats = computeUsageStats(filtered)
  const schoolDays = computeSchoolDays(tsDate, teDate, academicEvents)

  return (
    <div className="space-y-8">
      {/* Usage statistics section */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">특별실 사용 현황</h2>
          <span className="text-sm text-gray-500">학기 총 수업일: {schoolDays}일</span>
        </div>

        {stats.length === 0 ? (
          <p className="text-gray-500 text-sm">사용 내역이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map(stat => {
              const ratio = schoolDays > 0 ? Math.min(stat.totalDays / schoolDays, 1) : 0
              const pct = Math.round(ratio * 100)
              return (
                <div key={stat.roomId} className="border rounded-lg p-4 bg-white shadow-sm">
                  <h3 className="font-semibold text-base mb-2">{stat.roomName}</h3>
                  <div className="text-sm text-gray-600 mb-3">
                    <span>{stat.totalDays}일 / {stat.totalSessions}교시</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1 text-right">{pct}%</div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Entry list section */}
      <section>
        <h2 className="text-xl font-bold mb-4">배정 목록 ({filtered.length}건)</h2>

        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm">배정 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left">구분</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">날짜</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">교시</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">장소</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">학급</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">과목</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">교사</th>
                  <th className="border border-gray-200 px-3 py-2 text-left">상태</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const { text, className } = statusLabel(e.status)
                  const isSpecialist = e.roomId === null
                  const rowBg = isSpecialist ? 'hover:bg-green-50' : 'hover:bg-blue-50'
                  return (
                    <tr key={e.id} className={rowBg}>
                      <td className="border border-gray-200 px-3 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          isSpecialist ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isSpecialist ? '전담' : '특별실'}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-3 py-2">{formatDate(e.date)}</td>
                      <td className="border border-gray-200 px-3 py-2">{e.period.number}교시</td>
                      <td className="border border-gray-200 px-3 py-2">{e.room?.name ?? '일반 교실'}</td>
                      <td className="border border-gray-200 px-3 py-2">
                        {e.classGroup.grade.number}학년 {e.classGroup.number}반
                      </td>
                      <td className="border border-gray-200 px-3 py-2">
                        {isSpecialist ? formatSpecialistSubjectTeacher(e) : (e.subject?.name ?? '-')}
                      </td>
                      <td className="border border-gray-200 px-3 py-2">{e.teacher?.name ?? '-'}</td>
                      <td className={`border border-gray-200 px-3 py-2 ${className}`}>{text}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
