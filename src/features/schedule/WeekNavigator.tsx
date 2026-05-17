'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  weekDates: string[]   // 5 ISO date strings Mon–Fri
  prevWeek: string
  nextWeek: string
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function WeekNavigator({ weekDates, prevWeek, nextWeek }: Props) {
  const router = useRouter()

  const todayMonday = getMondayOfWeek(new Date().toISOString().slice(0, 10))
  const isCurrentWeek = weekDates[0] === todayMonday

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (val) router.push(`/schedule?week=${val}`)
  }

  const navBtn = 'px-3 py-1.5 border rounded text-sm hover:bg-gray-100 transition-colors'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link href={`/schedule?week=${prevWeek}`} className={navBtn}>← 이전 주</Link>

      <div className="flex items-center gap-1.5 bg-gray-50 border rounded px-3 py-1.5">
        <input
          type="date"
          value={weekDates[0]}
          onChange={handleDateChange}
          className="text-sm bg-transparent border-none outline-none cursor-pointer"
          title="날짜를 선택하면 해당 주로 이동합니다"
        />
        <span className="text-gray-400 text-sm">~</span>
        <span className="text-sm text-gray-600">{weekDates[4].slice(5)}</span>
      </div>

      <Link href={`/schedule?week=${nextWeek}`} className={navBtn}>다음 주 →</Link>

      {!isCurrentWeek && (
        <Link
          href="/schedule"
          className="px-3 py-1.5 border rounded text-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
        >
          이번 주
        </Link>
      )}
    </div>
  )
}
