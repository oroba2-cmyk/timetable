import { listTerms } from '@/features/terms/actions'
import { listTeachers, deleteTeacher, deleteAllTeachers } from '@/features/teachers/actions'
import { BulkTeacherImport } from '@/features/teachers/BulkTeacherImport'
import { TeacherForm } from '@/features/teachers/TeacherForm'
import { Button } from '@/components/ui/button'
import { TEACHER_TYPE_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

const TYPE_ORDER = ['HOMEROOM', 'TEMP_HOMEROOM', 'SPECIALIZED'] as const

export default async function TeachersPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>

  const teachers = await listTeachers(activeTerm.id)
  const byType = Object.fromEntries(TYPE_ORDER.map(t => [t, teachers.filter(tc => tc.type === t)]))

  return (
    <div className="p-6 space-y-6">
      <BulkTeacherImport termId={activeTerm.id} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">등록된 교사 ({teachers.length}명)</h2>
          <div className="flex gap-2">
            <TeacherForm
              termId={activeTerm.id}
              trigger={<Button size="sm">+ 교사 추가</Button>}
            />
            {teachers.length > 0 && (
              <form action={async () => { 'use server'; await deleteAllTeachers(activeTerm.id) }}>
                <Button variant="destructive" size="sm" type="submit">전체 삭제</Button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {TYPE_ORDER.map(typeKey => {
            const group = byType[typeKey]
            if (group.length === 0) return null
            return (
              <div key={typeKey}>
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {TEACHER_TYPE_LABELS[typeKey]} ({group.length}명)
                </h3>
                <div className="space-y-1">
                  {group.map((teacher, idx) => (
                    <div key={teacher.id} className="bg-white rounded px-3 py-2 shadow-sm flex items-center gap-3 text-sm">
                      <span className="text-gray-400 w-6 text-right text-xs">{idx + 1}</span>
                      <span className="font-medium">{teacher.name}</span>
                      <div className="ml-auto flex gap-2">
                        <TeacherForm
                          termId={activeTerm.id}
                          teacher={teacher}
                          trigger={<Button size="sm" variant="outline">수정</Button>}
                        />
                        <form action={async () => { 'use server'; await deleteTeacher(teacher.id) }}>
                          <Button variant="destructive" size="sm" type="submit">삭제</Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {teachers.length === 0 && (
            <p className="text-sm text-gray-400">등록된 교사가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}
