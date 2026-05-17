export const dynamic = 'force-dynamic'

import { resolveActiveTerm } from '@/features/terms/actions'
import { ActiveTermBadge } from '@/components/ActiveTermBadge'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods, listAllPeriodsDetailed } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listEntriesForWeek, listScheduleRules } from '@/features/schedule/actions'
import { listGrades } from '@/features/classes/actions'
import { ScheduleEditor } from '@/features/schedule/ScheduleEditor'
import { WeekNavigator } from '@/features/schedule/WeekNavigator'
import { RuleDialog } from '@/features/schedule/RuleDialog'
import { Button } from '@/components/ui/button'

function getWeekDates(referenceDate: Date): string[] {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
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
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams

  const refDate = week ? new Date(week) : new Date()
  const weekDates = getWeekDates(refDate)
  const activeTerm = await resolveActiveTerm({ date: refDate })

  if (!activeTerm) {
    return (
      <div className="text-center py-16 text-gray-500">학기를 등록해 주세요.</div>
    )
  }

  const [rooms, periods, allPeriods, subjects, teachers, grades, entriesResult, rulesResult] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listAllPeriodsDetailed(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listEntriesForWeek(activeTerm.id, weekDates[0], 'ROOM'),
    listScheduleRules(activeTerm.id, 'ROOM'),
  ])

  // Full objects for RuleDialog (expects ClassGroup & { grade: Grade })
  const fullClasses = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))
  // Slim objects for ScheduleEditor / ClassPickerDialog
  const classes = fullClasses.map(c => ({ id: c.id, number: c.number, grade: { number: c.grade.number } }))

  const rawEntries = entriesResult.success ? entriesResult.data : []
  const entries = rawEntries.map(e => ({
    id: e.id,
    date: new Date(e.date).toISOString(),
    periodId: e.periodId,
    roomId: e.roomId,
    sourceRuleId: e.sourceRuleId,
    classGroup: {
      number: e.classGroup.number,
      grade: { number: e.classGroup.grade.number },
    },
    status: e.status,
    teacherId: e.teacherId ?? null,
    subjectId: null,
    subjectName: null,
    teacherName: null,
  }))

  const rules = rulesResult.success ? rulesResult.data : []

  const prevWeekDate = new Date(weekDates[0])
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const prevWeek = prevWeekDate.toISOString().slice(0, 10)

  const nextWeekDate = new Date(weekDates[0])
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeek = nextWeekDate.toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        특별실 시간표
        <ActiveTermBadge year={activeTerm.year} semester={activeTerm.semester} />
      </h1>

      {/* Week navigation */}
      <WeekNavigator weekDates={weekDates} prevWeek={prevWeek} nextWeek={nextWeek} />

      {/* Two-panel editor */}
      <ScheduleEditor
        termId={activeTerm.id}
        rooms={rooms.map(r => ({ id: r.id, name: r.name, location: r.location ?? null, grades: r.grades }))}
        allPeriods={allPeriods.map(p => ({
          id: p.id,
          number: p.number,
          gradeNumber: p.gradeNumber,
          startTime: p.startTime,
          endTime: p.endTime,
          label: p.label ?? null,
        }))}
        classes={classes}
        weekDates={weekDates}
        entries={entries}
        termStartDate={new Date(activeTerm.startDate).toISOString().slice(0, 10)}
        headerButton={
          <RuleDialog
            key="schedule-header-rule-dialog"
            termId={activeTerm.id}
            rooms={rooms}
            classes={fullClasses}
            subjects={subjects}
            teachers={teachers}
            periods={periods}
            trigger={<Button variant="outline">고급 배정 규칙 추가</Button>}
          />
        }
        rules={rules.map(rule => ({
          id: rule.id,
          roomName: rule.room?.name ?? '일반 교실',
          periodNumber: rule.period.number,
          classGradeNumber: rule.classGroup.grade.number,
          classNumber: rule.classGroup.number,
          subjectName: rule.subject?.name ?? null,
          teacherName: rule.teacher?.name ?? null,
          teacherId: rule.teacherId ?? null,
          startDate: new Date(rule.startDate).toISOString().slice(0, 10),
          repeatInterval: rule.repeatInterval,
          repeatUnit: rule.repeatUnit as 'DAY' | 'WEEK' | 'MONTH',
          edit: {
            id: rule.id,
            roomId: rule.roomId,
            classId: rule.classId,
            subjectId: rule.subjectId ?? null,
            teacherId: rule.teacherId ?? null,
            periodId: rule.periodId,
            startDate: new Date(rule.startDate).toISOString().slice(0, 10),
            repeatInterval: rule.repeatInterval,
            repeatUnit: rule.repeatUnit as 'DAY' | 'WEEK' | 'MONTH',
            repeatDays: rule.repeatDays as number[],
            endType: rule.endType as 'NONE' | 'DATE' | 'COUNT',
            endDate: rule.endDate ? new Date(rule.endDate).toISOString().slice(0, 10) : null,
            endCount: rule.endCount ?? null,
          },
        }))}
        fullRooms={rooms}
        fullClasses={fullClasses}
        subjects={subjects}
        teachers={teachers}
        rawPeriods={periods}
      />
    </div>
  )
}
