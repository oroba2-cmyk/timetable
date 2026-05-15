'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createRoom, updateRoom } from './actions'
import type { SpecialRoom } from '@/generated/prisma'

const GRADE_LABELS: Record<number, string> = {
  1: '1학년',
  2: '2학년',
  3: '3학년',
  4: '4학년',
  5: '5학년',
  6: '6학년',
}

interface Props {
  termId: string
  room?: SpecialRoom
  trigger: React.ReactNode
}

export function RoomForm({ termId, room, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [selectedGrades, setSelectedGrades] = useState<number[]>(room?.grades ?? [])
  const [hasOther, setHasOther] = useState(!!room?.otherGradeNote)

  function toggleGrade(grade: number) {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    )
  }

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      name: fd.get('name') as string,
      location: (fd.get('location') as string) || undefined,
      grades: selectedGrades,
      otherGradeNote: hasOther ? (fd.get('otherGradeNote') as string) : undefined,
      capacity: Number(fd.get('capacity')),
      note: (fd.get('note') as string) || undefined,
    }
    const result = room ? await updateRoom(room.id, data) : await createRoom(data)
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
          <DialogTitle>{room ? '특별실 수정' : '특별실 추가'}</DialogTitle>
        </DialogHeader>
        <form key={room?.id ?? 'new'} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">특별실명</Label>
            <Input id="name" name="name" defaultValue={room?.name} required />
          </div>
          <div>
            <Label htmlFor="location">위치</Label>
            <Input
              id="location"
              name="location"
              defaultValue={room?.location ?? ''}
              placeholder="예) 본관 2층"
            />
          </div>
          <div>
            <Label>사용 학년</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {([1, 2, 3, 4, 5, 6] as const).map((grade) => (
                <label key={grade} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGrades.includes(grade)}
                    onChange={() => toggleGrade(grade)}
                  />
                  <span className="text-sm">{GRADE_LABELS[grade]}</span>
                </label>
              ))}
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasOther}
                  onChange={(e) => setHasOther(e.target.checked)}
                />
                <span className="text-sm">기타</span>
              </label>
            </div>
            {hasOther && (
              <Input
                name="otherGradeNote"
                className="mt-2"
                defaultValue={room?.otherGradeNote ?? ''}
                placeholder="기타 학년 메모"
              />
            )}
          </div>
          <div>
            <Label htmlFor="capacity">동시 사용 가능 학급 수</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={room?.capacity ?? 1}
              required
              onKeyDown={(e) => {
                if (
                  !/^\d$/.test(e.key) &&
                  !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
                ) {
                  e.preventDefault()
                }
              }}
            />
          </div>
          <div>
            <Label htmlFor="note">비고</Label>
            <Input id="note" name="note" defaultValue={room?.note ?? ''} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {room ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
