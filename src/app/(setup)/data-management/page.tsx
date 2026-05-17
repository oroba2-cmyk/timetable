import { listTermsForCurrentTenant } from '@/features/data-management/actions'
import { DataManagementPanel } from '@/features/data-management/DataManagementPanel'

export default async function DataManagementPage() {
  const result = await listTermsForCurrentTenant()
  if (!result.success) {
    return (
      <main className="p-6">
        <p className="text-red-600">{result.error}</p>
      </main>
    )
  }

  const terms = result.data
  const defaultTermId = terms[0]?.id ?? ''

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">데이터 관리</h1>
      <p className="text-sm text-gray-600 mb-6">
        학기별로 항목 단위로 데이터를 초기화할 수 있습니다. 삭제된 내용은 복구할 수
        없으니 신중하게 사용하세요.
      </p>
      {terms.length === 0 ? (
        <p className="text-gray-500">등록된 학기가 없습니다. 먼저 학기를 만드세요.</p>
      ) : (
        <DataManagementPanel terms={terms} defaultTermId={defaultTermId} />
      )}
    </main>
  )
}
