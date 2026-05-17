import type { Teacher } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeacherForm } from './TeacherForm'
import { deleteTeacher } from './actions'
import { TEACHER_TYPE_LABELS } from '@/types'

interface Props {
  teachers: Teacher[]
  termId: string
}

export function TeacherList({ teachers, termId }: Props) {
  return (
    <div className="space-y-2">
      {teachers.map((teacher) => (
        <div key={teacher.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="flex-1">
            <span className="font-medium">{teacher.name}</span>
            <Badge variant="outline" className="ml-2">
              {TEACHER_TYPE_LABELS[teacher.type] ?? teacher.type}
            </Badge>
          </div>
          <TeacherForm
            termId={termId}
            teacher={teacher}
            trigger={<Button variant="outline" size="sm">수정</Button>}
          />
          <form action={async () => { 'use server'; await deleteTeacher(teacher.id) }}>
            <Button variant="destructive" size="sm" type="submit">삭제</Button>
          </form>
        </div>
      ))}
      {teachers.length === 0 && (
        <p className="text-gray-500 text-sm">등록된 교사가 없습니다.</p>
      )}
    </div>
  )
}
