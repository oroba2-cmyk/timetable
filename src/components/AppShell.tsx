import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { logoutAction } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { ClientShell } from '@/components/ClientShell'

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  const sidebar = (
    <nav className="w-56 bg-gray-900 text-white flex flex-col p-4 gap-1 shrink-0 overflow-y-auto">
      <div className="text-lg font-bold mb-1 px-2">특별실·전담 시간표</div>
      {session && (
        <p className="text-xs text-gray-400 px-2 mb-3 truncate" title={session.schoolName}>
          {session.schoolName}
        </p>
      )}
      <Link href="/view" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🏠 홈
      </Link>
      <div className="text-xs text-gray-400 mt-3 mb-1 px-2">설정</div>
      <Link href="/rooms" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🏫 특별실 등록
      </Link>
      <Link href="/teachers" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        👨‍🏫 교사 등록
      </Link>
      <Link href="/classes" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🎒 학년·학급 설정
      </Link>
      <Link href="/subjects" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        📚 과목 관리
      </Link>
      <Link href="/periods" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🕐 시정표
      </Link>
      <Link href="/academic-calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        📅 학사일정 관리
      </Link>
      <Link href="/data-management" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🗂 데이터 관리
      </Link>
      <div className="text-xs text-gray-400 mt-3 mb-1 px-2">시간표</div>
      <Link href="/schedule" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🗓 특별실 시간표
      </Link>
      <Link href="/specialist" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        📋 전담 시간표
      </Link>
      <Link href="/view" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">
        🔍 달력·목록으로 보기
      </Link>
      {session?.role === 'ADMIN' && (
        <Link href="/admin/accounts" className="px-3 py-2 rounded hover:bg-amber-900/50 text-sm">
          ⚙️ 계정 관리
        </Link>
      )}
      <div className="flex-1" />
      {session && (
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700"
          >
            로그아웃 ({session.loginId})
          </Button>
        </form>
      )}
    </nav>
  )

  return (
    <ClientShell sidebar={sidebar}>
      {children}
    </ClientShell>
  )
}
