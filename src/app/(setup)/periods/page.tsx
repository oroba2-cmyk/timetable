export const dynamic = 'force-dynamic'

import { listAllPeriods } from '@/features/periods/actions'
import { listTerms } from '@/features/terms/actions'
import { PeriodsClient } from '@/features/periods/PeriodsClient'

export default async function PeriodsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <div className="p-6">
        <p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p>
      </div>
    )
  }

  const rows = await listAllPeriods(activeTerm.id)

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">시정 관리</h1>
      <PeriodsClient termId={activeTerm.id} initialRows={rows} />
    </div>
  )
}
