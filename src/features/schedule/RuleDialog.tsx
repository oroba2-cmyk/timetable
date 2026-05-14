'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createScheduleRule } from './actions'
import type { ClassGroup, Grade, Period, SpecialRoom, Subject, Teacher } from '@/generated/prisma'

interface Props {
  termId: string
  rooms: SpecialRoom[]
  classes: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  periods: Period[]
  trigger: React.ReactNode
}

const DAY_LABELS = ['월', '화', '수', '목', '금']

export function RuleDialog({ termId, rooms, classes, subjects, teachers, periods, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [repeatUnit, setRepeatUnit] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK')
  const [endType, setEndType] = useState<'NONE' | 'DATE' | 'COUNT'>('NONE')
  const [selectedDays, setSelectedDays] = useState<number[]>([0])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      if (prev.includes(day) && prev.length === 1) return prev  // keep at least one
      return prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    })
  }

  async function handleSubmit(fd: FormData) {
    setError('')
    setPending(true)

    const roomId = fd.get('roomId') as string
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

    const result = await createScheduleRule({
      termId,
      roomId,
      classId,
      subjectId,
      teacherId,
      periodId,
      startDate,
      repeatInterval,
      repeatUnit,
      repeatDays: repeatUnit === 'WEEK' ? selectedDays : [],
      endType,
      endDate,
      endCount,
    })

    if (result.success) {
      setOpen(false)
      setError('')
      const { created, conflicts } = result.data
      if (conflicts > 0) {
        alert(`${created}개 배정 완료, ${conflicts}개 충돌 (강제 배정됨)`)
      }
    } else {
      setError(result.error)
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) {
        setRepeatUnit('WEEK')
        setEndType('NONE')
        setSelectedDays([0])
        setError('')
      }
      setOpen(next)
    }}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>배정 규칙 추가</DialogTitle>
        </DialogHeader>
        <form key={open ? 'open' : 'closed'} action={handleSubmit} className="space-y-4">
          {/* Special Room */}
          <div>
            <Label>특별실</Label>
            <select name="roomId" required className="w-full border rounded px-2 py-1.5 text-sm">
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <Label>학급</Label>
            <select name="classId" required className="w-full border rounded px-2 py-1.5 text-sm">
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.grade.number}학년 {cls.number}반
                </option>
              ))}
            </select>
          </div>

          {/* Subject (optional) */}
          <div>
            <Label>과목 (선택)</Label>
            <select name="subjectId" className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">없음</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher (optional) */}
          <div>
            <Label>교사 (선택)</Label>
            <select name="teacherId" className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">없음</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <Label>교시</Label>
            <select name="periodId" required className="w-full border rounded px-2 py-1.5 text-sm">
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.number}교시 ({period.startTime}~{period.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <Label>시작 날짜</Label>
            <Input type="date" name="startDate" required />
          </div>

          {/* Repeat Settings */}
          <div className="border rounded p-3 space-y-3">
            <p className="text-sm font-medium">반복 설정</p>

            {/* Interval + Unit */}
            <div className="flex items-center gap-2">
              <Label className="shrink-0">반복 간격</Label>
              <Input
                type="number"
                name="repeatInterval"
                min={1}
                defaultValue={1}
                className="w-20"
              />
              <div className="flex gap-1">
                {(['DAY', 'WEEK', 'MONTH'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setRepeatUnit(unit)}
                    className={`px-2 py-1 text-sm rounded border ${
                      repeatUnit === unit
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {unit === 'DAY' ? '일' : unit === 'WEEK' ? '주' : '개월'}
                  </button>
                ))}
              </div>
            </div>

            {/* Day of Week buttons (only for WEEK) */}
            {repeatUnit === 'WEEK' && (
              <div>
                <Label className="mb-1 block">요일</Label>
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`w-8 h-8 rounded-full text-sm font-medium ${
                        selectedDays.includes(idx)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* End Condition */}
            <div className="space-y-2">
              <Label>종료 조건</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="endTypeRadio"
                    checked={endType === 'NONE'}
                    onChange={() => setEndType('NONE')}
                  />
                  없음
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="endTypeRadio"
                    checked={endType === 'DATE'}
                    onChange={() => setEndType('DATE')}
                  />
                  날짜
                  {endType === 'DATE' && (
                    <Input type="date" name="endDate" className="ml-2 w-auto" />
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="endTypeRadio"
                    checked={endType === 'COUNT'}
                    onChange={() => setEndType('COUNT')}
                  />
                  다음
                  {endType === 'COUNT' && (
                    <>
                      <Input
                        type="number"
                        name="endCount"
                        defaultValue={13}
                        min={1}
                        className="w-20 ml-2"
                      />
                      <span>회 반복</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            배정 규칙 추가
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
