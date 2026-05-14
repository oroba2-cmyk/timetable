interface Conflict {
  entryId: string
  date: string
  className: string
  periodNumber: number
  messages: string[]
}

export function ConflictPanel({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-red-700 font-medium mb-2">충돌 목록 ({conflicts.length}건)</h3>
      <div className="space-y-2">
        {conflicts.map(c => (
          <div key={c.entryId} className="text-sm">
            <span className="font-medium">{c.date} {c.periodNumber}교시 {c.className}</span>
            <ul className="text-red-600 pl-4 list-disc">
              {c.messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
