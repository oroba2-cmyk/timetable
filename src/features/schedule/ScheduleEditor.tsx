'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RoomSidebar } from './RoomSidebar'
import { RoomWeeklyGrid } from './RoomWeeklyGrid'
import type { RoomEntryData, GridPeriodRow } from './RoomWeeklyGrid'
import { ClassPickerDialog } from './ClassPickerDialog'
import { RotationDialog } from './RotationDialog'
import { RuleListClient, type RuleItem } from './RuleListClient'
import { RuleDialog, type RulePrefill } from './RuleDialog'
import { bulkDeleteScheduleRules, cancelScheduleEntry, deleteScheduleRule } from './actions'
import type { SpecialRoom, ClassGroup, Grade, Subject, Teacher, Period } from '@/generated/prisma'

interface RoomData {
  id: string
  name: string
  location: string | null
  grades: number[]
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

interface Props {
  termId: string
  rooms: RoomData[]
  allPeriods: AllPeriodDetailed[]
  classes: ClassData[]
  weekDates: string[]
  entries: RoomEntryData[]
  headerButton?: React.ReactNode
  termStartDate: string
  rules: RuleItem[]
  fullRooms: SpecialRoom[]
  fullClasses: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  rawPeriods: Period[]
}

function computePeriodRows(allPeriods: AllPeriodDetailed[], roomGrades: number[]): GridPeriodRow[] {
  let relevant: AllPeriodDetailed[]

  if (roomGrades.length === 0) {
    // Room has no specific grades — use common (grade 0), fall back to grade 1
    const grade0 = allPeriods.filter(p => p.gradeNumber === 0)
    relevant = grade0.length > 0 ? grade0 : allPeriods.filter(p => p.gradeNumber === 1)
  } else {
    relevant = allPeriods.filter(
      p => p.gradeNumber === 0 || roomGrades.includes(p.gradeNumber)
    )
    // If nothing matched (school uses grade-specific periods not overlapping room grades), show grade 0 or grade 1
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
        const grades = timePeriods
          .map(p => p.gradeNumber)
          .filter(g => g !== 0)
          .sort((a, b) => a - b)
        if (grades.length > 0) {
          gradeHint = grades.map(g => `${g}학년`).join('·')
        }
      }

      rows.push({
        number,
        label: first.label ?? null,
        startTime: first.startTime,
        endTime: first.endTime,
        periodIds: timePeriods.map(p => p.id),
        gradeHint,
      })
    }
  }

  rows.sort((a, b) => a.startTime.localeCompare(b.startTime))

  return rows
}

