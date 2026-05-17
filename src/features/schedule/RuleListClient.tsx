'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RuleDialog, type EditRuleData } from './RuleDialog'
import { deleteScheduleRule, bulkDeleteScheduleRules } from './actions'
import type { ClassGroup, Grade, Period, SpecialRoom, Subject, Teacher } from '@/generated/prisma'

export interface RuleItem {
  id: string
  roomName: string
  periodNumber: number
  classGradeNumber: number
  classNumber: number
  subjectName: string | null
  teacherName: string | null
  teacherId: string | null
  startDate: string   // YYYY-MM-DD
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  edit: EditRuleData
}

interface Props {
  rules: RuleItem[]
  termId: string
  rooms: SpecialRoom[]
  classes: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  periods: Period[]
}

export function RuleListClient({ rules, termId, rooms, classes, subjects, teachers, periods }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const allSelected = rules.length > 0 && selected.size === rules.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rules.map(r => r.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDelete(ruleId: string) {
    if (!window.confirm('이 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?')) return
    startTransition(async () => {
      await deleteScheduleRule(ruleId)
      setSelected(prev => { const n = new Set(prev); n.delete(ruleId); return n })
      router.refresh()
    })
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!window.confirm(`선택한 ${selected.size}개 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?`)) return
    const ids = [...selected]
    startTransition(async () => {
      await bulkDeleteScheduleRules(ids)
      setSelected(new Set())
      router.refresh()
    })
  }

  function handleDeleteAll() {
    if (rules.length === 0) return
    if (!window.confirm(`표시된 ${rules.length}개 배정 규칙을 모두 삭제합니다. 계속할까요?`)) return
    startTransition(async () => {
      await bulkDeleteScheduleRules(rules.map(r => r.id))
      setSelected(new Set())
      router.refresh()
    })
  }

  if (rules.length === 0) {
    return <p className="text-gray-500 text-sm">등록된 배정 규칙이 없습니다.</p>
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-3 py-1">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = someSelected }}
            onChange={toggleAll}
            className="w-4 h-4 rounded"
          />
          모두 선택
        </label>
        {selected.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
            선택 삭제 ({selected.size})
          </Button>
        )}
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 ml-auto" onClick={handleDeleteAll}>
          모두 삭제
        </Button>
      </div>

      {rules.map(rule => (
        <div
          key={rule.id}
          className={`flex items-center gap-3 border rounded p-3 bg-white text-sm transition-colors ${selected.has(rule.id) ? 'border-blue-300 bg-blue-50' : ''}`}
        >
          <input
            type="checkbox"
            checked={selected.has(rule.id)}
            onChange={() => toggleOne(rule.id)}
            className="w-4 h-4 rounded shrink-0"
          />
          <div className="flex-1 space-y-0.5 min-w-0">
            <div className="font-medium">
              {rule.roomName} · {rule.periodNumber}교시 ·{' '}
              {rule.classGradeNumber}학년 {rule.classNumber}반
              {rule.subjectName && ` · ${rule.subjectName}`}
              {rule.teacherName && ` · ${rule.teacherName}`}
            </div>
            <div className="text-gray-500">
              {rule.startDate} 부터{' '}
              {rule.repeatInterval}
              {rule.repeatUnit === 'DAY' ? '일' : rule.repeatUnit === 'WEEK' ? '주' : '개월'}마다
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <RuleDialog
              termId={termId}
              rooms={rooms}
              classes={classes}
              subjects={subjects}
              teachers={teachers}
              periods={periods}
              editRule={rule.edit}
              onSaved={() => router.refresh()}
              trigger={<Button variant="outline" size="sm">수정</Button>}
            />
            <Button variant="destructive" size="sm" onClick={() => handleDelete(rule.id)}>삭제</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
