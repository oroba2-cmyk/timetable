'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createRoom, updateRoom } from './actions'
import type { SpecialRoom } from '@/generated/prisma'

const ROOM_TYPE_PRESETS = ['과학실', '컴퓨터실', '음악실', '미술실', '시청각실', '체육관', '운동장', '도서실']

interface Props {
  termId: string
  room?: SpecialRoom
  trigger: React.ReactNode
}

export function RoomForm({ termId, room, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      name: fd.get('name') as string,
      roomType: fd.get('roomType') as string,
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
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" defaultValue={room?.name} required />
          </div>
          <div>
            <Label htmlFor="roomType">종류</Label>
            <Input
              id="roomType"
              name="roomType"
              defaultValue={room?.roomType}
              list="roomTypeList"
              required
              placeholder="직접 입력 또는 선택"
            />
            <datalist id="roomTypeList">
              {ROOM_TYPE_PRESETS.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <Label htmlFor="capacity">동시 사용 가능 학급 수</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={room?.capacity ?? 1}
              required
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
