'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { renameClassGroup } from './actions'

interface Props {
  id: string
  gradeNumber: number
  classNumber: number
  displayName: string | null
  homeroomTeacherName: string | null
}

export function ClassRenameRow({ id, gradeNumber, classNumber, displayName, homeroomTeacherName }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(displayName ?? `${classNumber}반`)

  const gradeLabel = `${gradeNumber}학년`
  const classLabel = displayName || `${classNumber}반`

  async function handleSave() {
    await renameClassGroup(id, value)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <span className="text-sm text-gray-500 shrink-0">{gradeLabel}</span>
      {editing ? (
        <>
          <Input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`${classNumber}반`}
            className="h-7 w-28 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            autoFocus
          />
          <Button size="sm" onClick={handleSave}>저장</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>취소</Button>
        </>
      ) : (
        <>
          <span className="text-sm font-medium">{classLabel}</span>
          {homeroomTeacherName && (
            <span className="text-xs text-gray-400">{homeroomTeacherName}</span>
          )}
          <button
            className="text-xs text-gray-400 hover:text-gray-600 underline"
            onClick={() => setEditing(true)}
          >
            이름 변경
          </button>
        </>
      )}
    </div>
  )
}
