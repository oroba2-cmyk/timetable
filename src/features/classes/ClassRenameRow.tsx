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
}

export function ClassRenameRow({ id, gradeNumber, classNumber, displayName }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(displayName ?? '')
  const defaultLabel = `${gradeNumber}-${classNumber}반`
  const label = displayName || defaultLabel

  async function handleSave() {
    await renameClassGroup(id, value)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={defaultLabel}
          className="h-7 w-32 text-sm"
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          autoFocus
        />
        <Button size="sm" onClick={handleSave}>저장</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>취소</Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{label}</span>
      <button
        className="text-xs text-gray-400 hover:text-gray-600 underline"
        onClick={() => setEditing(true)}
      >
        이름 변경
      </button>
    </div>
  )
}
