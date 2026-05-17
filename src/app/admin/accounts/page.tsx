import { listAccountsForAdmin } from '@/features/auth/actions'
import { CreateAccountForm } from '@/features/auth/CreateAccountForm'
import { defaultPasswordForLoginId } from '@/lib/auth/password'

export const dynamic = 'force-dynamic'

export default async function AdminAccountsPage() {
  const users = await listAccountsForAdmin()

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">계정 관리</h1>
      <p className="text-sm text-gray-600 mb-6">
        학교별로 독립된 시간표 데이터가 생성됩니다. 비밀번호를 비우면{' '}
        <code className="bg-gray-100 px-1 rounded">아이디1234!</code> 형식이 기본값입니다.
      </p>

      <CreateAccountForm />

      <h2 className="font-semibold mt-8 mb-3">등록된 계정</h2>
      <ul className="bg-white rounded-lg shadow divide-y">
        {users.map((u) => (
          <li key={u.id} className="p-4 flex justify-between gap-4 text-sm">
            <div>
              <span className="font-medium">{u.loginId}</span>
              <span className="text-gray-500 ml-2">({u.tenant.schoolName})</span>
              {u.role === 'ADMIN' && (
                <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  관리자
                </span>
              )}
            </div>
            <span className="text-gray-400 shrink-0">
              기본 비밀번호: {defaultPasswordForLoginId(u.loginId)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
