'use client'

import { useState, useTransition } from 'react'
import type { SpecialRoom } from '@/generated/prisma'
import { Button } from '@/components/ui/button'
import { RoomForm } from './RoomForm'
import { deleteRoom, duplicateRoom } from './actions'

interface Props {
  rooms: SpecialRoom[]
  termId: string
}

type SortKey = 'name' | 'location' | 'grades'

function formatGrades(grades: number[], otherGradeNote?: string | null): string {
  const regularGrades = grades.filter((g) => g >= 1 && g <= 6).sort((a, b) => a - b)
  const hasOther = !!otherGradeNote
  const parts: string[] = []
  if (regularGrades.length === 6) {
    parts.push('전학년')
  } else if (regularGrades.length > 0) {
    parts.push(regularGrades.map((g) => `${g}`).join('·') + '학년')
  }
  if (hasOther) parts.push('기타')
  return parts.length > 0 ? parts.join(', ') : '-'
}

function minGrade(room: SpecialRoom): number {
  const grades = room.grades.filter(g => g >= 1 && g <= 6)
  return grades.length > 0 ? Math.min(...grades) : 99
}

function RoomRow({ room, termId }: { room: SpecialRoom; termId: string }) {
  const [, startTransition] = useTransition()

  return (
    <div className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
      <div className="flex-1">
        <span className="font-medium">{room.name}</span>
        {room.location && (
          <span className="ml-2 text-sm text-gray-500">{room.location}</span>
        )}
        {(room.grades.length > 0 || room.otherGradeNote) ? (
          <span className="ml-2 text-sm text-gray-600">
            {formatGrades(room.grades, room.otherGradeNote)}
          </span>
        ) : null}
      </div>
      <span className="text-sm text-gray-500">동시 {room.capacity}학급</span>
      {room.note && <span className="text-sm text-gray-400">{room.note}</span>}
      <Button
        variant="outline"
        size="sm"
        onClick={() => startTransition(async () => { await duplicateRoom(room.id) })}
      >
        복제
      </Button>
      <RoomForm
        termId={termId}
        room={room}
        trigger={<Button variant="outline" size="sm">수정</Button>}
      />
      <Button
        variant="destructive"
        size="sm"
        onClick={() => startTransition(async () => { await deleteRoom(room.id) })}
      >
        삭제
      </Button>
    </div>
  )
}

export function RoomList({ rooms, termId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name')

  const sorted = [...rooms].sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name, 'ko')
    if (sortKey === 'location') {
      const la = a.location ?? '', lb = b.location ?? ''
      return la.localeCompare(lb, 'ko') || a.name.localeCompare(b.name, 'ko')
    }
    if (sortKey === 'grades') {
      return minGrade(a) - minGrade(b) || a.name.localeCompare(b.name, 'ko')
    }
    return 0
  })

  const sortLabels: Record<SortKey, string> = {
    name: '가나다순',
    location: '위치순',
    grades: '학년순',
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <span className="text-sm text-gray-500 self-center">정렬:</span>
        {(['name', 'location', 'grades'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`text-sm px-3 py-1 rounded border ${
              sortKey === key
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {sortLabels[key]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((room) => (
          <RoomRow key={room.id} room={room} termId={termId} />
        ))}
        {rooms.length === 0 && (
          <p className="text-gray-500 text-sm">등록된 특별실이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
