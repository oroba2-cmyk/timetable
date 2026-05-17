'use client'

export function CalendarRoomFilter({
  rooms,
  year,
  month,
  currentRoom,
  baseUrl = '/calendar',
}: {
  rooms: { id: string; name: string }[]
  year: number
  month: number
  currentRoom: string | null
  baseUrl?: string
}) {
  return (
    <select
      defaultValue={currentRoom || ''}
      className="border rounded px-2 py-1 text-sm"
      onChange={e => {
        const room = e.target.value
        const sep = baseUrl.includes('?') ? '&' : '?'
        window.location.href = `${baseUrl}${sep}year=${year}&month=${month}${room ? `&room=${room}` : ''}`
      }}
    >
      <option value="">전체 특별실</option>
      {rooms.map(r => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  )
}
