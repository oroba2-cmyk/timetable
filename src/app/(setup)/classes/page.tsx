export const dynamic = 'force-dynamic'

import { listTerms } from '@/features/terms/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listGrades, deleteClassGroup, addClassToGrade, deleteGrade } from '@/features/classes/actions'
import { GradeAutoGen } from '@/features/classes/GradeAutoGen'
import { ClassRenameRow } from '@/features/classes/ClassRenameRow'
import { ClassEditForm } from '@/features/classes/ClassEditForm'
import { HomeroomAssign } from '@/features/classes/HomeroomAssign'
import { BulkClassRename } from '@/features/classes/BulkClassRename'
import { Button } from '@/components/ui/button'

export default async function ClassesPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>

  const [grades, teachers] = await Promise.all([
    listGrades(activeTerm.id),
    listTeachers(activeTerm.id),
  ])
  const totalClasses = grades.reduce((sum, g) => sum + g.classGroups.length, 0)

  return (
    <div className="p-6 space-y-6">
      <GradeAutoGen termId={activeTerm.id} />

      {grades.length > 0 && (
        <>
          <BulkClassRename termId={activeTerm.id} />
          <HomeroomAssign termId={activeTerm.id} />
        </>
      )}

      <div>
        <h2 className="font-semibold mb-3">등록된 학급 ({totalClasses}학급)</h2>
        {grades.length === 0 && (
          <p className="text-sm text-gray-400">등록된 학급이 없습니다. 위에서 학급을 생성해주세요.</p>
        )}
        {grades.map(grade => (
          <div key={grade.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {grade.number}학년 ({grade.classGroups.length}반)
              </h3>
              <form action={async () => { 'use server'; await addClassToGrade(grade.id) }}>
                <button type="submit" className="text-xs px-2 py-0.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-50">
                  + 추가
                </button>
              </form>
              <form action={async () => { 'use server'; await deleteGrade(grade.id) }}>
                <button type="submit" className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-500 hover:bg-red-50">
                  학년 삭제
                </button>
              </form>
            </div>
            <div className="space-y-1 pl-2">
              {grade.classGroups.map(cls => (
                <div key={cls.id} className="flex items-center gap-3 bg-white rounded px-3 py-2 shadow-sm">
                  <ClassRenameRow
                    id={cls.id}
                    gradeNumber={grade.number}
                    classNumber={cls.number}
                    displayName={cls.displayName}
                    homeroomTeacherName={cls.homeroomTeacher?.name ?? null}
                  />
                  <ClassEditForm
                    cls={cls}
                    gradeNumber={grade.number}
                    teachers={teachers}
                    termId={activeTerm.id}
                    trigger={<Button variant="outline" size="sm">수정</Button>}
                  />
                  <form action={async () => { 'use server'; await deleteClassGroup(cls.id) }}>
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
