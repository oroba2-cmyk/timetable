'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ClassGroup, Grade, Period, SpecialRoom, Subject, Teacher } from '@/generated/prisma'
import { createReservation } from './actions'

interface Props {
  termId: string
  defaultDate?: string
  rooms: SpecialRoom[]
  classes: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  periods: Period[]
  trigger: React.ReactNode
}

export function ReservationForm({
  termId,
  defaultDate,
  rooms,
  classes,
  subjects,
  teachers,
  periods,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(fd: FormData) {
    setPending(true)
    setError('')

    const data = {
      termId,
      date: fd.get('date') as string,
      periodId: fd.get('periodId') as string,
      roomId: fd.get('roomId') as string,
      classId: fd.get('classId') as string,
      subjectId: (fd.get('subjectId') as string) || undefined,
      teacherId: (fd.get('teacherId') as string) || undefined,
      reason: (fd.get('reason') as string) || undefined,
    }

    try {
      const result = await createReservation(data)

      if (result.success) {
        setOpen(false)
        if (result.data.conflicts.length > 0) {
          alert(
            '예약이 저장되었으나 다음 충돌이 있습니다:\n' +
              result.data.conflicts.map((c) => c.message).join('\n')
          )
        }
      } else if (result.error.startsWith('충돌:')) {
        const confirmed = confirm(
          result.error + '\n\n그래도 강제로 예약하시겠습니까?'
        )
        if (confirmed) {
          const forceResult = await createReservation({ ...data, force: true })
          if (forceResult.success) {
            setOpen(false)
            if (forceResult.data.conflicts.length > 0) {
              alert(
                '예약이 저장되었으나 다음 충돌이 있습니다:\n' +
                  forceResult.data.conflicts.map((c) => c.message).join('\n')
              )
            }
          } else {
            setError(forceResult.error)
          }
        }
      } else {
        setError(result.error)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError('')
        setOpen(next)
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>단건 예약</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">날짜</Label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              required
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>

          <div>
            <Label htmlFor="periodId">교시</Label>
            <select
              id="periodId"
              name="periodId"
              required
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.number}교시 ({p.startTime}~{p.endTime})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="roomId">특별실</Label>
            <select
              id="roomId"
              name="roomId"
              required
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="classId">학급</Label>
            <select
              id="classId"
              name="classId"
              required
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade.number}학년 {c.number}반
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="subjectId">과목 (선택)</Label>
            <select
              id="subjectId"
              name="subjectId"
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">없음</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="teacherId">교사 (선택)</Label>
            <select
              id="teacherId"
              name="teacherId"
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value="">없음</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="reason">예약 사유</Label>
            <textarea
              id="reason"
              name="reason"
              rows={2}
              placeholder="예약 사유를 입력하세요"
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? '저장 중...' : '예약'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
