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
import { createPeriod, updatePeriod } from './actions'
import type { Period } from '@/generated/prisma'

interface Props {
  termId: string
  period?: Period
  nextNumber?: number
  trigger: React.ReactNode
}

export function PeriodForm({ termId, period, nextNumber, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const startTime = fd.get('startTime') as string
    const endTime = fd.get('endTime') as string

    if (period) {
      const result = await updatePeriod(period.id, { startTime, endTime })
      if (result.success) {
        setOpen(false)
        setError('')
      } else {
        setError(result.error)
      }
    } else {
      const number = Number(fd.get('number'))
      const result = await createPeriod({ termId, number, startTime, endTime })
      if (result.success) {
        setOpen(false)
        setError('')
      } else {
        setError(result.error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{period ? '교시 수정' : '교시 추가'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          {!period && (
            <div>
              <Label htmlFor="number">교시 번호</Label>
              <Input
                id="number"
                name="number"
                type="number"
                min={1}
                defaultValue={nextNumber ?? 1}
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="startTime">시작 시각</Label>
            <Input
              id="startTime"
              name="startTime"
              type="time"
              defaultValue={period?.startTime ?? ''}
              required
            />
          </div>
          <div>
            <Label htmlFor="endTime">종료 시각</Label>
            <Input
              id="endTime"
              name="endTime"
              type="time"
              defaultValue={period?.endTime ?? ''}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {period ? '수정' : '추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
