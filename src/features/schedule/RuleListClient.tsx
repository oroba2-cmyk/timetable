'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RuleDialog, type EditRuleData } from './RuleDialog'
import { deleteScheduleRule, bulkDeleteScheduleRules } from './actions'
import { buildClassCountByGrade } from '@/lib/schedule/group-cell-entries'
import { groupScheduleRules } from '@/lib/schedule/group-rules'
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

  const classCountByGrade = useMemo(() => buildClassCountByGrade(classes), [classes])
  const groupedRules = useMemo(
    () => groupScheduleRules(rules, classCountByGrade),
    [rules, classCountByGrade]
  )

  const allRuleIds = rules.map((r) => r.id)
  const allSelected = allRuleIds.length > 0 && allRuleIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allRuleIds))
  }

  function toggleGroup(ruleIds: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allIn = ruleIds.every((id) => next.has(id))
      if (allIn) ruleIds.forEach((id) => next.delete(id))
      else ruleIds.forEach((id) => next.add(id))
      return next
    })
  }

  function handleDelete(ruleIds: string[]) {
    if (
      !window.confirm(
        ruleIds.length > 1
          ? `배정 규칙 ${ruleIds.length}개를 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?`
          : '이 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?'
      )
    ) {
      return
    }
    startTransition(async () => {
      if (ruleIds.length === 1) await deleteScheduleRule(ruleIds[0])
      else await bulkDeleteScheduleRules(ruleIds)
      setSelected((prev) => {
        const next = new Set(prev)
        ruleIds.forEach((id) => next.delete(id))
        return next
      })
      router.refresh()
    })
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return
    const ids = [...selected]
    if (
      !window.confirm(
        `선택한 ${ids.length}개 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?`
      )
    ) {
      return
    }
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
      await bulkDeleteScheduleRules(allRuleIds)
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

      {groupedRules.map((group) => {
        const groupSelected = group.ruleIds.every((id) => selected.has(id))
        const groupPartial =
          group.ruleIds.some((id) => selected.has(id)) && !groupSelected
        const singleRule = group.rules.length === 1 ? group.rules[0] : null

        return (
          <div
            key={group.key}
            className={`flex items-center gap-3 border rounded p-3 bg-white text-sm transition-colors ${
              groupSelected ? 'border-blue-300 bg-blue-50' : groupPartial ? 'border-blue-200' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={groupSelected}
              ref={el => { if (el) el.indeterminate = groupPartial }}
              onChange={() => toggleGroup(group.ruleIds)}
              className="w-4 h-4 rounded shrink-0"
            />
            <div className="flex-1 space-y-0.5 min-w-0">
              <div className="font-medium">
                {group.roomName} · {group.periodNumber}교시 · {group.classLabel}
                {group.subjectName && ` · ${group.subjectName}`}
                {group.teacherName && ` · ${group.teacherName}`}
              </div>
              <div className="text-gray-500">
                {group.startDate} 부터{' '}
                {group.repeatInterval}
                {group.repeatUnit === 'DAY' ? '일' : group.repeatUnit === 'WEEK' ? '주' : '개월'}마다
                {group.rules.length > 1 && (
                  <span className="text-gray-400"> · 학급 {group.rules.length}개</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {singleRule && (
                <RuleDialog
                  key={`edit-rule-${singleRule.edit.id}`}
                  termId={termId}
                  rooms={rooms}
                  classes={classes}
                  subjects={subjects}
                  teachers={teachers}
                  periods={periods}
                  editRule={singleRule.edit}
                  onSaved={() => router.refresh()}
                  trigger={<Button variant="outline" size="sm">수정</Button>}
                />
              )}
              <Button variant="destructive" size="sm" onClick={() => handleDelete(group.ruleIds)}>
                삭제
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
