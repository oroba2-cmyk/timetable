import { listRooms } from '@/features/rooms/actions'
import { listTerms } from '@/features/terms/actions'
import { RoomList } from '@/features/rooms/RoomList'
import { RoomForm } from '@/features/rooms/RoomForm'
import { Button } from '@/components/ui/button'

export default async function RoomsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
    )
  }

  const rooms = await listRooms(activeTerm.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">특별실 관리</h1>
        <RoomForm termId={activeTerm.id} trigger={<Button>+ 특별실 추가</Button>} />
      </div>
      <RoomList rooms={rooms} termId={activeTerm.id} />
    </div>
  )
}
