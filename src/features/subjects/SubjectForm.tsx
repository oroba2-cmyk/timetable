'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createSubject, updateSubject } from './actions'
import { SUBJECT_TYPE_LABELS } from '@/types'
import type { Subject, SubjectType } from '@/generated/prisma'

interface Props {
  termId: string
  subject?: Subject
  trigger: React.ReactNode
}

export function SubjectForm({ termId, subject, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      name: fd.get('name') as string,
      type: fd.get('type') as SubjectType,
      requiresRoom: fd.get('requiresRoom') === 'on',
    }
    const result = subject ? await updateSubject(subject.id, data) : await createSubject(data)
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
          <DialogTitle>{subject ? '과목 수정' : '과목 추가'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">과목명</Label>
            <Input id="name" name="name" defaultValue={subject?.name} required />
          </div>
          <div>
            <Label htmlFor="type">종류</Label>
            <select
              id="type"
              name="type"
              defaultValue={subject?.type ?? 'GENERAL'}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {Object.entries(SUBJECT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresRoom"
              name="requiresRoom"
              defaultChecked={subject?.requiresRoom ?? false}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="requiresRoom">특별실 필요</Label>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {subject ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
