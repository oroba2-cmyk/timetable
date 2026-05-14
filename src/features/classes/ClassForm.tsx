'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClassGroup } from './actions'
import type { Teacher } from '@/generated/prisma'

interface Props {
  termId: string
  teachers: Teacher[]
  trigger: React.ReactNode
}

export function ClassForm({ termId, teachers, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  // Only HOMEROOM and CONCURRENT teachers can be homeroom teachers
  const eligibleTeachers = teachers.filter(
    (t) => t.type === 'HOMEROOM' || t.type === 'CONCURRENT'
  )

  async function handleSubmit(fd: FormData) {
    const homeroomTeacherId = (fd.get('homeroomTeacherId') as string) || undefined
    const data = {
      termId,
      gradeNumber: Number(fd.get('gradeNumber')),
      classNumber: Number(fd.get('classNumber')),
      homeroomTeacherId: homeroomTeacherId || undefined,
    }
    const result = await createClassGroup(data)
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
          <DialogTitle>학급 추가</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="gradeNumber">학년</Label>
            <Input
              id="gradeNumber"
              name="gradeNumber"
              type="number"
              min={1}
              max={6}
              defaultValue={1}
              required
            />
          </div>
          <div>
            <Label htmlFor="classNumber">반</Label>
            <Input
              id="classNumber"
              name="classNumber"
              type="number"
              min={1}
              defaultValue={1}
              required
            />
          </div>
          <div>
            <Label htmlFor="homeroomTeacherId">담임교사 (선택)</Label>
            <select
              id="homeroomTeacherId"
              name="homeroomTeacherId"
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">미지정</option>
              {eligibleTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">추가</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
