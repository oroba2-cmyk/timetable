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
import { buildViewEntryWhere, viewEntrySelect } from '@/lib/schedule/view-entry-query'
import { CalendarView } from '@/features/calendar-view/CalendarView'
import { ReservationForm } from '@/features/reservations/ReservationForm'
import { ListView } from '@/features/list-view/ListView'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

function quickLink(
  view: string,
  year: number,
  month: number,
  room: string | null,
  cls: string | null,
  type: string,
  period: number | null,
) {
  const { from, to } = monthRange(year, month)
  const p = new URLSearchParams({ view, from, to })
  if (room) p.set('room', room)
  if (cls) p.set('class', cls)
  if (type && type !== 'all') p.set('type', type)
  if (period !== null) p.set('period', String(period))
  return `/view?${p.toString()}`
}

export default async function ViewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string; room?: string; class?: string; type?: string; period?: string }>
}) {
  const params = await searchParams
  const view = params.view === 'list' ? 'list' : 'calendar'

  const now = new Date()
  const defaultRange = monthRange(now.getFullYear(), now.getMonth() + 1)
  const fromStr = params.from ?? defaultRange.from
  const toStr = params.to ?? defaultRange.to
  const roomFilter = params.room || null
  const classFilter = params.class || null
  const periodNum = params.period ? Number(params.period) : null
  const periodFilter = periodNum !== null && !Number.isNaN(periodNum) ? periodNum : null
  const typeFilter = (params.type === 'room' || params.type === 'specialist') ? params.type : 'all'

  // Derive calendar month from `from` date
  const fromDate = new Date(fromStr)
  const year = fromDate.getUTCFullYear()
  const month = fromDate.getUTCMonth() + 1

  // Quick-nav months
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const nextMonthVal = thisMonth === 12 ? 1 : thisMonth + 1
  const nextMonthYear = thisMonth === 12 ? thisYear + 1 : thisYear
  const prevMonthVal = month === 1 ? 12 : month - 1
  const prevMonthYear = month === 1 ? year - 1 : year
  const nextCalMonth = month === 12 ? 1 : month + 1
  const nextCalYear = month === 12 ? year + 1 : year

  const activeTerm = await resolveActiveTerm({ from: fromStr, to: toStr })

  if (!activeTerm) {
    return <div className="text-center py-16 text-gray-500">학기를 등록해 주세요.</div>
  }

  const [rooms, periods, subjects, teachers, grades, academicEvents] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listAcademicEvents(activeTerm.id),
  ])
  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))

  const entries = await prisma.scheduleEntry.findMany({
    where: buildViewEntryWhere(activeTerm.id, fromStr, toStr, {
      roomId: roomFilter,
      classId: classFilter,
      periodNumber: periodFilter,
      type: typeFilter,
    }),
    select: viewEntrySelect,
    orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
  })

  const tabs = (
    <div className="flex gap-0 border-b">
      {(['calendar', 'list'] as const).map(t => {
        const label = t === 'calendar' ? '달력으로 보기' : '목록으로 보기'
        const href = `/view?${new URLSearchParams({ view: t, from: fromStr, to: toStr, ...(roomFilter ? { room: roomFilter } : {}), ...(classFilter ? { class: classFilter } : {}), ...(periodFilter !== null ? { period: String(periodFilter) } : {}), ...(typeFilter !== 'all' ? { type: typeFilter } : {}) }).toString()}`
        return (
          <Link key={t} href={href}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )

  const exportUrl = `/api/export?termId=${activeTerm.id}&from=${fromStr}&to=${toStr}${roomFilter ? `&room=${roomFilter}` : ''}`

  // Shared filter form
  const filterForm = (
    <form method="get" className="flex flex-wrap gap-3 items-end p-4 border rounded-lg bg-gray-50">
      <input type="hidden" name="view" value={view} />

      <div className="flex flex-col gap-1">
        <label htmlFor="from" className="text-xs text-gray-500">시작일</label>
        <input type="date" id="from" name="from" defaultValue={fromStr} className="border rounded px-2 py-1 text-sm" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="to" className="text-xs text-gray-500">종료일</label>
        <input type="date" id="to" name="to" defaultValue={toStr} className="border rounded px-2 py-1 text-sm" />
      </div>

      {/* Quick month buttons */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">빠른 선택</span>
        <div className="flex gap-1.5">
          <Link
            href={quickLink(view, prevMonthYear, prevMonthVal, roomFilter, classFilter, typeFilter, periodFilter)}
            className="px-2.5 py-1 border rounded text-sm hover:bg-gray-100 whitespace-nowrap"
          >
            ← 이전 달
          </Link>
          <Link
            href={quickLink(view, thisYear, thisMonth, roomFilter, classFilter, typeFilter, periodFilter)}
            className="px-2.5 py-1 border rounded text-sm hover:bg-gray-100 whitespace-nowrap"
          >
            이번 달
          </Link>
          <Link
            href={quickLink(view, nextMonthYear, nextMonthVal, roomFilter, classFilter, typeFilter, periodFilter)}
            className="px-2.5 py-1 border rounded text-sm hover:bg-gray-100 whitespace-nowrap"
          >
            다음 달 →
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs text-gray-500">구분</label>
        <select id="type" name="type" defaultValue={typeFilter} className="border rounded px-2 py-1 text-sm">
          <option value="all">전체</option>
          <option value="room">특별실</option>
          <option value="specialist">전담</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="period" className="text-xs text-gray-500">교시</label>
        <select id="period" name="period" defaultValue={periodFilter !== null ? String(periodFilter) : ''} className="border rounded px-2 py-1 text-sm">
          <option value="">전체</option>
          {periods.map(p => (
            <option key={p.id} value={p.number}>
              {p.label ?? `${p.number}교시`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="room" className="text-xs text-gray-500">특별실</label>
        <select id="room" name="room" defaultValue={roomFilter ?? ''} className="border rounded px-2 py-1 text-sm">
          <option value="">전체</option>
          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {view === 'list' && (
        <div className="flex flex-col gap-1">
          <label htmlFor="class" className="text-xs text-gray-500">학급</label>
          <select id="class" name="class" defaultValue={classFilter ?? ''} className="border rounded px-2 py-1 text-sm">
            <option value="">전체</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.grade.number}학년 {c.number}반</option>
            ))}
          </select>
        </div>
      )}

      <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">조회</button>
      <Link href={`/view?view=${view}`} className="px-4 py-1.5 border text-sm rounded hover:bg-gray-100">초기화</Link>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          달력·목록으로 보기
          <ActiveTermBadge year={activeTerm.year} semester={activeTerm.semester} />
        </h1>
        <div className="flex items-center gap-2">
          {view === 'list' && (
            <a href={exportUrl} className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              엑셀 내보내기
            </a>
          )}
          {view === 'calendar' && (
            <ReservationForm
              termId={activeTerm.id}
              rooms={rooms}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              periods={periods}
              trigger={<Button>+ 단건 예약</Button>}
            />
          )}
        </div>
      </div>

      {tabs}

      <div className="space-y-4">
        {filterForm}

        {view === 'calendar' && (
          <>
            <div className="flex items-center justify-center gap-4">
              <Link href={quickLink('calendar', prevMonthYear, prevMonthVal, roomFilter, classFilter, typeFilter, periodFilter)}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-100">← 이전 달</Link>
              <span className="text-2xl font-semibold">{year}년 {month}월</span>
              <Link href={quickLink('calendar', nextCalYear, nextCalMonth, roomFilter, classFilter, typeFilter, periodFilter)}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-100">다음 달 →</Link>
            </div>
            <CalendarView
              year={year}
              month={month}
              entries={entries}
              academicEvents={academicEvents}
              roomFilter={roomFilter}
              periodFilter={periodFilter}
              typeFilter={typeFilter}
            />
          </>
        )}

        {view === 'list' && (
          <ListView
            entries={entries}
            academicEvents={academicEvents}
            termStart={activeTerm.startDate}
            termEnd={activeTerm.endDate}
            roomFilter={roomFilter}
            classFilter={classFilter}
            periodFilter={periodFilter}
            typeFilter={typeFilter}
          />
        )}
      </div>
    </div>
  )
}