export function ScheduleEditor({
  termId, rooms, allPeriods, classes, weekDates, entries, headerButton, termStartDate,
  rules, fullRooms, fullClasses, subjects, teachers, rawPeriods,
}: Props) {
  const router = useRouter()
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id ?? null)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [pickerCell, setPickerCell] = useState<{ date: string; periodId: string } | null>(null)
  const [rotationOpen, setRotationOpen] = useState(false)
  const [ruleQueue, setRuleQueue] = useState<RulePrefill[]>([])
  const [, startTransition] = useTransition()

  const gradeNumbers = [...new Set(classes.map(c => c.grade.number))].sort((a, b) => a - b)

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null

  // Grade tab takes priority for period schedule; fall back to room grades or common
  const gridPeriods = selectedGrade !== null
    ? computePeriodRows(allPeriods, [selectedGrade])
    : selectedRoom
      ? computePeriodRows(allPeriods, selectedRoom.grades)
      : computePeriodRows(allPeriods, [])

  // AND filter: both room and grade (null = show all)
  const filteredEntries = entries.filter(e =>
    (selectedRoomId === null || e.roomId === selectedRoomId) &&
    (selectedGrade === null || e.classGroup.grade.number === selectedGrade)
  )

  const assignmentCounts: Record<string, number> = {}
  for (const entry of entries) {
    const rKey = entry.roomId ?? '__no_room__'
    assignmentCounts[rKey] = (assignmentCounts[rKey] ?? 0) + 1
  }
  const visiblePeriodCount = gridPeriods.filter(p => !(p.label?.includes('점심'))).length
  const totalSlots = weekDates.length * visiblePeriodCount

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
        if (n === 1) {
          await deleteScheduleRule(payload.sourceRuleIds[0])
        } else {
          await bulkDeleteScheduleRules(payload.sourceRuleIds)
        }
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

  function handleAssigned(details: { roomId: string; classIds: string[]; periodId: string; date: string }) {
    setPickerCell(null)
    router.refresh()
    const d = new Date(details.date)
    const utcDay = d.getUTCDay()
    const repeatDay = utcDay === 0 ? 6 : utcDay - 1
    setRuleQueue(details.classIds.map(classId => ({
      roomId: details.roomId,
      classId,
      periodId: details.periodId,
      startDate: termStartDate,
      repeatDay,
    })))
  }

  const periodOptions = gridPeriods
    .map(p => ({ id: p.periodIds[0], number: p.number, label: p.label, startTime: p.startTime }))

  const showRoom = selectedRoomId === null

  return (
    <>
    {selectedRoom && rotationOpen && (
      <RotationDialog
        key="rotation-dialog"
        open={rotationOpen}
        onClose={() => setRotationOpen(false)}
        onCreated={() => { setRotationOpen(false); router.refresh() }}
        termId={termId}
        roomId={selectedRoom.id}
        roomName={selectedRoom.name}
        roomGrades={selectedRoom.grades}
        classes={classes}
        periods={periodOptions}
      />
    )}

    {/* Header row: action buttons */}
    <div key="schedule-header" className="flex items-center justify-end gap-2 mb-3">
      {headerButton ?? null}
      {selectedRoomId ? (
        <button
          type="button"
          onClick={() => setRotationOpen(true)}
          className="px-3 py-1.5 border rounded text-sm text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          순환 배정
        </button>
      ) : null}
    </div>

    <div key="schedule-main" className="flex border rounded-lg overflow-hidden min-h-80">
      {/* Room sidebar */}
      <RoomSidebar
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelect={setSelectedRoomId}
        assignmentCounts={assignmentCounts}
        totalSlots={totalSlots}
      />

      {/* Right panel: grade tabs + grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Grade filter tabs */}
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

        {/* Grid */}
        <div className="flex-1 overflow-auto">
          <RoomWeeklyGrid
            weekDates={weekDates}
            periods={gridPeriods}
            entries={filteredEntries}
            classes={classes}
            onCellClick={(date, periodId) => setPickerCell({ date, periodId })}
            onEntryAction={handleEntryAction}
            showRoom={showRoom}
            rooms={rooms.map(r => ({ id: r.id, name: r.name }))}
          />
        </div>
      </div>
    </div>

    {pickerCell && (
      <ClassPickerDialog
        key={`picker-${pickerCell.date}-${pickerCell.periodId}`}
        open={true}
        onClose={() => setPickerCell(null)}
        termId={termId}
        roomId={selectedRoomId}
        periodId={pickerCell.periodId}
        date={pickerCell.date}
        classes={selectedGrade !== null ? classes.filter(c => c.grade.number === selectedGrade) : classes}
        onAssigned={handleAssigned}
        availableRooms={selectedRoomId === null ? rooms.map(r => ({ id: r.id, name: r.name })) : undefined}
      />
    )}

    {/* Post-assignment rule creation queue */}
    {ruleQueue.length > 0 && (
      <RuleDialog
        key={`rule-queue-${ruleQueue[0].classId}-${ruleQueue[0].periodId}-${ruleQueue[0].repeatDay ?? ''}`}
        termId={termId}
        rooms={fullRooms}
        classes={fullClasses}
        subjects={subjects}
        teachers={teachers}
        periods={rawPeriods}
        prefill={ruleQueue[0]}
        forcedOpen={true}
        onForcedClose={() => setRuleQueue(q => q.slice(1))}
        onSaved={() => { setRuleQueue(q => q.slice(1)); router.refresh() }}
      />
    )}

    {/* Rules list — filtered by selected room and grade */}
    <div key="schedule-rules" className="mt-6">
      <h2 className="text-lg font-semibold mb-3">배정 규칙 목록</h2>
      <RuleListClient
        termId={termId}
        rooms={fullRooms}
        classes={fullClasses}
        subjects={subjects}
        teachers={teachers}
        periods={rawPeriods}
        rules={rules.filter(rule =>
          (selectedRoomId === null || rule.edit.roomId === selectedRoomId) &&
          (selectedGrade === null || rule.classGradeNumber === selectedGrade)
        )}
      />
    </div>
    </>
  )
}
