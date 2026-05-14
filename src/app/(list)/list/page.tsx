export const dynamic = 'force-dynamic'

import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listGrades } from '@/features/classes/actions'
import { listAcademicEvents } from '@/features/academic-calendar/actions'
import { prisma } from '@/lib/db/client'
import { ListView } from '@/features/list-view/ListView'
import Link from 'next/link'

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; class?: string; from?: string; to?: string }>
}) {
  const { room, class: classParam, from, to } = await searchParams

  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <div className="text-center py-16 text-gray-500">
        학기를 등록해 주세요.
      </div>
    )
  }

  const fromDate = from ? new Date(from) : activeTerm.startDate
  const toDate = to ? new Date(to) : activeTerm.endDate

  const fromStr = fromDate instanceof Date ? fromDate.toISOString().slice(0, 10) : String(fromDate).slice(0, 10)
  const toStr = toDate instanceof Date ? toDate.toISOString().slice(0, 10) : String(toDate).slice(0, 10)

  const [rooms, grades, academicEvents, entries] = await Promise.all([
    listRooms(activeTerm.id),
    listGrades(activeTerm.id),
    listAcademicEvents(activeTerm.id),
    prisma.scheduleEntry.findMany({
      where: {
        termId: activeTerm.id,
        date: { gte: new Date(fromStr), lte: new Date(toStr) },
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
        period: { select: { number: true, startTime: true, endTime: true } },
      },
      orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
    }),
  ])

  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))

  const exportUrl = `/api/export?termId=${activeTerm.id}&from=${fromStr}&to=${toStr}${room ? `&room=${room}` : ''}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">목록형 보기</h1>
        <a
          href={exportUrl}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          엑셀 내보내기
        </a>
      </div>

      {/* Filter form */}
      <form method="get" className="flex flex-wrap gap-3 items-end p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs text-gray-500">시작일</label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={fromStr}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs text-gray-500">종료일</label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={toStr}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="room" className="text-xs text-gray-500">특별실</label>
          <select
            id="room"
            name="room"
            defaultValue={room ?? ''}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">전체</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="class" className="text-xs text-gray-500">학급</label>
          <select
            id="class"
            name="class"
            defaultValue={classParam ?? ''}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">전체</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.grade.number}학년 {c.number}반
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          조회
        </button>

        <Link
          href="/list"
          className="px-4 py-1.5 border text-sm rounded hover:bg-gray-100"
        >
          초기화
        </Link>
      </form>

      {/* List view */}
      <ListView
        entries={entries}
        academicEvents={academicEvents}
        termStart={activeTerm.startDate}
        termEnd={activeTerm.endDate}
        roomFilter={room ?? null}
        classFilter={classParam ?? null}
      />
    </div>
  )
}
