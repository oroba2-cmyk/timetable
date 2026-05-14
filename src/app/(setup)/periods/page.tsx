import { listPeriods, deletePeriod } from '@/features/periods/actions'
import { listTerms } from '@/features/terms/actions'
import { PeriodForm } from '@/features/periods/PeriodForm'
import { Button } from '@/components/ui/button'

export default async function PeriodsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
    )
  }

  const periods = await listPeriods(activeTerm.id)
  const nextNumber = periods.length > 0 ? periods[periods.length - 1].number + 1 : 1

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">교시 관리</h1>
        <PeriodForm
          termId={activeTerm.id}
          nextNumber={nextNumber}
          trigger={<Button>+ 교시 추가</Button>}
        />
      </div>
      <div className="space-y-2">
        {periods.map((period) => (
          <div key={period.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
            <div className="flex-1 font-medium">
              {period.number}교시
            </div>
            <span className="text-sm text-gray-600">
              {period.startTime} ~ {period.endTime}
            </span>
            <PeriodForm
              termId={activeTerm.id}
              period={period}
              trigger={<Button variant="outline" size="sm">수정</Button>}
            />
            <form action={async () => { 'use server'; await deletePeriod(period.id) }}>
              <Button variant="destructive" size="sm" type="submit">삭제</Button>
            </form>
          </div>
        ))}
        {periods.length === 0 && (
          <p className="text-gray-500 text-sm">등록된 교시가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
