'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TeacherSidebar } from './TeacherSidebar'
import { SpecialistAssignDialog } from './SpecialistAssignDialog'
import { RoomWeeklyGrid } from '@/features/schedule/RoomWeeklyGrid'
import type { RoomEntryData, GridPeriodRow } from '@/features/schedule/RoomWeeklyGrid'
import { RuleListClient, type RuleItem } from '@/features/schedule/RuleListClient'
import { RuleDialog, type RulePrefill } from '@/features/schedule/RuleDialog'
import { cancelScheduleEntry, deleteScheduleRule } from '@/features/schedule/actions'
import type { SpecialRoom, ClassGroup, Grade, Subject, Teacher, Period } from '@/generated/prisma'

interface TeacherData {
  id: string
  name: string
  subjects: { name: string }[]
}

interface AllPeriodDetailed {
  id: string
  number: number
  gradeNumber: number
  startTime: string
  endTime: string
  label: string | null
}

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface RoomData {
  id: string
  name: string
}

interface Props {
  termId: string
  termStartDate: string
  teachers: TeacherData[]
  allPeriods: AllPeriodDetailed[]
  classes: ClassData[]
  rooms: RoomData[]
  weekDates: string[]
  entries: RoomEntryData[]
  rules: RuleItem[]
  fullRooms: SpecialRoom[]
  fullClasses: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  allTeachers: Teacher[]
  rawPeriods: Period[]
  headerButton?: React.ReactNode
}

function computePeriodRows(allPeriods: AllPeriodDetailed[], gradeNumbers: number[]): GridPeriodRow[] {
  let relevant: AllPeriodDetailed[]
  if (gradeNumbers.length === 0) {
    const grade0 = allPeriods.filter(p => p.gradeNumber === 0)
    relevant = grade0.length > 0 ? grade0 : allPeriods.filter(p => p.gradeNumber === 1)
  } else {
    relevant = allPeriods.filter(p => p.gradeNumber === 0 || gradeNumbers.includes(p.gradeNumber))
    if (relevant.length === 0) {
      const grade0 = allPeriods.filter(p => p.gradeNumber === 0)
      relevant = grade0.length > 0 ? grade0 : allPeriods.filter(p => p.gradeNumber === 1)
    }
  }

  const byNumber = new Map<number, AllPeriodDetailed[]>()
  for (const p of relevant) {
    const arr = byNumber.get(p.number) ?? []
    arr.push(p)
    byNumber.set(p.number, arr)
  }

  const rows: GridPeriodRow[] = []
  for (const [number, periods] of byNumber) {
    const byTime = new Map<string, AllPeriodDetailed[]>()
    for (const p of periods) {
      const key = `${p.startTime}-${p.endTime}`
      const arr = byTime.get(key) ?? []
      arr.push(p)
      byTime.set(key, arr)
    }
    const hasMultipleTimes = byTime.size > 1
    for (const timePeriods of byTime.values()) {
      const first = timePeriods[0]
      let gradeHint: string | null = null
      if (hasMultipleTimes) {
        const grades = timePeriods.map(p => p.gradeNumber).filter(g => g !== 0).sort((a, b) => a - b)
        if (grades.length > 0) gradeHint = grades.map(g => `${g}학년`).join('·')
      }
      rows.push({ number, label: first.label ?? null, startTime: first.startTime, endTime: first.endTime, periodIds: timePeriods.map(p => p.id), gradeHint })
    }
  }
  rows.sort((a, b) => a.startTime.localeCompare(b.startTime))
  return rows
}

