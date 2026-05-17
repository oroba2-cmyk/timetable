export const dynamic = 'force-dynamic'

import { resolveActiveTerm } from '@/features/terms/actions'
import { ActiveTermBadge } from '@/components/ActiveTermBadge'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listGrades } from '@/features/classes/actions'
import { listAcademicEvents } from '@/features/academic-calendar/actions'
import { prisma } from '@/lib/db/client'
import { CalendarView } from '@/features/calendar-view/CalendarView'
import { CalendarRoomFilter } from '@/features/calendar-view/CalendarRoomFilter'
import { ReservationForm } from '@/features/reservations/ReservationForm'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; room?: string }>
}) {
  const { year: yearStr, month: monthStr, room } = await searchParams
  const now = new Date()
  const year = Number(yearStr || now.getFullYear())
  const month = Number(monthStr || (now.getMonth() + 1))
  const roomFilter = room || null

  const monthMid = new Date(Date.UTC(year, month - 1, 15))
  const activeTerm = await resolveActiveTerm({ date: monthMid })

  if (!activeTerm) {
    return (
      <div className="text-center py-16 text-gray-500">
        학기를 등록해 주세요.
      </div>
    )
  }

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  const [rooms, periods, subjects, teachers, grades, academicEvents, entries] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listAcademicEvents(activeTerm.id),
    prisma.scheduleEntry.findMany({
      where: {
        termId: activeTerm.id,
        date: { gte: monthStart, lte: monthEnd },
      },
      include: {
        room: true,
        classGroup: {
          include: {
            grade: { select: { number: true } },
          },
        },
        subject: { select: { name: true } },
        teacher: { select: { name: true } },
        period: { select: { number: true } },
      },
    }),
  ])

  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))

  const prevMonth =
    month === 1
      ? `?year=${year - 1}&month=12`
      : `?year=${year}&month=${month - 1}`
  const nextMonth =
    month === 12
      ? `?year=${year + 1}&month=1`
      : `?year=${year}&month=${month + 1}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          달력형 보기
          <ActiveTermBadge year={activeTerm.year} semester={activeTerm.semester} />
        </h1>
        <ReservationForm
          termId={activeTerm.id}
          rooms={rooms}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          periods={periods}
          trigger={<Button>+ 단건 예약</Button>}
        />
      </div>

      {/* Navigation + Room Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href={prevMonth + (roomFilter ? `&room=${roomFilter}` : '')}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          ← 이전 달
        </Link>
        <span className="text-sm font-medium">
          {year}년 {month}월
        </span>
        <Link
          href={nextMonth + (roomFilter ? `&room=${roomFilter}` : '')}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          다음 달 →
        </Link>
        <CalendarRoomFilter
          rooms={rooms}
          year={year}
          month={month}
          currentRoom={roomFilter}
        />
      </div>

      {/* Calendar */}
      <CalendarView
        year={year}
        month={month}
        entries={entries}
        academicEvents={academicEvents}
        roomFilter={roomFilter}
      />
    </div>
  )
}
