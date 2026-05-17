'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  resetTermData,
  type DataResetCategory,
} from '@/features/data-management/actions'

const CATEGORIES: {
  id: DataResetCategory
  title: string
  description: string
  danger: 'low' | 'medium' | 'high'
}[] = [
  {
    id: 'schedule',
    title: '시간표',
    description: '특별실·전담 반복 규칙과 생성된 주간 일정을 모두 삭제합니다.',
    danger: 'medium',
  },
  {
    id: 'reservations',
    title: '특별실 예약',
    description: '예약 기록만 삭제합니다. 시간표 규칙은 유지됩니다.',
    danger: 'low',
  },
  {
    id: 'academicEvents',
    title: '학사일정',
    description: '방학·행사 등 학사일정을 삭제합니다.',
    danger: 'medium',
  },
  {
    id: 'periods',
    title: '시정표',
    description: '교시 설정과 연결된 불가·시간표·예약을 함께 삭제합니다.',
    danger: 'high',
  },
  {
    id: 'rooms',
    title: '특별실',
    description: '특별실 등록·불가·특별실 관련 시간표·예약을 삭제합니다.',
    danger: 'high',
  },
  {
    id: 'teachers',
    title: '교사',
    description: '교사·담당 과목·교사 관련 일정을 삭제합니다. 담임 배정도 해제됩니다.',
    danger: 'high',
  },
  {
    id: 'classes',
    title: '학년·학급',
    description: '학년·학급과 연결된 시간표·예약을 삭제합니다.',
    danger: 'high',
  },
  {
    id: 'subjects',
    title: '과목',
    description: '과목·교사-과목·학급 배정과 관련 일정을 삭제합니다.',
    danger: 'high',
  },
]

interface Props {
  terms: { id: string; year: number; semester: number }[]
  defaultTermId: string
}

export function DataManagementPanel({ terms, defaultTermId }: Props) {
  const [termId, setTermId] = useState(defaultTermId)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleReset(category: DataResetCategory, title: string) {
    const label = terms.find((t) => t.id === termId)
    const termLabel = label ? `${label.year}년 ${label.semester}학기` : '선택한 학기'
    const ok = window.confirm(
      `[${termLabel}] 「${title}」 데이터를 초기화합니다.\n삭제 후 되돌릴 수 없습니다. 계속할까요?`
    )
    if (!ok) return

    setMessage(null)
    setError(null)
    startTransition(async () => {
      const res = await resetTermData(termId, category)
      if (res.success) {
        setMessage(`「${res.data.label}」 초기화가 완료되었습니다.`)
      } else {
        setError(res.error ?? '초기화에 실패했습니다.')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="term-select" className="text-sm font-medium text-gray-700">
          대상 학기
        </label>
        <select
          id="term-select"
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-white"
          disabled={pending}
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.year}년 {t.semester}학기
            </option>
          ))}
        </select>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {CATEGORIES.map((cat) => (
          <li
            key={cat.id}
            className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white"
          >
            <div>
              <h3 className="font-medium text-gray-900">{cat.title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
            </div>
            <Button
              type="button"
              variant={cat.danger === 'high' ? 'destructive' : 'outline'}
              size="sm"
              disabled={pending}
              onClick={() => handleReset(cat.id, cat.title)}
              className="shrink-0"
            >
              초기화
            </Button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-500">
        PDF 시간표를
        다시 넣으려면 터미널에서{' '}
        <code className="bg-gray-100 px-1 rounded">npm run import:waseok</code>를
        실행하세요.
      </p>
    </div>
  )
}
