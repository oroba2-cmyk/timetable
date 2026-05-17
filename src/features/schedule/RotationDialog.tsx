'use client'

import { useState, useTransition, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { createRotationRules } from './actions'

const DAY_LABELS = ['월', '화', '수', '목', '금']

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface PeriodOption {
  id: string
  number: number
  label: string | null
  startTime: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  termId: string
  roomId: string
  roomName: string
  roomGrades: number[]
  classes: ClassData[]
  periods: PeriodOption[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Returns next (or same) date that falls on the given Monday-based dayOfWeek
function snapToDay(dateStr: string, dayOfWeek: number): string {
  const d = new Date(dateStr)
  const utcDay = d.getUTCDay() // 0=Sun … 6=Sat
  const mondayBased = utcDay === 0 ? 6 : utcDay - 1
  const diff = (dayOfWeek - mondayBased + 5) % 5
  if (diff === 0) return dateStr
  return addDays(dateStr, diff)
}

function todayISOString() {
  return new Date().toISOString().slice(0, 10)
}

export function RotationDialog({
  open, onClose, onCreated,
  termId, roomId, roomName, roomGrades,
  classes, periods,
}: Props) {
  const [selectedGrades, setSelectedGrades] = useState<number[]>(roomGrades.length > 0 ? roomGrades : [1, 2, 3, 4, 5, 6])
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set())
  const [dayOfWeek, setDayOfWeek] = useState<number>(0)   // 0=Mon
  const [periodId, setPeriodId] = useState<string>(periods[0]?.id ?? '')
  const [startDate, setStartDate] = useState<string>(snapToDay(todayISOString(), 0))
  const [rotationWeeks, setRotationWeeks] = useState<number>(1)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const gradeOptions = useMemo(() => {
    const allGrades = [...new Set(classes.map(c => c.grade.number))].sort((a, b) => a - b)
    return allGrades
  }, [classes])

  const filteredClasses = useMemo(() => {
    return classes
      .filter(c => selectedGrades.includes(c.grade.number))
      .sort((a, b) => a.grade.number - b.grade.number || a.number - b.number)
  }, [classes, selectedGrades])

  // Ordered list of selected classes
  const orderedSelected = useMemo(() => {
    return filteredClasses.filter(c => selectedClassIds.has(c.id))
  }, [filteredClasses, selectedClassIds])

  function toggleGrade(g: number) {
    setSelectedGrades(prev => {
      const next = prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
      // Remove selected classes that no longer belong to a selected grade
      setSelectedClassIds(ids => {
        const newIds = new Set(ids)
        for (const c of classes) {
          if (!next.includes(c.grade.number)) newIds.delete(c.id)
        }
        return newIds
      })
      return next
    })
  }

  function toggleClass(id: string) {
    setSelectedClassIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllClasses() {
    if (selectedClassIds.size === filteredClasses.length) {
      setSelectedClassIds(new Set())
    } else {
      setSelectedClassIds(new Set(filteredClasses.map(c => c.id)))
    }
  }

  function handleDayChange(d: number) {
    setDayOfWeek(d)
    setStartDate(snapToDay(startDate, d))
  }

  function handleStartDateChange(val: string) {
    if (val) {
      setStartDate(snapToDay(val, dayOfWeek))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (orderedSelected.length === 0) {
      setError('배정할 학급을 1개 이상 선택해 주세요.')
      return
    }
    if (!periodId) {
      setError('교시를 선택해 주세요.')
      return
    }
    startTransition(async () => {
      const result = await createRotationRules({
        termId,
        roomId,
        classIds: orderedSelected.map(c => c.id),
        periodId,
        dayOfWeek,
        startDate,
        rotationWeeks,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      onCreated()
    })
  }

  if (!open) return null

  const previewRows = orderedSelected.map((cls, i) => {
    const assignDate = addDays(startDate, i * rotationWeeks * 7)
    return { cls, assignDate, repeatEvery: orderedSelected.length * rotationWeeks }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">순환 배정 — {roomName}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            선택한 학급들이 지정한 교시를 N주마다 돌아가며 사용하도록 규칙을 일괄 생성합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Grade filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">학년 필터</label>
            <div className="flex gap-2 flex-wrap">
              {gradeOptions.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrade(g)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedGrades.includes(g)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {g}학년
                </button>
              ))}
            </div>
          </div>

          {/* Class selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">학급 선택 (순환 순서)</label>
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={toggleAllClasses}
              >
                {selectedClassIds.size === filteredClasses.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
              {filteredClasses.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400 text-center">해당 학년 학급 없음</p>
              ) : (
                filteredClasses.map((cls, i) => {
                  const checked = selectedClassIds.has(cls.id)
                  const order = checked ? orderedSelected.findIndex(c => c.id === cls.id) + 1 : null
                  return (
                    <label
                      key={cls.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(cls.id)}
                        className="rounded"
                      />
                      <span className="flex-1">
                        {cls.grade.number}학년 {cls.number}반
                      </span>
                      {order != null && (
                        <span className="text-xs text-blue-600 font-medium w-6 text-right">{order}번</span>
                      )}
                    </label>
                  )
                })
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">{selectedClassIds.size}개 선택됨 · 표시 순서대로 순환</p>
          </div>

          {/* Day of week */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">요일</label>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDayChange(d)}
                  className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors ${
                    dayOfWeek === d
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">교시</label>
            <select
              value={periodId}
              onChange={e => setPeriodId(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-48 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.number === 0
                    ? `${p.label ?? '0교시'} (${p.startTime})`
                    : `${p.number}교시 (${p.startTime})${p.label ? ` — ${p.label}` : ''}`}
                </option>
              ))}
            </select>
          </div>

          {/* Start date and rotation interval */}
          <div className="flex items-end gap-6 flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">시작 날짜</label>
              <input
                type="date"
                value={startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">선택한 요일로 자동 조정됩니다</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">순환 주기</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={rotationWeeks}
                  onChange={e => setRotationWeeks(Math.max(1, parseInt(e.target.value) || 1))}
                  className="border rounded px-3 py-1.5 text-sm w-20 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">주</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">각 학급이 몇 주씩 담당하는지</p>
            </div>
          </div>

          {/* Preview */}
          {previewRows.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">배정 미리보기</label>
              <div className="border rounded-lg overflow-hidden text-sm">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">순서</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">학급</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">첫 배정일</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">반복</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewRows.map(({ cls, assignDate, repeatEvery }, i) => (
                      <tr key={cls.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-1.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-1.5 font-medium">
                          {cls.grade.number}학년 {cls.number}반
                        </td>
                        <td className="px-3 py-1.5 text-gray-600">{assignDate}</td>
                        <td className="px-3 py-1.5 text-gray-400 text-xs">{repeatEvery}주마다</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>취소</Button>
            <Button type="submit" disabled={orderedSelected.length === 0}>
              순환 배정 생성 ({orderedSelected.length}개 학급)
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
