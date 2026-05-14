'use client'

export function CalendarRoomFilter({
  rooms,
  year,
  month,
  currentRoom,
}: {
  rooms: { id: string; name: string }[]
  year: number
  month: number
  currentRoom: string | null
}) {
  return (
    <select
      defaultValue={currentRoom || ''}
      className="border rounded px-2 py-1 text-sm"
      onChange={e => {
        const room = e.target.value
        window.location.href = `/calendar?year=${year}&month=${month}${room ? `&room=${room}` : ''}`
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