export function SpecialistEditor({
  termId, termStartDate, teachers, allPeriods, classes, rooms, weekDates, entries, rules,
  fullRooms, fullClasses, subjects, allTeachers, rawPeriods, headerButton,
}: Props) {
  const router = useRouter()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id ?? null)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [pickerCell, setPickerCell] = useState<{ date: string; periodId: string } | null>(null)
  const [ruleQueue, setRuleQueue] = useState<RulePrefill[]>([])
  const [, startTransition] = useTransition()

  const gradeNumbers = [...new Set(classes.map(c => c.grade.number))].sort((a, b) => a - b)
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId) ?? null

  const gridPeriods = selectedGrade !== null
    ? computePeriodRows(allPeriods, [selectedGrade])
    : computePeriodRows(allPeriods, [])

  const filteredEntries = entries.filter(e =>
    (selectedTeacherId === null || e.teacherId === selectedTeacherId) &&
    (selectedGrade === null || e.classGroup.grade.number === selectedGrade)
  )

  const assignmentCounts: Record<string, number> = {}
  for (const entry of entries) {
    if (entry.teacherId) {
      assignmentCounts[entry.teacherId] = (assignmentCounts[entry.teacherId] ?? 0) + 1
    }
  }

  function handleEntryAction(entryId: string, sourceRuleId: string | null, action: 'cancel' | 'deleteRule') {
    if (action === 'deleteRule') {
      if (!sourceRuleId) return
      if (!window.confirm('이 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?')) return
      startTransition(async () => { await deleteScheduleRule(sourceRuleId); router.refresh() })
    } else {
      startTransition(async () => { await cancelScheduleEntry(entryId); router.refresh() })
    }
  }

  function handleAssigned(details: { teacherId: string; classIds: string[]; periodId: string; date: string }) {
    setPickerCell(null)
    router.refresh()
    const d = new Date(details.date)
    const utcDay = d.getUTCDay()
    const repeatDay = utcDay === 0 ? 6 : utcDay - 1
    setRuleQueue(details.classIds.map(classId => ({
      classId,
      periodId: details.periodId,
      startDate: termStartDate,
      repeatDay,
      teacherId: details.teacherId,
    })))
  }

  return (
    <>
    {ruleQueue.length > 0 && (
      <RuleDialog
        termId={termId}
        rooms={fullRooms}
        classes={fullClasses}
        subjects={subjects}
        teachers={allTeachers}
        periods={rawPeriods}
        ruleType="SPECIALIST"
        prefill={ruleQueue[0]}
        forcedOpen={true}
        onForcedClose={() => setRuleQueue(q => q.slice(1))}
        onSaved={() => { setRuleQueue(q => q.slice(1)); router.refresh() }}
      />
    )}

    <div className="flex items-center justify-end gap-2 mb-3">
      {headerButton}
    </div>

    <div className="flex border rounded-lg overflow-hidden min-h-80">
      <TeacherSidebar
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onSelect={setSelectedTeacherId}
        assignmentCounts={assignmentCounts}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Grade tabs */}
        <div className="flex gap-0 border-b bg-gray-50 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setSelectedGrade(null)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-r transition-colors ${
              selectedGrade === null
                ? 'bg-white text-blue-700 font-medium border-b-2 border-b-blue-600 -mb-px'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            모든 학년
          </button>
          {gradeNumbers.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGrade(g)}
              className={`px-3 py-2 text-sm whitespace-nowrap border-r transition-colors ${
                selectedGrade === g
                  ? 'bg-white text-blue-700 font-medium border-b-2 border-b-blue-600 -mb-px'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {g}학년
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          <RoomWeeklyGrid
            weekDates={weekDates}
            periods={gridPeriods}
            entries={filteredEntries}
            onCellClick={(date, periodId) => {
              if (!selectedTeacherId) return
              setPickerCell({ date, periodId })
            }}
            onEntryAction={handleEntryAction}
            showRoom={true}
            rooms={rooms}
            readOnly={!selectedTeacherId}
          />
        </div>
      </div>
    </div>

    {pickerCell && selectedTeacherId && selectedTeacher && (
      <SpecialistAssignDialog
        open={true}
        onClose={() => setPickerCell(null)}
        termId={termId}
        teacherId={selectedTeacherId}
        teacherName={selectedTeacher.name}
        periodId={pickerCell.periodId}
        date={pickerCell.date}
        classes={selectedGrade !== null ? classes.filter(c => c.grade.number === selectedGrade) : classes}
        availableRooms={rooms}
        onAssigned={details => handleAssigned({ ...details, teacherId: selectedTeacherId })}
      />
    )}

    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">전담 배정 규칙 목록</h2>
      <RuleListClient
        termId={termId}
        rooms={fullRooms}
        classes={fullClasses}
        subjects={subjects}
        teachers={allTeachers}
        periods={rawPeriods}
        rules={rules.filter(rule =>
          (selectedTeacherId === null || rule.teacherId === selectedTeacherId) &&
          (selectedGrade === null || rule.classGradeNumber === selectedGrade)
        )}
      />
    </div>
    </>
  )
}
