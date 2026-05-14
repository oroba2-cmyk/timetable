import type { Subject } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubjectForm } from './SubjectForm'
import { deleteSubject } from './actions'
import { SUBJECT_TYPE_LABELS } from '@/types'

interface Props {
  subjects: Subject[]
  termId: string
}

export function SubjectList({ subjects, termId }: Props) {
  return (
    <div className="space-y-2">
      {subjects.map((subject) => (
        <div key={subject.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="flex-1">
            <span className="font-medium">{subject.name}</span>
            <Badge variant="outline" className="ml-2">
              {SUBJECT_TYPE_LABELS[subject.type] ?? subject.type}
            </Badge>
            {subject.requiresRoom && (
              <Badge variant="outline" className="ml-1">특별실 필요</Badge>
            )}
          </div>
          <SubjectForm
            termId={termId}
            subject={subject}
            trigger={<Button variant="outline" size="sm">수정</Button>}
          />
          <form action={async () => { 'use server'; await deleteSubject(subject.id) }}>
            <Button variant="destructive" size="sm" type="submit">삭제</Button>
          </form>
        </div>
      ))}
      {subjects.length === 0 && (
        <p className="text-gray-500 text-sm">등록된 과목이 없습니다.</p>
      )}
    </div>
  )
}
