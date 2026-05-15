export const dynamic = 'force-dynamic'

import { listTerms } from '@/features/terms/actions'
import { listGrades, deleteClassGroup } from '@/features/classes/actions'
import { GradeAutoGen } from '@/features/classes/GradeAutoGen'
import { ClassRenameRow } from '@/features/classes/ClassRenameRow'
import { Button } from '@/components/ui/button'

export default async function ClassesPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>

  const grades = await listGrades(activeTerm.id)

  return (
    <div className="space-y-6">
      <GradeAutoGen termId={activeTerm.id} />

      <div>
        <h2 className="font-semibold mb-3">등록된 학급</h2>
        {grades.length === 0 && (
          <p className="text-sm text-gray-400">등록된 학급이 없습니다. 위에서 학급을 생성해주세요.</p>
        )}
        {grades.map(grade => (
          <div key={grade.id} className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{grade.number}학년</h3>
            <div className="space-y-1 pl-2">
              {grade.classGroups.map(cls => (
                <div key={cls.id} className="flex items-center gap-4 bg-white rounded px-3 py-2 shadow-sm">
                  <ClassRenameRow
                    id={cls.id}
                    gradeNumber={grade.number}
                    classNumber={cls.number}
                    displayName={cls.displayName}
                  />
                  <form
                    action={async () => { 'use server'; await deleteClassGroup(cls.id) }}
                    className="ml-auto"
                  >
                    <Button variant="destructive" size="sm" type="submit">삭제</Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
