'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createTeacher, updateTeacher } from './actions'
import { TEACHER_TYPE_LABELS } from '@/types'
import type { Subject, Teacher, TeacherType } from '@/generated/prisma'

type TeacherWithSubjects = Teacher & { teacherSubjects: { subjectId: string; subject: Subject }[] }

interface Props {
  termId: string
  teacher?: TeacherWithSubjects
  subjects: Subject[]
  trigger: React.ReactNode
}

export function TeacherForm({ termId, teacher, subjects, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const existingSubjectIds = teacher?.teacherSubjects.map((ts) => ts.subjectId) ?? []

  async function handleSubmit(fd: FormData) {
    const subjectIds = subjects
      .filter((s) => fd.get(`subject_${s.id}`) === 'on')
      .map((s) => s.id)

    const data = {
      termId,
      name: fd.get('name') as string,
      type: fd.get('type') as TeacherType,
      subjectIds,
    }
    const result = teacher ? await updateTeacher(teacher.id, data) : await createTeacher(data)
    if (result.success) {
      setOpen(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{teacher ? '교사 수정' : '교사 추가'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" defaultValue={teacher?.name} required />
          </div>
          <div>
            <Label htmlFor="type">유형</Label>
            <select
              id="type"
              name="type"
              defaultValue={teacher?.type ?? 'HOMEROOM'}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {Object.entries(TEACHER_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {subjects.length > 0 && (
            <div>
              <Label>담당 과목</Label>
              <div className="mt-1 space-y-1">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`subject_${subject.id}`}
                      name={`subject_${subject.id}`}
                      defaultChecked={existingSubjectIds.includes(subject.id)}
                      className="size-4 rounded border-input"
                    />
                    <label htmlFor={`subject_${subject.id}`} className="text-sm">
                      {subject.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {teacher ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
