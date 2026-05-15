import type { SpecialRoom } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { RoomForm } from './RoomForm'
import { deleteRoom } from './actions'

interface Props {
  rooms: SpecialRoom[]
  termId: string
}

function formatGrades(grades: number[], otherGradeNote?: string | null): string {
  const regularGrades = grades.filter((g) => g >= 1 && g <= 6).sort((a, b) => a - b)
  const hasOther = grades.includes(7) || !!otherGradeNote

  const parts: string[] = []

  if (regularGrades.length === 6) {
    parts.push('전학년')
  } else if (regularGrades.length > 0) {
    parts.push(regularGrades.map((g) => `${g}`).join('·') + '학년')
  }

  if (hasOther) {
    parts.push('기타')
  }

  return parts.length > 0 ? parts.join(', ') : '-'
}

export function RoomList({ rooms, termId }: Props) {
  return (
    <div className="space-y-2">
      {rooms.map((room) => (
        <div key={room.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="flex-1">
            <span className="font-medium">{room.name}</span>
            {room.location && (
              <span className="ml-2 text-sm text-gray-500">{room.location}</span>
            )}
            {room.grades.length > 0 || room.otherGradeNote ? (
              <span className="ml-2 text-sm text-gray-600">
                {formatGrades(room.grades, room.otherGradeNote)}
              </span>
            ) : null}
          </div>
          <span className="text-sm text-gray-500">동시 {room.capacity}학급</span>
          {room.note && <span className="text-sm text-gray-400">{room.note}</span>}
          <RoomForm
            termId={termId}
            room={room}
            trigger={<Button variant="outline" size="sm">수정</Button>}
          />
          <form action={async () => { 'use server'; await deleteRoom(room.id) }}>
            <Button variant="destructive" size="sm" type="submit">삭제</Button>
          </form>
        </div>
      ))}
      {rooms.length === 0 && (
        <p className="text-gray-500 text-sm">등록된 특별실이 없습니다.</p>
      )}
    </div>
  )
}
