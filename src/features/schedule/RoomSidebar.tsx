'use client'

interface RoomData {
  id: string
  name: string
  location: string | null
}

interface Props {
  rooms: RoomData[]
  selectedRoomId: string | null   // null = "모든 특별실"
  onSelect: (id: string | null) => void
  assignmentCounts: Record<string, number>
  totalSlots: number
}

export function RoomSidebar({ rooms, selectedRoomId, onSelect, assignmentCounts, totalSlots }: Props) {
  const allSelected = selectedRoomId === null
  const totalCount = Object.values(assignmentCounts).reduce((s, n) => s + n, 0)

  return (
    <div className="w-48 shrink-0 border-r bg-gray-50 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
        특별실
      </div>

      {/* 모든 특별실 */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 ${
          allSelected ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span>모든 특별실</span>
          {totalCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              allSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {totalCount}
            </span>
          )}
        </div>
      </button>

      {rooms.map(room => {
        const count = assignmentCounts[room.id] ?? 0
        const isSelected = room.id === selectedRoomId
        const isFull = count >= totalSlots && totalSlots > 0

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelect(room.id)}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-0 ${
              isSelected ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate">{room.name}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  isSelected
                    ? isFull ? 'bg-blue-300 text-blue-900' : 'bg-blue-400 text-white'
                    : isFull ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </div>
            {room.location && (
              <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                {room.location}
              </div>
            )}
          </button>
        )
      })}
      {rooms.length === 0 && (
        <p className="px-3 py-4 text-xs text-gray-400">등록된 특별실 없음</p>
      )}
    </div>
  )
}
