'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { upsertPeriods, deletePeriodsForGrade } from './actions'
import { DEFAULT_PERIOD_ROWS } from './constants'
import type { PeriodRow } from './constants'

type RowData = { number: number; label: string | null; startTime: string; endTime: string }
type GradeRows = Record<number, RowData[]>

const GRADES = [1, 2, 3, 4, 5, 6]
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7)   // 07~20
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function defaultRows(): RowData[] {
  return DEFAULT_PERIOD_ROWS.map(r => ({ ...r }))
}

function buildInitialState(initialRows: PeriodRow[]): GradeRows {
  const grouped: GradeRows = {}
  for (const row of initialRows) {
    grouped[row.gradeNumber] = grouped[row.gradeNumber] ?? []
    grouped[row.gradeNumber].push({ number: row.number, label: row.label, startTime: row.startTime, endTime: row.endTime })
  }
  if (!grouped[0]) grouped[0] = defaultRows()
  for (const g of GRADES) {
    if (!grouped[g]) grouped[g] = (grouped[0] ?? defaultRows()).map(r => ({ ...r }))
  }
  return grouped
}

function sortRows(rows: RowData[]): RowData[] {
  return [...rows].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

function TimePicker({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const parts = value.split(':')
  const curH = parseInt(parts[0] ?? '9', 10)
  const curM = parseInt(parts[1] ?? '0', 10)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  // scroll selected hour into view on mount
  const hourRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { hourRef.current?.scrollIntoView({ block: 'center' }) }, [])

  function pick(h: number, m: number) {
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border rounded-xl shadow-xl flex overflow-hidden select-none"
      style={{ minWidth: 140 }}
    >
      {/* hours */}
      <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 220 }}>
        <div className="text-[10px] text-gray-400 text-center py-1 sticky top-0 bg-white border-b">시</div>
        {HOURS.map(h => (
          <button
            key={h}
            ref={h === curH ? hourRef : undefined}
            onClick={() => pick(h, curM)}
            className={`px-4 py-1.5 text-sm tabular-nums text-center transition-colors ${
              h === curH
                ? 'bg-gray-800 text-white font-semibold'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {String(h).padStart(2, '0')}
          </button>
        ))}
      </div>
      <div className="w-px bg-gray-100" />
      {/* minutes */}
      <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 220 }}>
        <div className="text-[10px] text-gray-400 text-center py-1 sticky top-0 bg-white border-b">분</div>
        {MINUTES.map(m => (
          <button
            key={m}
            onClick={() => { pick(curH, m); onClose() }}
            className={`px-4 py-1.5 text-sm tabular-nums text-center transition-colors ${
              m === curM
                ? 'bg-gray-800 text-white font-semibold'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {String(m).padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  )
}

function TimeCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex justify-center">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-1 rounded text-sm tabular-nums font-medium transition-colors ${
          open
            ? 'bg-gray-800 text-white'
            : 'text-gray-800 hover:bg-gray-100 border border-transparent hover:border-gray-200'
        }`}
      >
        {value}
      </button>
      {open && (
        <TimePicker
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function PeriodTable({
  rows,
  onChange,
}: {
  rows: RowData[]
  onChange: (updated: RowData[]) => void
}) {
  const sorted = sortRows(rows)

  function updateField(number: number, field: 'startTime' | 'endTime', value: string) {
    onChange(rows.map(r => r.number === number ? { ...r, [field]: value } : r))
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="py-2 px-4 text-left text-xs font-semibold text-gray-500 w-28">교시</th>
          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-500 w-36">시작</th>
          <th className="py-2 px-4 text-center text-xs font-semibold text-gray-500 w-36">종료</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(row => (
          <tr key={row.number} className={`border-b last:border-0 ${row.number === 0 ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
            <td className="py-2 px-4 font-medium text-gray-700">
              {row.number === 0 ? (row.label ?? '점심시간') : `${row.number}교시`}
            </td>
            <td className="py-2 px-4 text-center">
              <TimeCell value={row.startTime} onChange={v => updateField(row.number, 'startTime', v)} />
            </td>
            <td className="py-2 px-4 text-center">
              <TimeCell value={row.endTime} onChange={v => updateField(row.number, 'endTime', v)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

interface Props {
  termId: string
  initialRows: PeriodRow[]
}

export function PeriodsClient({ termId, initialRows }: Props) {
  const [mode, setMode] = useState<'all' | 'per-grade'>(() => {
    return initialRows.some(r => r.gradeNumber > 0) ? 'per-grade' : 'all'
  })
  const [gradeRows, setGradeRows] = useState<GradeRows>(() => buildInitialState(initialRows))
  const [activeGrade, setActiveGrade] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function updateGradeRows(gradeNumber: number, rows: RowData[]) {
    setGradeRows(prev => ({ ...prev, [gradeNumber]: rows }))
  }

  function resetToDefault(gradeNumber: number) {
    updateGradeRows(gradeNumber, defaultRows())
  }

  function copyFromGrade(targetGrade: number, sourceGrade: number) {
    const source = (gradeRows[sourceGrade] ?? defaultRows()).map(r => ({ ...r }))
    updateGradeRows(targetGrade, source)
  }

  async function save() {
    setMessage(null)
    if (mode === 'all') {
      const result = await upsertPeriods(termId, 0, gradeRows[0])
      if (!result.success) { setMessage(result.error ?? '저장 실패'); return }
      for (const g of GRADES) await deletePeriodsForGrade(termId, g)
    } else {
      for (const g of GRADES) {
        const result = await upsertPeriods(termId, g, gradeRows[g])
        if (!result.success) { setMessage(result.error ?? '저장 실패'); return }
      }
      await deletePeriodsForGrade(termId, 0)
    }
    setMessage('저장되었습니다.')
    setTimeout(() => setMessage(null), 2000)
  }

  function handleModeChange(newMode: 'all' | 'per-grade') {
    if (newMode === 'per-grade' && mode === 'all') {
      const base = (gradeRows[0] ?? defaultRows()).map(r => ({ ...r }))
      setGradeRows(prev => {
        const next: GradeRows = { ...prev, 0: prev[0] }
        for (const g of GRADES) {
          if (!prev[g] || prev[g].length === 0) next[g] = base.map(r => ({ ...r }))
          else next[g] = prev[g]
        }
        return next
      })
    }
    setMode(newMode)
  }

  const otherGrades = GRADES.filter(g => g !== activeGrade)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {(['all', 'per-grade'] as const).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              mode === m
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {m === 'all' ? '전학년 동일' : '학년별 지정'}
          </button>
        ))}
      </div>

      {mode === 'all' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">전학년 시정</span>
            <button onClick={() => resetToDefault(0)} className="text-xs text-gray-500 hover:text-gray-700 underline">
              기본값으로 초기화
            </button>
          </div>
          <PeriodTable rows={gradeRows[0] ?? defaultRows()} onChange={rows => updateGradeRows(0, rows)} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setActiveGrade(g)}
                className={`px-4 py-2.5 text-sm whitespace-nowrap flex-shrink-0 border-b-2 transition-colors ${
                  activeGrade === g
                    ? 'border-gray-800 font-semibold text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {g}학년
              </button>
            ))}
          </div>
          <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">복제:</span>
              <select
                className="text-xs border rounded px-2 py-1 bg-white"
                defaultValue=""
                onChange={e => {
                  if (e.target.value) { copyFromGrade(activeGrade, Number(e.target.value)); e.target.value = '' }
                }}
              >
                <option value="" disabled>다른 학년에서 가져오기</option>
                {otherGrades.map(g => <option key={g} value={g}>{g}학년 시정 복제</option>)}
              </select>
            </div>
            <button onClick={() => resetToDefault(activeGrade)} className="text-xs text-gray-500 hover:text-gray-700 underline">
              기본값으로 초기화
            </button>
          </div>
          <PeriodTable rows={gradeRows[activeGrade] ?? defaultRows()} onChange={rows => updateGradeRows(activeGrade, rows)} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => startTransition(save)}
          disabled={isPending}
          className="px-5 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50"
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
  )
}
