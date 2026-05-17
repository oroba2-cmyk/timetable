'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { updateClassGroup } from './actions'
import type { Teacher } from '@/generated/prisma'

interface ClassData {
  id: string
  number: number
  displayName: string | null
  homeroomTeacher: { name: string } | null
}

interface Props {
  cls: ClassData
  gradeNumber: number
  teachers: Teacher[]
  termId: string
  trigger: React.ReactNode
}

export function ClassEditForm({ cls, gradeNumber, teachers, termId, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const result = await updateClassGroup(cls.id, {
      displayName: fd.get('displayName') as string,
      teacherNameInput: fd.get('teacherName') as string,
      termId,
    })
    if (result.success) {
      setOpen(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  const defaultClassName = cls.displayName ?? `${cls.number}반`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{gradeNumber}학년 {defaultClassName} 수정</DialogTitle>
        </DialogHeader>
        <form key={cls.id} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="displayName">반 이름</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={cls.displayName ?? ''}
              placeholder={`${cls.number}반`}
            />
            <p className="text-xs text-gray-400 mt-1">비워두면 기본 번호(예: 1반)로 표시됩니다.</p>
          </div>
          <div>
            <Label htmlFor="teacherName">담임교사</Label>
            <Input
              id="teacherName"
              name="teacherName"
              defaultValue={cls.homeroomTeacher?.name ?? ''}
              placeholder="교사 이름 입력 (없으면 자동 등록)"
              list="teacherNameList"
            />
            <datalist id="teacherNameList">
              {teachers.map(t => (
                <option key={t.id} value={t.name} />
              ))}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">
              등록된 교사 이름을 선택하거나 새 이름을 입력하면 자동으로 담임 교사로 등록됩니다.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">저장</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
