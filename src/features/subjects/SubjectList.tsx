'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { SubjectForm } from './SubjectForm'
import { deleteSubject, duplicateSubject } from './actions'
import type { SubjectWithDetails } from './actions'
import type { Teacher, ClassGroup, Grade } from '@/generated/prisma'

type GradeWithClasses = Grade & { classGroups: ClassGroup[] }
type SortKey = 'name' | 'teacher'

interface Props {
  subjects: SubjectWithDetails[]
  teachers: Teacher[]
  grades: GradeWithClasses[]
  termId: string
}

function formatClassGroups(
  groups: SubjectWithDetails['subjectClassGroups'],
  allGrades: GradeWithClasses[]
): string {
  if (groups.length === 0) return '-'

  const selectedByGrade: Record<number, Set<number>> = {}
  for (const { classGroup } of groups) {
    const g = classGroup.grade.number
    selectedByGrade[g] = selectedByGrade[g] ?? new Set()
    selectedByGrade[g].add(classGroup.number)
  }

  const totalByGrade: Record<number, number> = {}
  for (const grade of allGrades) {
    totalByGrade[grade.number] = grade.classGroups.length
  }

  return Object.entries(selectedByGrade)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([gradeStr, nums]) => {
      const grade = Number(gradeStr)
      const sorted = [...nums].sort((a, b) => a - b)
      const total = totalByGrade[grade]
      if (total && sorted.length === total) return `${grade}학년 전체`
      return `${grade}학년 ${sorted.join('·')}반`
    })
    .join(', ')
}

function SubjectRow({
  subject, teachers, grades, termId,
}: { subject: SubjectWithDetails; teachers: Teacher[]; grades: GradeWithClasses[]; termId: string }) {
  const [, startTransition] = useTransition()
  const teacher = subject.teacherSubjects[0]?.teacher

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="py-2.5 px-3 text-sm font-medium whitespace-nowrap">{subject.name}</td>
      <td className="py-2.5 px-3 text-sm text-gray-600 whitespace-nowrap">{teacher?.name ?? '-'}</td>
      <td className="py-2.5 px-3 text-sm text-gray-500 leading-relaxed">
        {formatClassGroups(subject.subjectClassGroups, grades)}
      </td>
      <td className="py-2.5 px-3 text-center text-sm">
        {subject.isSpecialized ? '✓' : <span className="text-gray-300">-</span>}
      </td>
      <td className="py-2.5 px-3 text-center text-sm">
        {subject.requiresRoom ? '✓' : <span className="text-gray-300">-</span>}
      </td>
      <td className="py-2.5 px-3 text-center text-sm text-gray-700">
        {subject.weeklyHours}
      </td>
      <td className="py-2.5 px-3">
        <div className="flex gap-1 justify-end whitespace-nowrap">
          <SubjectForm
            termId={termId}
            subject={subject}
            teachers={teachers}
            grades={grades}
            trigger={<Button variant="outline" size="sm">수정</Button>}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => startTransition(async () => { await duplicateSubject(subject.id) })}
          >
            복제
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => startTransition(async () => { await deleteSubject(subject.id) })}
          >
            삭제
          </Button>
        </div>
      </td>
    </tr>
  )
}

const SORT_LABELS: Record<SortKey, string> = {
  name: '과목명순',
  teacher: '교사명순',
}

export function SubjectList({ subjects, teachers, grades, termId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const sorted = [...subjects].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko')
    const ta = a.teacherSubjects[0]?.teacher.name ?? '￿'
    const tb = b.teacherSubjects[0]?.teacher.name ?? '￿'
    return ta.localeCompare(tb, 'ko') || a.name.localeCompare(b.name, 'ko')
  })

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <span className="text-sm text-gray-500 self-center">정렬:</span>
        {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`text-sm px-3 py-1 rounded border ${
              sortKey === key
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {SORT_LABELS[key]}
          </button>
        ))}
      </div>

      {subjects.length === 0 ? (
        <p className="text-gray-500 text-sm">등록된 과목이 없습니다.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-28" />
              <col className="w-24" />
              <col />
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-14" />
              <col className="w-36" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">과목명</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">교사명</th>
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">담당 학급</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500">전담</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500">특별실</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-gray-500">시수</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(subject => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  teachers={teachers}
                  grades={grades}
                  termId={termId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
