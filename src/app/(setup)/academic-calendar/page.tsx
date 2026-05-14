export const dynamic = 'force-dynamic'

import { listAcademicEvents, deleteAcademicEvent } from '@/features/academic-calendar/actions'
import { listTerms } from '@/features/terms/actions'
import { EventForm } from '@/features/academic-calendar/EventForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AcademicCalendarPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
    )
  }

  const events = await listAcademicEvents(activeTerm.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">학사일정 관리</h1>
        <EventForm
          termId={activeTerm.id}
          trigger={<Button>+ 일정 추가</Button>}
        />
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
            <div className="flex-1">
              <span className="font-medium">{event.eventType}</span>
              <span className="text-sm text-gray-500 ml-3">
                {new Date(event.date).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {event.allowException && (
              <Badge variant="outline">예외 배정 허용</Badge>
            )}
            {event.note && (
              <span className="text-sm text-gray-400">{event.note}</span>
            )}
            <EventForm
              termId={activeTerm.id}
              event={event}
              trigger={<Button variant="outline" size="sm">수정</Button>}
            />
            <form action={async () => { 'use server'; await deleteAcademicEvent(event.id) }}>
              <Button variant="destructive" size="sm" type="submit">삭제</Button>
            </form>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-gray-500 text-sm">등록된 학사일정이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
