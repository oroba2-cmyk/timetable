'use client'

import { useState, useTransition } from 'react'
import { upsertKeyDates } from './actions'
import type { KeyDates, KeyDateType } from './actions'

const SINGLE_KEYS: { key: KeyDateType; label: string; note?: string }[] = [
  { key: '시업식', label: '1학기 시업식', note: '1학기 시작일' },
  { key: '여름방학식', label: '여름방학식', note: '1학기 마지막 날' },
  { key: '개학식', label: '2학기 개학식', note: '2학기 시작일' },
  { key: '겨울방학식', label: '겨울방학식', note: '2학기 마지막 날' },
]

const RANGE_KEYS: { key: KeyDateType; label: string }[] = [
  { key: '여름방학', label: '여름방학 기간' },
  { key: '겨울방학', label: '겨울방학 기간' },
]

interface Props {
  termId: string
  initial: KeyDates
}

export function KeyDatesPanel({ termId, initial }: Props) {
  const [dates, setDates] = useState<KeyDates>(initial)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function setDate(key: KeyDateType, field: 'date' | 'endDate', value: string) {
    setDates(prev => ({
      ...prev,
      [key]: { ...(prev[key] ?? { date: '' }), [field]: value },
    }))
  }

  function save() {
    startTransition(async () => {
      setMessage(null)
      const result = await upsertKeyDates(termId, dates)
      setMessage(result.success ? '저장되었습니다.' : (result.error ?? '오류'))
      if (result.success) setTimeout(() => setMessage(null), 2500)
    })
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
      <div className="px-5 py-3 bg-gray-50 border-b">
        <h2 className="text-sm font-semibold text-gray-700">기본 학사일정</h2>
        <p className="text-xs text-gray-400 mt-0.5">방학 기간은 수업일수에서 자동 제외됩니다.</p>
      </div>
      <div className="p-5 space-y-3">
        {/* Single-date events */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SINGLE_KEYS.map(({ key, label, note }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-32 shrink-0">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                {note && <p className="text-xs text-gray-400">{note}</p>}
              </div>
              <input
                type="date"
                value={dates[key]?.date ?? ''}
                onChange={e => setDate(key, 'date', e.target.value)}
                className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
              />
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-3">
          {RANGE_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 w-32 shrink-0">{label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dates[key]?.date ?? ''}
                  onChange={e => setDate(key, 'date', e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-36"
                />
                <span className="text-gray-400 text-sm">~</span>
                <input
                  type="date"
                  value={dates[key]?.endDate ?? ''}
                  onChange={e => setDate(key, 'endDate', e.target.value)}
                  className="border rounded px-2 py-1 text-sm w-36"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={isPending}
            className="px-4 py-1.5 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
          {message && (
            <span className={`text-sm ${message === '저장되었습니다.' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
