'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createAcademicEvent, updateAcademicEvent } from './actions'
import type { AcademicEvent } from '@/generated/prisma'

const EVENT_TYPE_PRESETS = ['시업식', '여름방학식', '겨울방학식', '종업식', '공휴일', '재량휴업일', '행사']

interface Props {
  termId: string
  event?: AcademicEvent
  trigger: React.ReactNode
}

export function EventForm({ termId, event, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      eventType: fd.get('eventType') as string,
      date: fd.get('date') as string,
      allowException: fd.get('allowException') === 'on',
      note: (fd.get('note') as string) || undefined,
    }

    const result = event
      ? await updateAcademicEvent(event.id, {
          eventType: data.eventType,
          date: data.date,
          allowException: data.allowException,
          note: data.note,
        })
      : await createAcademicEvent(data)

    if (result.success) {
      setOpen(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  const defaultDate = event
    ? new Date(event.date).toISOString().slice(0, 10)
    : ''

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? '학사일정 수정' : '학사일정 추가'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
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
              {EVENT_TYPE_PRESETS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={defaultDate}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="allowException"
              name="allowException"
              type="checkbox"
              defaultChecked={event?.allowException ?? false}
              className="h-4 w-4"
            />
            <Label htmlFor="allowException">이 날 예외 배정 허용</Label>
          </div>
          <div>
            <Label htmlFor="note">비고</Label>
            <Input id="note" name="note" defaultValue={event?.note ?? ''} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {event ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
