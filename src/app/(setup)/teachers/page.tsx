import { listTerms } from '@/features/terms/actions'
import { listTeachers, deleteTeacher } from '@/features/teachers/actions'
import { listSubjects } from '@/features/subjects/actions'
import { BulkTeacherImport } from '@/features/teachers/BulkTeacherImport'
import { TeacherForm } from '@/features/teachers/TeacherForm'
import { Button } from '@/components/ui/button'
import { TEACHER_TYPE_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

export default async function TeachersPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>

  const [teachers, subjects] = await Promise.all([
    listTeachers(activeTerm.id),
    listSubjects(activeTerm.id),
  ])

  return (
    <div className="space-y-6">
      {/* Bulk import at top */}
      <BulkTeacherImport termId={activeTerm.id} />

      {/* Individual add + teacher list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">등록된 교사 ({teachers.length}명)</h2>
          <TeacherForm
            termId={activeTerm.id}
            subjects={subjects}
            trigger={<Button size="sm">+ 교사 추가</Button>}
          />
        </div>
        <div className="space-y-1">
          {teachers.map(teacher => (
            <div key={teacher.id} className="bg-white rounded px-3 py-2 shadow-sm flex items-center gap-3 text-sm">
              <span className="font-medium">{teacher.name}</span>
              <span className="text-gray-500 text-xs">{TEACHER_TYPE_LABELS[teacher.type]}</span>
              {teacher.teacherSubjects.length > 0 && (
                <span className="text-gray-400 text-xs">
                  {teacher.teacherSubjects.map(ts => ts.subject.name).join(', ')}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <TeacherForm
                  termId={activeTerm.id}
                  teacher={teacher}
                  subjects={subjects}
                  trigger={<Button size="sm" variant="outline">수정</Button>}
                />
                <form action={async () => { 'use server'; await deleteTeacher(teacher.id) }}>
                  <Button variant="destructive" size="sm" type="submit">삭제</Button>
                </form>
              </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <p className="text-sm text-gray-400">등록된 교사가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
