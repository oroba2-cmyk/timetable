'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createScheduleRule, updateScheduleRule } from './actions'
import type { ClassGroup, Grade, Period, SpecialRoom, Subject, Teacher } from '@/generated/prisma'

export interface EditRuleData {
  id: string
  roomId: string | null
  classId: string
  subjectId: string | null
  teacherId: string | null
  periodId: string
  startDate: string        // YYYY-MM-DD
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  repeatDays: number[]
  endType: 'NONE' | 'DATE' | 'COUNT'
  endDate: string | null   // YYYY-MM-DD
  endCount: number | null
}

export interface RulePrefill {
  roomId?: string
  classId?: string
  periodId?: string
  startDate?: string
  repeatDay?: number   // 0=월, 4=금
  teacherId?: string
}

interface Props {
  termId: string
  rooms: SpecialRoom[]
  classes: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  periods: Period[]
  trigger?: React.ReactNode
  editRule?: EditRuleData
  prefill?: RulePrefill
  ruleType?: 'ROOM' | 'SPECIALIST'
  // Programmatic control — used when no trigger
  forcedOpen?: boolean
  onForcedClose?: () => void
  onSaved?: () => void
}

const DAY_LABELS = ['월', '화', '수', '목', '금']

export function RuleDialog({ termId, rooms, classes, subjects, teachers, periods, trigger, editRule, prefill, ruleType, forcedOpen, onForcedClose, onSaved }: Props) {
  const isEdit = !!editRule
  const isSpecialist = ruleType === 'SPECIALIST'
  const isProgrammatic = forcedOpen !== undefined
  const [localOpen, setLocalOpen] = useState(false)
  const open = isProgrammatic ? (forcedOpen ?? false) : localOpen

  const [repeatUnit, setRepeatUnit] = useState<'DAY' | 'WEEK' | 'MONTH'>(editRule?.repeatUnit ?? 'WEEK')
  const [endType, setEndType] = useState<'NONE' | 'DATE' | 'COUNT'>(editRule?.endType ?? 'NONE')
  const [selectedDays, setSelectedDays] = useState<number[]>(
    editRule?.repeatDays ?? (prefill?.repeatDay !== undefined ? [prefill.repeatDay] : [0])
  )
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function handleOpenChange(next: boolean) {
    if (isProgrammatic) {
      if (!next) onForcedClose?.()
    } else {
      if (!next) {
        setRepeatUnit(editRule?.repeatUnit ?? 'WEEK')
        setEndType(editRule?.endType ?? 'NONE')
        setSelectedDays(editRule?.repeatDays ?? [0])
        setError('')
      }
      setLocalOpen(next)
    }
  }

  function reset(next: boolean) {
    handleOpenChange(next)
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      if (prev.includes(day) && prev.length === 1) return prev
      return prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    })
  }

  async function handleSubmit(fd: FormData) {
    setError('')
    setPending(true)

    const roomId = isSpecialist
      ? (fd.get('roomId') as string) || undefined   // optional for specialist
      : (fd.get('roomId') as string)                // required for room booking
    const classId = fd.get('classId') as string
    const subjectId = (fd.get('subjectId') as string) || undefined
    const teacherId = (fd.get('teacherId') as string) || undefined
    const periodId = fd.get('periodId') as string
    const startDate = fd.get('startDate') as string
    const repeatInterval = Number(fd.get('repeatInterval') ?? 1)
    const endDate = (fd.get('endDate') as string) || undefined
    const endCount = fd.get('endCount') ? Number(fd.get('endCount')) : undefined

    if (repeatInterval < 1) {
      setError('반복 주기는 1 이상이어야 합니다.')
      setPending(false)
      return
    }
    if (endType === 'DATE' && endDate && endDate <= startDate) {
      setError('종료 날짜는 시작일보다 이후여야 합니다.')
      setPending(false)
      return
    }

    const payload = {
      termId,
      ...(roomId ? { roomId } : {}),
      classId, subjectId, teacherId, periodId,
      startDate, repeatInterval, repeatUnit,
      repeatDays: repeatUnit === 'WEEK' ? selectedDays : [],
      endType, endDate, endCount,
    }

    const result = isEdit
      ? await updateScheduleRule(editRule.id, payload)
      : await createScheduleRule(payload)

    if (result.success) {
      handleOpenChange(false)
      setError('')
      const { created, conflicts } = result.data
      if (conflicts > 0) alert(`${created}개 배정 완료, ${conflicts}개 충돌 (강제 배정됨)`)
      onSaved?.()
    } else {
      setError(result.error)
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger key="rule-dialog-trigger" render={trigger as React.ReactElement} />
      )}
      <DialogContent key="rule-dialog-content" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? (isSpecialist ? '전담 배정 규칙 수정' : '배정 규칙 수정')
              : (isSpecialist ? '전담 배정 규칙 추가' : '배정 규칙 추가')}
          </DialogTitle>
        </DialogHeader>
        <form key={String(open) + (prefill?.classId ?? '')} action={handleSubmit} className="space-y-4">
          {/* Special Room */}
          <div>
            <Label>특별실 {isSpecialist ? '(선택)' : ''}</Label>
            <select
              name="roomId"
              required={!isSpecialist}
              defaultValue={editRule?.roomId ?? prefill?.roomId ?? ''}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              {isSpecialist && <option value="">없음 (일반 교실)</option>}
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <Label>학급</Label>
            <select name="classId" required defaultValue={editRule?.classId ?? prefill?.classId ?? ''} className="w-full border rounded px-2 py-1.5 text-sm">
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.grade.number}학년 {cls.number}반</option>
              ))}
            </select>
          </div>

          {/* For specialist: teacher is required and shown first; for room: subject first, teacher optional */}
          {isSpecialist ? (
            <>
              <div>
                <Label>교사</Label>
                <select name="teacherId" required defaultValue={editRule?.teacherId ?? prefill?.teacherId ?? ''} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">선택하세요</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>과목 (선택)</Label>
                <select name="subjectId" defaultValue={editRule?.subjectId ?? ''} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">없음</option>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>과목 (선택)</Label>
                <select name="subjectId" defaultValue={editRule?.subjectId ?? ''} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">없음</option>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div>
                <Label>교사 (선택)</Label>
                <select name="teacherId" defaultValue={editRule?.teacherId ?? ''} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">없음</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Period */}
          <div>
            <Label>교시</Label>
            <select name="periodId" required defaultValue={editRule?.periodId ?? prefill?.periodId ?? ''} className="w-full border rounded px-2 py-1.5 text-sm">
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.number}교시 ({p.startTime}~{p.endTime})</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <Label>시작 날짜</Label>
            <Input type="date" name="startDate" required defaultValue={editRule?.startDate ?? prefill?.startDate ?? ''} />
          </div>

          {/* Repeat Settings */}
          <div className="border rounded p-3 space-y-3">
            <p className="text-sm font-medium">반복 설정</p>
            <div className="flex items-center gap-2">
              <Label className="shrink-0">반복 간격</Label>
              <Input type="number" name="repeatInterval" min={1} defaultValue={editRule?.repeatInterval ?? 1} className="w-20" />
              <div className="flex gap-1">
                {(['DAY', 'WEEK', 'MONTH'] as const).map((unit) => (
                  <button key={unit} type="button" onClick={() => setRepeatUnit(unit)}
                    className={`px-2 py-1 text-sm rounded border ${repeatUnit === unit ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300'}`}>
                    {unit === 'DAY' ? '일' : unit === 'WEEK' ? '주' : '개월'}
                  </button>
                ))}
              </div>
            </div>

            {repeatUnit === 'WEEK' && (
              <div>
                <Label className="mb-1 block">요일</Label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, idx) => (
                    <button key={idx} type="button" onClick={() => toggleDay(idx)}
                      className={`w-8 h-8 rounded-full text-sm font-medium ${selectedDays.includes(idx) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>종료 조건</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="endTypeRadio" checked={endType === 'NONE'} onChange={() => setEndType('NONE')} />
                  없음
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="endTypeRadio" checked={endType === 'DATE'} onChange={() => setEndType('DATE')} />
                  날짜
                  {endType === 'DATE' && <Input type="date" name="endDate" defaultValue={editRule?.endDate ?? ''} className="ml-2 w-auto" />}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="endTypeRadio" checked={endType === 'COUNT'} onChange={() => setEndType('COUNT')} />
                  다음
                  {endType === 'COUNT' && (
                    <>
                      <Input type="number" name="endCount" defaultValue={editRule?.endCount ?? 13} min={1} className="w-20 ml-2" />
                      <span>회 반복</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {isEdit ? '규칙 수정' : '배정 규칙 추가'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
