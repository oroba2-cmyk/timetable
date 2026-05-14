import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listEntriesForWeek, listScheduleRules, deleteScheduleRule } from '@/features/schedule/actions'
import { listGrades } from '@/features/classes/actions'
import { WeeklyGrid } from '@/features/schedule/WeeklyGrid'
import { RuleDialog } from '@/features/schedule/RuleDialog'
import { RoomFilter } from '@/features/schedule/RoomFilter'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function getWeekDates(referenceDate: Date): string[] {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day  // adjust to Monday
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(d)
    date.setDate(date.getDate() + i)
    return date.toISOString().slice(0, 10)
  })
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; room?: string }>
}) {
  const { week, room } = await searchParams

  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <div className="text-center py-16 text-gray-500">
        학기를 등록해 주세요.
      </div>
    )
  }

  const refDate = week ? new Date(week) : new Date()
  const weekDates = getWeekDates(refDate)

  const [rooms, periods, subjects, teachers, grades, entriesResult, rulesResult] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listEntriesForWeek(activeTerm.id, weekDates[0]),
    listScheduleRules(activeTerm.id),
  ])

  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))
  const entries = entriesResult.success ? entriesResult.data : []
  const rules = rulesResult.success ? rulesResult.data : []

  const prevWeekDate = new Date(weekDates[0])
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const prevWeek = prevWeekDate.toISOString().slice(0, 10)

  const nextWeekDate = new Date(weekDates[0])
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeek = nextWeekDate.toISOString().slice(0, 10)

  const currentRoom = room || null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">주간 시간표 편집기</h1>
        <RuleDialog
          termId={activeTerm.id}
          rooms={rooms}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          periods={periods}
          trigger={<Button>+ 배정 규칙 추가</Button>}
        />
      </div>

      {/* Navigation + Room Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href={`/schedule?week=${prevWeek}${currentRoom ? `&room=${currentRoom}` : ''}`}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          ← 이전 주
        </Link>
        <span className="text-sm font-medium">
          {weekDates[0]} ~ {weekDates[4]}
        </span>
        <Link
          href={`/schedule?week=${nextWeek}${currentRoom ? `&room=${currentRoom}` : ''}`}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          다음 주 →
        </Link>
        <RoomFilter
          rooms={rooms}
          currentWeek={weekDates[0]}
          currentRoom={currentRoom}
        />
      </div>

      {/* Weekly Grid */}
      <WeeklyGrid
        weekDates={weekDates}
        periods={periods}
        entries={entries}
        roomFilter={currentRoom}
      />

      {/* Rules List */}
      <div>
        <h2 className="text-lg font-semibold mb-3">배정 규칙 목록</h2>
        {rules.length === 0 ? (
          <p className="text-gray-500 text-sm">등록된 배정 규칙이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="flex items-center justify-between border rounded p-3 bg-white text-sm"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {rule.classGroup.grade.number}학년 {rule.classGroup.number}반
                    {rule.subject && ` · ${rule.subject.name}`}
                    {rule.teacher && ` · ${rule.teacher.name}`}
                  </div>
                  <div className="text-gray-500">
                    {rule.room.name} · {rule.period.number}교시 ·{' '}
                    {String(rule.startDate).slice(0, 10)} 부터{' '}
                    {rule.repeatInterval}{rule.repeatUnit === 'DAY' ? '일' : rule.repeatUnit === 'WEEK' ? '주' : '개월'}마다
                  </div>
                </div>
                <form
                  action={async () => {
                    'use server'
                    await deleteScheduleRule(rule.id)
                  }}
                >
                  <Button variant="destructive" size="sm" type="submit">삭제</Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
