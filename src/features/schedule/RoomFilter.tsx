'use client'

export function RoomFilter({
  rooms,
  currentWeek,
  currentRoom,
}: {
  rooms: { id: string; name: string }[]
  currentWeek: string
  currentRoom: string | null
}) {
  return (
    <select
      defaultValue={currentRoom || ''}
      className="border rounded px-2 py-1 text-sm"
      onChange={e => {
        window.location.href = `/schedule?week=${currentWeek}&room=${e.target.value}`
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
