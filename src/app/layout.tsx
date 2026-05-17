import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '특별실 시간표',
  description: '초등학교 특별실·전담수업 시간표 관리',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="flex h-screen">
          <nav className="w-56 bg-gray-900 text-white flex flex-col p-4 gap-1 shrink-0 overflow-y-auto">
            <div className="text-lg font-bold mb-4 px-2">특별실 시간표</div>
            <Link href="/calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">🏠 홈</Link>
            <div className="text-xs text-gray-400 mt-3 mb-1 px-2">설정</div>
            <Link href="/rooms" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">특별실</Link>
            <Link href="/teachers" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">교사</Link>
            <Link href="/classes" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">학년·학급</Link>
            <Link href="/subjects" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">과목</Link>
            <Link href="/periods" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">시정</Link>
            <Link href="/academic-calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">학사일정</Link>
            <div className="text-xs text-gray-400 mt-3 mb-1 px-2">시간표</div>
            <Link href="/schedule" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">특별실 시간표</Link>
            <Link href="/specialist" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">전담 시간표</Link>
            <Link href="/calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">달력형 보기</Link>
            <Link href="/list" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">목록형 보기</Link>
          </nav>
          <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
        </div>
      </body>
    </html>
  )
}
