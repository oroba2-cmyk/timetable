export const dynamic = 'force-dynamic'

import { listGrades, deleteClassGroup } from '@/features/classes/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listTerms } from '@/features/terms/actions'
import { ClassForm } from '@/features/classes/ClassForm'
import { Button } from '@/components/ui/button'

export default async function ClassesPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
    )
  }

  const [grades, teachers] = await Promise.all([
    listGrades(activeTerm.id),
    listTeachers(activeTerm.id),
  ])

  // Flatten teachers to Teacher type for ClassForm
  const teacherList = teachers.map(({ teacherSubjects: _ts, ...t }) => t)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">학년·학급 관리</h1>
        <ClassForm
          termId={activeTerm.id}
          teachers={teacherList}
          trigger={<Button>+ 학급 추가</Button>}
        />
      </div>
      <div className="space-y-6">
        {grades.map((grade) => (
          <div key={grade.id}>
            <h2 className="text-lg font-semibold mb-2">{grade.number}학년</h2>
            <div className="space-y-2">
              {grade.classGroups.map((cls) => (
                <div key={cls.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
                  <div className="flex-1">
                    <span className="font-medium">{grade.number}학년 {cls.number}반</span>
                    {cls.homeroomTeacher && (
                      <span className="ml-2 text-sm text-gray-500">
                        담임: {cls.homeroomTeacher.name}
                      </span>
                    )}
                  </div>
                  <form action={async () => { 'use server'; await deleteClassGroup(cls.id) }}>
                    <Button variant="destructive" size="sm" type="submit">삭제</Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
        {grades.length === 0 && (
          <p className="text-gray-500 text-sm">등록된 학급이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
