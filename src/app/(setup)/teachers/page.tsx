import { listTeachers } from '@/features/teachers/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTerms } from '@/features/terms/actions'
import { TeacherList } from '@/features/teachers/TeacherList'
import { TeacherForm } from '@/features/teachers/TeacherForm'
import { Button } from '@/components/ui/button'

export default async function TeachersPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
    )
  }

  const [teachers, subjects] = await Promise.all([
    listTeachers(activeTerm.id),
    listSubjects(activeTerm.id),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">교사 관리</h1>
        <TeacherForm
          termId={activeTerm.id}
          subjects={subjects}
          trigger={<Button>+ 교사 추가</Button>}
        />
      </div>
      <TeacherList teachers={teachers} subjects={subjects} termId={activeTerm.id} />
    </div>
  )
}
