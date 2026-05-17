'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { quickAssignClass } from './actions'

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface RoomOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  termId: string
  roomId: string | null   // null = must pick from availableRooms
  periodId: string
  date: string      // YYYY-MM-DD
  classes: ClassData[]
  onAssigned: (details: { roomId: string; classIds: string[]; periodId: string; date: string }) => void
  availableRooms?: RoomOption[]
}

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일']

export function ClassPickerDialog({
  open, onClose, termId, roomId, periodId, date, classes, onAssigned, availableRooms,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pickedRoomId, setPickedRoomId] = useState<string | null>(roomId)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Group by grade
  const gradeMap = new Map<number, ClassData[]>()
  for (const cls of classes) {
    const gn = cls.grade.number
    if (!gradeMap.has(gn)) gradeMap.set(gn, [])
    gradeMap.get(gn)!.push(cls)
  }
  const grades = [...gradeMap.keys()].sort((a, b) => a - b)

  const d = new Date(date)
  const utcDay = d.getUTCDay()
  const mondayBased = utcDay === 0 ? 6 : utcDay - 1
  const dateLabel = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DAY_KO[mondayBased]})`

  function toggleClass(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGrade(gradeNum: number) {
    const group = gradeMap.get(gradeNum)!
    const allSelected = group.every(c => selected.has(c.id))
    setSelected(prev => {
      const next = new Set(prev)
      allSelected
        ? group.forEach(c => next.delete(c.id))
        : group.forEach(c => next.add(c.id))
      return next
    })
  }

  function isGradeAllSelected(gradeNum: number) {
    const group = gradeMap.get(gradeNum)!
    return group.length > 0 && group.every(c => selected.has(c.id))
  }

  function isGradePartialSelected(gradeNum: number) {
    const group = gradeMap.get(gradeNum)!
    return group.some(c => selected.has(c.id)) && !isGradeAllSelected(gradeNum)
  }

  function handleAssign() {
    if (selected.size === 0 || !pickedRoomId) return
    setError('')
    startTransition(async () => {
      let created = 0, conflicts = 0
      for (const classId of selected) {
        const result = await quickAssignClass({ termId, roomId: pickedRoomId, classId, periodId, date })
        if (!result.success) { setError(result.error); return }
        created += result.data.created
        conflicts += result.data.conflicts
      }
      if (conflicts > 0) alert(`${created}개 배정 완료, ${conflicts}개 충돌 감지됨`)
      const assignedClassIds = [...selected]
      setSelected(new Set())
      onAssigned({ roomId: pickedRoomId, classIds: assignedClassIds, periodId, date })
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSelected(new Set()); setError(''); setPickedRoomId(roomId); onClose() } }}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>학급 배정 — {dateLabel}</DialogTitle>
        </DialogHeader>

        {/* Room picker — only shown when no room pre-selected */}
        {availableRooms && (
          <div className="border-b pb-3">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">특별실 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {availableRooms.map(room => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setPickedRoomId(room.id)}
                  className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                    pickedRoomId === room.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-3 pt-1 pr-1">
          {grades.map(grade => {
            const group = gradeMap.get(grade)!.sort((a, b) => a.number - b.number)
            const allSel = isGradeAllSelected(grade)
            const partSel = isGradePartialSelected(grade)

            return (
              <div key={grade}>
                {/* Grade header with "모두 선택" checkbox */}
                <label className="flex items-center gap-2 mb-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSel}
                    ref={el => { if (el) el.indeterminate = partSel }}
                    onChange={() => toggleGrade(grade)}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span className="text-xs font-semibold text-gray-600">{grade}학년</span>
                  <span className="text-xs text-gray-400">모두 선택</span>
                </label>

                {/* When whole grade selected: show collapsed chip; otherwise show individual buttons */}
                {allSel ? (
                  <button
                    type="button"
                    onClick={() => toggleGrade(grade)}
                    className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white border border-blue-600 font-medium"
                  >
                    {grade}학년 전체 ({group.length}반)
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {group.map(cls => {
                      const isSel = selected.has(cls.id)
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.id)}
                          className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                            isSel
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400'
                          }`}
                        >
                          {cls.number}반
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button
            onClick={handleAssign}
            disabled={selected.size === 0 || isPending || !pickedRoomId}
          >
            {isPending ? '배정 중...' : `${selected.size}개 학급 배정`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
