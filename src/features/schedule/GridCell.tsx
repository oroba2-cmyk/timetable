'use client'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface EntryData {
  id: string
  className: string
  subjectName?: string | null
  teacherName?: string | null
  status: string
}

function DraggableEntry({ entry, onCancel }: { entry: EntryData; onCancel: (entryId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: entry,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const colorClass =
    entry.status === 'FORCE_ASSIGNED'
      ? 'bg-red-100 border border-red-400'
      : 'bg-blue-100 border border-blue-300'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${colorClass} rounded p-1 text-xs cursor-grab select-none mb-1`}
    >
      <div className="font-bold">{entry.className}</div>
      {entry.subjectName && <div className="text-gray-600">{entry.subjectName}</div>}
      {entry.teacherName && <div className="text-gray-500">{entry.teacherName}</div>}
    </div>
  )
}

interface GridCellProps {
  dayIndex: number
  periodId: string
  entries: EntryData[]
  date: string
  onCancel: (entryId: string) => void
}

export function GridCell({ dayIndex, periodId, entries, date, onCancel }: GridCellProps) {
  const droppableId = `${date}__${periodId}`
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { date, periodId },
  })

  return (
    <td
      ref={setNodeRef}
      className={`min-h-16 border border-gray-200 p-1 align-top ${isOver ? 'bg-blue-50' : 'bg-white'}`}
    >
      {entries.map((entry) => (
        <DraggableEntry key={entry.id} entry={entry} onCancel={onCancel} />
      ))}
    </td>
  )
}
