export const dynamic = 'force-dynamic'

import { listAcademicEvents, deleteAcademicEvent, getKeyDates } from '@/features/academic-calendar/actions'
import { listTerms } from '@/features/terms/actions'
import { EventForm } from '@/features/academic-calendar/EventForm'
import { KeyDatesPanel } from '@/features/academic-calendar/KeyDatesPanel'
import { HolidayImport } from '@/features/academic-calendar/HolidayImport'
import { DeleteAllEventsButton } from '@/features/academic-calendar/DeleteAllEventsButton'
import { Button } from '@/components/ui/button'

const KEY_TYPES = new Set(['시업식', '여름방학식', '여름방학', '개학식', '겨울방학식', '겨울방학'])

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export default async function AcademicCalendarPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <div className="p-6">
        <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
      </div>
    )
  }

  const [events, keyDates] = await Promise.all([
    listAcademicEvents(activeTerm.id),
    getKeyDates(activeTerm.id),
  ])

  const currentYear = new Date().getFullYear()
  const otherEvents = events.filter(e => !KEY_TYPES.has(e.eventType))

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">학사일정 관리</h1>

      {/* 기본 학사일정 */}
      <KeyDatesPanel termId={activeTerm.id} initial={keyDates} />

      {/* 공휴일·휴업일 등록 */}
      <HolidayImport termId={activeTerm.id} currentYear={currentYear} />

      {/* 기타 일정 목록 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">기타 일정</h2>
          <div className="flex items-center gap-2">
            {otherEvents.length > 0 && <DeleteAllEventsButton termId={activeTerm.id} />}
            <EventForm termId={activeTerm.id} trigger={<Button size="sm">+ 일정 추가</Button>} />
          </div>
        </div>

        <div className="space-y-1.5">
          {otherEvents.length === 0 && (
            <p className="text-gray-400 text-sm">등록된 기타 일정이 없습니다.</p>
          )}
          {otherEvents.map(event => {
            const name = event.note || null
            const dateStr = event.endDate
              ? `${formatDate(event.date)} ~ ${formatDate(event.endDate)}`
              : formatDate(event.date)
            return (
              <div key={event.id} className="bg-white rounded-lg px-4 py-2.5 shadow flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm">
                    {name && <span className="font-semibold text-gray-900">{name}</span>}
                    {name && <span className="text-gray-300 mx-1.5">·</span>}
                    <span className={name ? 'text-gray-600' : 'font-semibold text-gray-900'}>{dateStr}</span>
                    <span className="text-gray-300 mx-1.5">·</span>
                    <span className="text-gray-500">{event.eventType}</span>
                    {event.allowException && <span className="ml-2 text-amber-600 text-xs">수업 배정 허용</span>}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <EventForm
                    termId={activeTerm.id}
                    event={event}
                    trigger={<Button variant="outline" size="sm">수정</Button>}
                  />
                  <form action={async () => { 'use server'; await deleteAcademicEvent(event.id) }}>
                    <Button variant="destructive" size="sm" type="submit">삭제</Button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
