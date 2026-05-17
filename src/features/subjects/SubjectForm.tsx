'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createSubject, updateSubject } from './actions'
import type { SubjectWithDetails } from './actions'
import type { Teacher, ClassGroup, Grade } from '@/generated/prisma'

type GradeWithClasses = Grade & { classGroups: ClassGroup[] }

interface Props {
  termId: string
  subject?: SubjectWithDetails
  teachers: Teacher[]
  grades: GradeWithClasses[]
  trigger: React.ReactNode
}

function computeDefaultHours(isSpecialized: boolean, selectedIds: Set<string>, grades: GradeWithClasses[]): number {
  if (!isSpecialized) return 1
  const selectedGrades = new Set<number>()
  for (const grade of grades) {
    for (const cls of grade.classGroups) {
      if (selectedIds.has(cls.id)) selectedGrades.add(grade.number)
    }
  }
  if (selectedGrades.has(5) || selectedGrades.has(6)) return 3
  if (selectedGrades.has(3) || selectedGrades.has(4)) return 2
  return 1
}

export function SubjectForm({ termId, subject, teachers, grades, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const [isSpecialized, setIsSpecialized] = useState(subject?.isSpecialized ?? false)
  const [weeklyHours, setWeeklyHours] = useState<number>(subject?.weeklyHours ?? 1)

  const existingClassGroupIds = new Set(subject?.subjectClassGroups.map(sg => sg.classGroup.id) ?? [])
  const existingTeacher = subject?.teacherSubjects[0]?.teacher

  const [selectedIds, setSelectedIds] = useState<Set<string>>(existingClassGroupIds)

  useEffect(() => {
    if (open) {
      setIsSpecialized(subject?.isSpecialized ?? false)
      setWeeklyHours(subject?.weeklyHours ?? 1)
      setSelectedIds(new Set(subject?.subjectClassGroups.map(sg => sg.classGroup.id) ?? []))
      setError(false)
    }
  }, [open])

  const visibleTeachers = isSpecialized
    ? teachers.filter(t => t.type === 'SPECIALIZED')
    : teachers

  function applyAutoHours(nextIds: Set<string>, nextSpecialized: boolean) {
    if (!subject) setWeeklyHours(computeDefaultHours(nextSpecialized, nextIds, grades))
  }

  function toggleClass(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      applyAutoHours(next, isSpecialized)
      return next
    })
  }

  function toggleGrade(cls: ClassGroup[]) {
    const allSelected = cls.every(c => selectedIds.has(c.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      cls.forEach(c => allSelected ? next.delete(c.id) : next.add(c.id))
      applyAutoHours(next, isSpecialized)
      return next
    })
  }

  function toggleAll() {
    const allIds = grades.flatMap(g => g.classGroups.map(c => c.id))
    const allSelected = allIds.every(id => selectedIds.has(id))
    const next = allSelected ? new Set<string>() : new Set(allIds)
    setSelectedIds(next)
    applyAutoHours(next, isSpecialized)
  }

  function handleSpecializedChange(checked: boolean) {
    setIsSpecialized(checked)
    applyAutoHours(selectedIds, checked)
  }

  async function handleSubmit(fd: FormData) {
    const teacherInput = (fd.get('teacherName') as string).trim()
    const matchedTeacher = teachers.find(t => t.name === teacherInput)
    const data = {
      termId,
      name: fd.get('name') as string,
      isSpecialized,
      requiresRoom: fd.get('requiresRoom') === 'on',
      weeklyHours,
      classGroupIds: [...selectedIds],
      teacherId: matchedTeacher?.id,
      teacherName: matchedTeacher ? undefined : (teacherInput || undefined),
    }
    const result = subject
      ? await updateSubject(subject.id, { ...data, termId })
      : await createSubject(data)
    if (result.success) {
      setOpen(false)
      setError(false)
    } else {
      setError(true)
    }
  }

  const allIds = grades.flatMap(g => g.classGroups.map(c => c.id))
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subject ? '과목 수정' : '과목 추가'}</DialogTitle>
        </DialogHeader>
        <form key={subject?.id ?? 'new'} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">과목명</Label>
            <Input id="name" name="name" defaultValue={subject?.name} required />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isSpecialized"
              checked={isSpecialized}
              onChange={e => handleSpecializedChange(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="isSpecialized">전담 과목</Label>
          </div>
          {isSpecialized && (
            <div>
              <Label htmlFor="teacherName">담당 전담교사</Label>
              <Input
                id="teacherName"
                name="teacherName"
                defaultValue={existingTeacher?.name ?? ''}
                placeholder="교사 이름 입력 (없으면 자동 등록)"
                list="subjectTeacherList"
              />
              <datalist id="subjectTeacherList">
                {visibleTeachers.map(t => <option key={t.id} value={t.name} />)}
              </datalist>
              {visibleTeachers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  등록된 전담 교사가 없습니다. 이름을 입력하면 자동으로 전담 교사로 등록됩니다.
                </p>
              )}
            </div>
          )}
          {!isSpecialized && (
            <input type="hidden" name="teacherName" value="" />
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>대상 학급</Label>
              <button type="button" onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
                {allSelected ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            {grades.length === 0 ? (
              <p className="text-sm text-gray-400">학급이 없습니다. 먼저 학급을 등록해주세요.</p>
            ) : (
              <div className="space-y-3 border rounded p-3 bg-gray-50">
                {grades.map(grade => {
                  const gradeClasses = grade.classGroups
                  const gradeAllSelected = gradeClasses.every(c => selectedIds.has(c.id))
                  const gradeSomeSelected = gradeClasses.some(c => selectedIds.has(c.id))
                  return (
                    <div key={grade.id}>
                      <label className="flex items-center gap-2 cursor-pointer mb-1">
                        <input
                          type="checkbox"
                          checked={gradeAllSelected}
                          ref={el => { if (el) el.indeterminate = gradeSomeSelected && !gradeAllSelected }}
                          onChange={() => toggleGrade(gradeClasses)}
                          className="size-4"
                        />
                        <span className="text-sm font-medium">{grade.number}학년</span>
                      </label>
                      <div className="flex flex-wrap gap-3 pl-6">
                        {gradeClasses.map(cls => (
                          <label key={cls.id} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(cls.id)}
                              onChange={() => toggleClass(cls.id)}
                            />
                            <span className="text-sm">{cls.displayName ?? `${cls.number}반`}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="weeklyHours">주당 시수</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                id="weeklyHours"
                min={1}
                max={20}
                value={weeklyHours}
                onChange={e => setWeeklyHours(Math.max(1, parseInt(e.target.value) || 1))}
                className="border rounded px-2 py-1.5 text-sm w-20"
              />
              <span className="text-sm text-gray-500">시간/주</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresRoom"
              name="requiresRoom"
              defaultChecked={subject?.requiresRoom ?? false}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="requiresRoom">특별실 필요</Label>
          </div>
          {error && <p className="text-red-500 text-sm">과목 등록 중 오류가 발생했습니다.</p>}
          <Button type="submit" className="w-full">
            {subject ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
