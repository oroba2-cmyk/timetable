'use client'

import { useState, useTransition } from 'react'
import { importPublicHolidays, importSpecificDates } from './actions'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function DayPicker({ selected, onToggle }: { selected: Set<string>; onToggle: (d: string) => void }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()

  function prev() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
  }
  function next() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-gray-50 rounded-lg p-3 select-none w-fit">
      <div className="flex items-center justify-between mb-2 gap-4">
        <button type="button" onClick={prev} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600 font-bold">‹</button>
        <span className="text-sm font-semibold">{viewYear}년 {viewMonth}월</span>
        <button type="button" onClick={next} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded text-gray-600 font-bold">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((d, i) => (
          <div key={d} className={`text-[10px] font-semibold text-center py-0.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = selected.has(dateStr)
          const dow = (firstDow + day - 1) % 7
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggle(dateStr)}
              className={`rounded py-1.5 text-xs leading-none w-8 h-8 transition-colors ${
                isSelected
                  ? 'bg-gray-800 text-white font-semibold'
                  : dow === 0
                  ? 'text-red-400 hover:bg-red-50'
                  : dow === 6
                  ? 'text-blue-400 hover:bg-blue-50'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  termId: string
  currentYear: number
}

export function HolidayImport({ termId, currentYear }: Props) {
  const [startYM, setStartYM] = useState(`${currentYear}-03`)
  const [endYM, setEndYM] = useState(`${currentYear + 1}-02`)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showMsg(text: string, ok = true) {
    setMessage({ text, ok })
    if (ok) setTimeout(() => setMessage(null), 3000)
  }

  function toggleDate(dateStr: string) {
    setSelectedDates(prev => {
      const next = new Set(prev)
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr)
      return next
    })
  }

  function fetchHolidays() {
    startTransition(async () => {
      setMessage(null)
      try {
        const result = await importPublicHolidays(termId, startYM, endYM)
        if (result.success) showMsg(`${result.data.count}개 공휴일이 등록되었습니다. (중복 제외)`)
        else showMsg(result.error, false)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        showMsg(
          msg.includes('network') || msg.includes('fetch')
            ? '서버와 통신하지 못했습니다. 개발 서버가 실행 중인지 확인한 뒤 다시 시도해 주세요.'
            : `요청 실패: ${msg}`,
          false
        )
      }
    })
  }

  function registerSelected() {
    if (selectedDates.size === 0) return
    startTransition(async () => {
      setMessage(null)
      const sorted = [...selectedDates].sort()
      const result = await importSpecificDates(termId, sorted, '재량휴업일')
      if (result.success) {
        showMsg(`재량휴업일 ${result.data.count}개가 등록되었습니다.`)
        setSelectedDates(new Set())
      } else {
        showMsg(result.error, false)
      }
    })
  }

  const sortedSelected = [...selectedDates].sort()

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div className="px-5 py-3 bg-gray-50 border-b">
        <h2 className="text-sm font-semibold text-gray-700">공휴일 · 휴업일 등록</h2>
      </div>
      <div className="p-5 space-y-6">

        {/* 법정 공휴일 자동 불러오기 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">법정 공휴일 자동 불러오기</p>
          <p className="text-xs text-gray-400 mb-2">출처: 한국천문연구원 특일 정보 서비스 (data.go.kr)</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={startYM}
              onChange={e => setStartYM(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <span className="text-gray-400 text-sm">~</span>
            <input
              type="month"
              value={endYM}
              onChange={e => setEndYM(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
            <button
              onClick={fetchHolidays}
              disabled={isPending}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '불러오는 중...' : '공휴일 가져오기'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">설날·추석 연휴, 대체공휴일 포함 등록됩니다. (중복 날짜 제외)</p>
        </div>

        {/* 토요일/일요일 안내 */}
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-sm font-medium text-blue-800 mb-0.5">토요일 · 일요일</p>
          <p className="text-xs text-blue-600">시간표 배정 시 자동 제외됩니다. 별도 등록이 필요하지 않습니다.</p>
        </div>

        {/* 재량휴업일 달력 선택 */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">재량휴업일 달력에서 선택</p>
          <DayPicker selected={selectedDates} onToggle={toggleDate} />
          {selectedDates.size > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1">
                {sortedSelected.map(d => (
                  <span
                    key={d}
                    onClick={() => toggleDate(d)}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 cursor-pointer hover:bg-red-50 hover:text-red-600"
                  >
                    {new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'UTC' })}
                    <span className="text-gray-400">×</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={registerSelected}
                  disabled={isPending}
                  className="px-4 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                >
                  재량휴업일 {selectedDates.size}일 등록
                </button>
                <button onClick={() => setSelectedDates(new Set())} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  선택 초기화
                </button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <p className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
        )}
      </div>
    </div>
  )
}
