export const dynamic = 'force-dynamic'

import { listSubjects } from '@/features/subjects/actions'
import { listTerms } from '@/features/terms/actions'
import { SubjectList } from '@/features/subjects/SubjectList'
import { SubjectForm } from '@/features/subjects/SubjectForm'
import { Button } from '@/components/ui/button'

export default async function SubjectsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
    )
  }

  const subjects = await listSubjects(activeTerm.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">과목 관리</h1>
        <SubjectForm termId={activeTerm.id} trigger={<Button>+ 과목 추가</Button>} />
      </div>
      <SubjectList subjects={subjects} termId={activeTerm.id} />
    </div>
  )
}
