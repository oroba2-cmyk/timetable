'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createAcademicEvent, updateAcademicEvent } from './actions'
import type { AcademicEvent } from '@/generated/prisma'

const EVENT_TYPE_PRESETS = ['공휴일', '재량휴업일', '행사', '시험', '기타']

interface Props {
  termId: string
  event?: AcademicEvent
  trigger: React.ReactNode
}

export function EventForm({ termId, event, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const endDateVal = (fd.get('endDate') as string) || undefined
    const data = {
      termId,
      eventType: fd.get('eventType') as string,
      date: fd.get('date') as string,
      endDate: endDateVal || undefined,
      allowException: fd.get('allowException') === 'on',
      note: (fd.get('note') as string) || undefined,
    }

    const result = event
      ? await updateAcademicEvent(event.id, data)
      : await createAcademicEvent(data)

    if (result.success) {
      setOpen(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  const defaultDate = event ? new Date(event.date).toISOString().slice(0, 10) : ''
  const defaultEndDate = event?.endDate ? new Date(event.endDate).toISOString().slice(0, 10) : ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? '일정 수정' : '일정 추가'}</DialogTitle>
        </DialogHeader>
        <form key={event?.id ?? 'new'} action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="eventType">일정 유형</Label>
            <Input
              id="eventType"
              name="eventType"
              defaultValue={event?.eventType ?? ''}
              list="eventTypeList"
              required
              placeholder="직접 입력 또는 선택"
            />
            <datalist id="eventTypeList">
              {EVENT_TYPE_PRESETS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="date">날짜 (시작일)</Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">종료일 <span className="text-gray-400 font-normal">(범위인 경우)</span></Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={defaultEndDate} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="allowException"
              name="allowException"
              type="checkbox"
              defaultChecked={event?.allowException ?? false}
              className="h-4 w-4"
            />
            <Label htmlFor="allowException">이 날 수업 배정 허용 (예외)</Label>
          </div>
          <div>
            <Label htmlFor="note">비고</Label>
            <Input id="note" name="note" defaultValue={event?.note ?? ''} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{event ? '수정' : '추가'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
