'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SubjectSidebar, type SubjectData } from './SubjectSidebar'
import { SpecialistAssignDialog } from './SpecialistAssignDialog'
import { RoomWeeklyGrid } from '@/features/schedule/RoomWeeklyGrid'
import type { RoomEntryData, GridPeriodRow } from '@/features/schedule/RoomWeeklyGrid'
import { RuleListClient, type RuleItem } from '@/features/schedule/RuleListClient'
import {
  bulkDeleteScheduleRules,
  cancelScheduleEntry,
  deleteScheduleRule,
} from '@/features/schedule/actions'
import type { SpecialRoom, ClassGroup, Grade, Subject, Teacher, Period } from '@/generated/prisma'

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
  specialistSubjects: SubjectData[]
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
  termId, specialistSubjects, allPeriods, classes, rooms, weekDates, entries, rules,
  fullRooms, fullClasses, subjects, allTeachers, rawPeriods, headerButton,
}: Props) {
  const router = useRouter()
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(specialistSubjects[0]?.id ?? null)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [pickerCell, setPickerCell] = useState<{ date: string; periodId: string } | null>(null)
  const [, startTransition] = useTransition()

  const gradeNumbers = [...new Set(classes.map(c => c.grade.number))].sort((a, b) => a - b)
  const selectedSubject = specialistSubjects.find(s => s.id === selectedSubjectId) ?? null

  const gridPeriods = selectedGrade !== null
    ? computePeriodRows(allPeriods, [selectedGrade])
    : computePeriodRows(allPeriods, [])

  const filteredEntries = entries.filter(e =>
    (selectedSubjectId === null || e.subjectId === selectedSubjectId) &&
    (selectedGrade === null || e.classGroup.grade.number === selectedGrade)
  )

  const assignmentCounts: Record<string, number> = {}
  for (const entry of entries) {
    if (entry.subjectId) {
      assignmentCounts[entry.subjectId] = (assignmentCounts[entry.subjectId] ?? 0) + 1
    }
  }

  function handleEntryAction(payload: {
    entryIds: string[]
    sourceRuleIds: string[]
    action: 'cancel' | 'deleteRule'
  }) {
    if (payload.action === 'deleteRule') {
      if (payload.sourceRuleIds.length === 0) return
      const n = payload.sourceRuleIds.length
      if (
        !window.confirm(
          n > 1
            ? `연결된 배정 규칙 ${n}개를 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?`
            : '이 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?'
        )
      ) {
        return
      }
      startTransition(async () => {
        if (n === 1) await deleteScheduleRule(payload.sourceRuleIds[0])
        else await bulkDeleteScheduleRules(payload.sourceRuleIds)
        router.refresh()
      })
    } else {
      startTransition(async () => {
        for (const entryId of payload.entryIds) {
          await cancelScheduleEntry(entryId)
        }
        router.refresh()
      })
    }
  }

  function handleAssigned() {
    setPickerCell(null)
    router.refresh()
  }

  return (
    <>
    <div className="flex items-center justify-end gap-2 mb-3">
      {headerButton}
    </div>

    <div className="flex border rounded-lg overflow-hidden min-h-80">
      <SubjectSidebar
        subjects={specialistSubjects}
        selectedSubjectId={selectedSubjectId}
        onSelect={setSelectedSubjectId}
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
            classes={classes}
            onCellClick={(date, periodId) => {
              if (!selectedSubjectId) return
              setPickerCell({ date, periodId })
            }}
            onEntryAction={handleEntryAction}
            showRoom={true}
            rooms={rooms}
            readOnly={!selectedSubjectId}
          />
        </div>
      </div>
    </div>

    {pickerCell && selectedSubjectId && selectedSubject && (
      <SpecialistAssignDialog
        open={true}
        onClose={() => setPickerCell(null)}
        termId={termId}
        subjectId={selectedSubjectId}
        subjectName={selectedSubject.name}
        teacherId={selectedSubject.teacherId}
        teacherName={selectedSubject.teacherName}
        periodId={pickerCell.periodId}
        date={pickerCell.date}
        classes={selectedGrade !== null ? classes.filter(c => c.grade.number === selectedGrade) : classes}
        availableRooms={rooms}
        onAssigned={handleAssigned}
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
          (selectedSubjectId === null || rule.edit.subjectId === selectedSubjectId) &&
          (selectedGrade === null || rule.classGradeNumber === selectedGrade)
        )}
      />
    </div>
    </>
  )
}
