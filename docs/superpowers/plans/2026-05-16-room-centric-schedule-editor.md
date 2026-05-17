# Room-Centric Schedule Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the form-dialog-based assignment UI with a room-centric two-panel editor where you click a room on the left, then click an empty time slot to pick a class — plus fix the 교시 list bug.

**Architecture:** A new `ScheduleEditor` client component orchestrates a `RoomSidebar` (left) and `RoomWeeklyGrid` (right); clicking an empty cell opens `ClassPickerDialog` which calls a new `quickAssignClass` server action; existing `RuleDialog` remains for advanced rules. Room selection is managed in client state; week navigation stays URL-based.

**Tech Stack:** Next.js 16 App Router, React (useState/useTransition/useRouter), Prisma v7, `@base-ui/react` Dialog, Tailwind CSS.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/features/periods/actions.ts` | Fix `listPeriods` to fall back to grade 1 when grade 0 is empty |
| Modify | `src/features/schedule/actions.ts` | Add `quickAssignClass` server action |
| Create | `src/features/schedule/RoomSidebar.tsx` | Left panel: clickable room list |
| Create | `src/features/schedule/RoomWeeklyGrid.tsx` | Right panel: week grid for one room, click to assign/delete |
| Create | `src/features/schedule/ClassPickerDialog.tsx` | Class picker popup (grade groups) |
| Create | `src/features/schedule/ScheduleEditor.tsx` | Two-panel orchestrator client component |
| Modify | `src/app/(schedule)/schedule/page.tsx` | Use ScheduleEditor, pass entries with sourceRuleId |

---

## Task 1: Fix `listPeriods` fallback

**Files:**
- Modify: `src/features/periods/actions.ts:11-16`

The function currently returns only `gradeNumber: 0` periods. When the user configured per-grade schedules (gradeNumber 1–6), gradeNumber=0 doesn't exist and the 교시 dropdown is empty.

- [ ] **Step 1: Update `listPeriods` to fall back to grade 1**

Replace the body of `listPeriods` in `src/features/periods/actions.ts`:

```ts
export async function listPeriods(termId: string): Promise<Period[]> {
  const common = await prisma.period.findMany({
    where: { termId, gradeNumber: 0 },
    orderBy: [{ number: 'asc' }],
  })
  if (common.length > 0) return common
  return prisma.period.findMany({
    where: { termId, gradeNumber: 1 },
    orderBy: [{ number: 'asc' }],
  })
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/schedule` → click "+ 배정 규칙 추가" → confirm "교시" dropdown shows periods.

- [ ] **Step 3: Commit**

```bash
git add src/features/periods/actions.ts
git commit -m "fix: listPeriods falls back to grade 1 when grade 0 is empty"
```

---

## Task 2: Add `quickAssignClass` server action

**Files:**
- Modify: `src/features/schedule/actions.ts` (append after `cancelScheduleEntry`)

`quickAssignClass` is a thin wrapper over `createScheduleRule` that fills in sensible defaults: weekly repeat, same day of week as the clicked date, no explicit end (runs until term end).

- [ ] **Step 1: Append `quickAssignClass` to `src/features/schedule/actions.ts`**

Add after the `cancelScheduleEntry` function (after line 338):

```ts
// ─────────────────────────────────────────────
// 7. quickAssignClass
// ─────────────────────────────────────────────
export async function quickAssignClass(input: {
  termId: string
  roomId: string
  classId: string
  periodId: string
  date: string  // YYYY-MM-DD — the date of the clicked cell
}): Promise<ActionResult<{ created: number; conflicts: number }>> {
  // Convert ISO date to Monday-based day of week (0=월 … 4=금)
  const d = new Date(input.date)
  const utcDay = d.getUTCDay()  // 0=Sun, 1=Mon … 6=Sat
  const dayOfWeek = utcDay === 0 ? 6 : utcDay - 1

  const result = await createScheduleRule({
    termId: input.termId,
    roomId: input.roomId,
    classId: input.classId,
    periodId: input.periodId,
    startDate: input.date,
    repeatInterval: 1,
    repeatUnit: 'WEEK',
    repeatDays: [dayOfWeek],
    endType: 'NONE',
  })

  if (!result.success) return result
  return { success: true, data: { created: result.data.created, conflicts: result.data.conflicts } }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/khami/Documents/timetable && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `quickAssignClass`.

- [ ] **Step 3: Commit**

```bash
git add src/features/schedule/actions.ts
git commit -m "feat: add quickAssignClass server action"
```

---

## Task 3: RoomSidebar component

**Files:**
- Create: `src/features/schedule/RoomSidebar.tsx`

A pure display component — left panel showing clickable room buttons. Active room gets a blue highlight.

- [ ] **Step 1: Create `src/features/schedule/RoomSidebar.tsx`**

```tsx
'use client'

interface RoomData {
  id: string
  name: string
  roomType: string | null
}

interface Props {
  rooms: RoomData[]
  selectedRoomId: string | null
  onSelect: (id: string) => void
}

export function RoomSidebar({ rooms, selectedRoomId, onSelect }: Props) {
  return (
    <div className="w-44 shrink-0 border-r bg-gray-50 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
        특별실
      </div>
      {rooms.map(room => (
        <button
          key={room.id}
          type="button"
          onClick={() => onSelect(room.id)}
          className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-0 ${
            room.id === selectedRoomId
              ? 'bg-blue-600 text-white font-medium'
              : 'text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div>{room.name}</div>
          {room.roomType && (
            <div className={`text-xs mt-0.5 ${room.id === selectedRoomId ? 'text-blue-200' : 'text-gray-400'}`}>
              {room.roomType}
            </div>
          )}
        </button>
      ))}
      {rooms.length === 0 && (
        <p className="px-3 py-4 text-xs text-gray-400">등록된 특별실 없음</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/schedule/RoomSidebar.tsx
git commit -m "feat: add RoomSidebar component"
```

---

## Task 4: RoomWeeklyGrid component

**Files:**
- Create: `src/features/schedule/RoomWeeklyGrid.tsx`

Weekly grid (periods × weekdays) for a single room. Empty cells call `onCellClick`; filled cells show a chip with an inline delete menu (이번만 취소 / 규칙 전체 삭제). Lunch period (number=0) is hidden.

- [ ] **Step 1: Create `src/features/schedule/RoomWeeklyGrid.tsx`**

```tsx
'use client'

import { useState } from 'react'

export interface RoomEntryData {
  id: string
  date: string        // ISO string, slice 0–10 for comparison
  periodId: string
  sourceRuleId: string | null
  classGroup: { number: number; grade: { number: number } }
  status: string
}

interface PeriodData {
  id: string
  number: number
  startTime: string
  endTime: string
  label: string | null
}

interface Props {
  weekDates: string[]   // 5 ISO date strings Mon–Fri
  periods: PeriodData[]
  entries: RoomEntryData[]
  onCellClick: (date: string, periodId: string) => void
  onEntryAction: (entryId: string, sourceRuleId: string | null, action: 'cancel' | 'deleteRule') => void
}

const DAY_LABELS = ['월', '화', '수', '목', '금']

export function RoomWeeklyGrid({ weekDates, periods, entries, onCellClick, onEntryAction }: Props) {
  function getEntry(date: string, periodId: string): RoomEntryData | undefined {
    return entries.find(e => String(e.date).slice(0, 10) === date && e.periodId === periodId)
  }

  const visiblePeriods = periods.filter(p => p.number !== 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-200 px-3 py-2 text-left w-20">교시</th>
            {weekDates.map((date, i) => (
              <th key={date} className="border border-gray-200 px-3 py-2 text-center min-w-28">
                {DAY_LABELS[i]}<br />
                <span className="font-normal text-xs text-gray-500">{date.slice(5)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visiblePeriods.map(period => (
            <tr key={period.id}>
              <td className="border border-gray-200 px-3 py-2 bg-gray-50 text-center whitespace-nowrap">
                <div className="font-medium">{period.number}교시</div>
                <div className="text-xs text-gray-400">{period.startTime}</div>
              </td>
              {weekDates.map(date => {
                const entry = getEntry(date, period.id)
                return (
                  <td
                    key={date}
                    className={`border border-gray-200 p-1.5 h-16 align-middle text-center ${
                      entry ? '' : 'cursor-pointer hover:bg-blue-50'
                    }`}
                    onClick={() => !entry && onCellClick(date, period.id)}
                  >
                    {entry ? (
                      <EntryChip entry={entry} onAction={onEntryAction} />
                    ) : (
                      <span className="text-gray-300 text-lg leading-none select-none">+</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EntryChip({
  entry,
  onAction,
}: {
  entry: RoomEntryData
  onAction: (entryId: string, sourceRuleId: string | null, action: 'cancel' | 'deleteRule') => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isConflict = entry.status === 'FORCE_ASSIGNED'

  return (
    <div className="relative inline-block w-full">
      <div
        className={`rounded px-1.5 py-1 text-xs font-medium cursor-pointer select-none ${
          isConflict
            ? 'bg-red-100 border border-red-400 text-red-800'
            : 'bg-blue-100 border border-blue-300 text-blue-800'
        }`}
        onClick={e => {
          e.stopPropagation()
          setMenuOpen(v => !v)
        }}
      >
        {entry.classGroup.grade.number}학년 {entry.classGroup.number}반
      </div>
      {menuOpen && (
        <>
          {/* backdrop to close menu */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute z-20 left-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg text-left min-w-32">
            <button
              className="block w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 text-left"
              onClick={e => {
                e.stopPropagation()
                setMenuOpen(false)
                onAction(entry.id, null, 'cancel')
              }}
            >
              이번만 취소
            </button>
            {entry.sourceRuleId && (
              <button
                className="block w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 text-left"
                onClick={e => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  onAction(entry.id, entry.sourceRuleId, 'deleteRule')
                }}
              >
                규칙 전체 삭제
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/schedule/RoomWeeklyGrid.tsx
git commit -m "feat: add RoomWeeklyGrid component"
```

---

## Task 5: ClassPickerDialog component

**Files:**
- Create: `src/features/schedule/ClassPickerDialog.tsx`

Shows classes grouped by grade number. Clicking a class button calls `quickAssignClass` and closes.

- [ ] **Step 1: Create `src/features/schedule/ClassPickerDialog.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { quickAssignClass } from './actions'

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface Props {
  open: boolean
  onClose: () => void
  termId: string
  roomId: string
  periodId: string
  date: string      // YYYY-MM-DD
  classes: ClassData[]
  onAssigned: () => void
}

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일']

export function ClassPickerDialog({
  open, onClose, termId, roomId, periodId, date, classes, onAssigned,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Group classes by grade
  const gradeMap = new Map<number, ClassData[]>()
  for (const cls of classes) {
    const gn = cls.grade.number
    if (!gradeMap.has(gn)) gradeMap.set(gn, [])
    gradeMap.get(gn)!.push(cls)
  }
  const grades = [...gradeMap.keys()].sort((a, b) => a - b)

  // Build date label: "5월 16일 (금)"
  const d = new Date(date)
  const utcDay = d.getUTCDay()
  const mondayBased = utcDay === 0 ? 6 : utcDay - 1
  const dateLabel = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DAY_KO[mondayBased]})`

  function handleAssign(classId: string) {
    setError('')
    startTransition(async () => {
      const result = await quickAssignClass({ termId, roomId, classId, periodId, date })
      if (result.success) {
        const { created, conflicts } = result.data
        if (conflicts > 0) alert(`${created}개 배정 완료, ${conflicts}개 충돌 감지됨`)
        onAssigned()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>학급 배정 — {dateLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {grades.map(grade => {
            const group = gradeMap.get(grade)!.sort((a, b) => a.number - b.number)
            return (
              <div key={grade}>
                <div className="text-xs font-semibold text-gray-500 mb-1.5">{grade}학년</div>
                <div className="flex flex-wrap gap-1.5">
                  {group.map(cls => (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleAssign(cls.id)}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50"
                    >
                      {cls.number}반
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {isPending && <p className="text-gray-500 text-sm mt-1">배정 중...</p>}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/schedule/ClassPickerDialog.tsx
git commit -m "feat: add ClassPickerDialog component"
```

---

## Task 6: ScheduleEditor orchestrator component

**Files:**
- Create: `src/features/schedule/ScheduleEditor.tsx`

The top-level client component: manages `selectedRoomId` and `pickerCell` state, routes actions to the right handlers, calls `router.refresh()` after mutations.

- [ ] **Step 1: Create `src/features/schedule/ScheduleEditor.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RoomSidebar } from './RoomSidebar'
import { RoomWeeklyGrid } from './RoomWeeklyGrid'
import type { RoomEntryData } from './RoomWeeklyGrid'
import { ClassPickerDialog } from './ClassPickerDialog'
import { cancelScheduleEntry, deleteScheduleRule } from './actions'

interface RoomData {
  id: string
  name: string
  roomType: string | null
}

interface PeriodData {
  id: string
  number: number
  startTime: string
  endTime: string
  label: string | null
}

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface Props {
  termId: string
  rooms: RoomData[]
  periods: PeriodData[]
  classes: ClassData[]
  weekDates: string[]
  entries: RoomEntryData[]
}

export function ScheduleEditor({
  termId, rooms, periods, classes, weekDates, entries,
}: Props) {
  const router = useRouter()
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id ?? null)
  const [pickerCell, setPickerCell] = useState<{ date: string; periodId: string } | null>(null)
  const [, startTransition] = useTransition()

  const roomEntries = entries.filter(e => e.roomId === selectedRoomId)

  function handleEntryAction(
    entryId: string,
    sourceRuleId: string | null,
    action: 'cancel' | 'deleteRule'
  ) {
    if (action === 'deleteRule' && sourceRuleId) {
      if (!window.confirm('이 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?')) return
      startTransition(async () => {
        await deleteScheduleRule(sourceRuleId)
        router.refresh()
      })
    } else {
      startTransition(async () => {
        await cancelScheduleEntry(entryId)
        router.refresh()
      })
    }
  }

  function handleAssigned() {
    setPickerCell(null)
    router.refresh()
  }

  return (
    <div className="flex border rounded-lg overflow-hidden min-h-80">
      <RoomSidebar
        rooms={rooms}
        selectedRoomId={selectedRoomId}
        onSelect={setSelectedRoomId}
      />
      <div className="flex-1 overflow-x-auto">
        {selectedRoomId ? (
          <RoomWeeklyGrid
            weekDates={weekDates}
            periods={periods}
            entries={roomEntries}
            onCellClick={(date, periodId) => setPickerCell({ date, periodId })}
            onEntryAction={handleEntryAction}
          />
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            왼쪽에서 특별실을 선택하세요
          </div>
        )}
      </div>
      {pickerCell && selectedRoomId && (
        <ClassPickerDialog
          open={true}
          onClose={() => setPickerCell(null)}
          termId={termId}
          roomId={selectedRoomId}
          periodId={pickerCell.periodId}
          date={pickerCell.date}
          classes={classes}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/schedule/ScheduleEditor.tsx
git commit -m "feat: add ScheduleEditor two-panel orchestrator"
```

---

## Task 7: Update schedule page

**Files:**
- Modify: `src/app/(schedule)/schedule/page.tsx`

Replace the old `WeeklyGrid` + `RoomFilter` with `ScheduleEditor`. Pass entries mapped to `RoomEntryData` shape (including `sourceRuleId` and flattened relations). Keep week navigation as Links. Keep `RuleDialog` button for advanced rules. Keep rules list at the bottom.

- [ ] **Step 1: Replace `src/app/(schedule)/schedule/page.tsx`**

```tsx
export const dynamic = 'force-dynamic'

import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listEntriesForWeek, listScheduleRules, deleteScheduleRule } from '@/features/schedule/actions'
import { listGrades } from '@/features/classes/actions'
import { ScheduleEditor } from '@/features/schedule/ScheduleEditor'
import { RuleDialog } from '@/features/schedule/RuleDialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function getWeekDates(referenceDate: Date): string[] {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(d)
    date.setDate(date.getDate() + i)
    return date.toISOString().slice(0, 10)
  })
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams

  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return (
      <div className="text-center py-16 text-gray-500">학기를 등록해 주세요.</div>
    )
  }

  const refDate = week ? new Date(week) : new Date()
  const weekDates = getWeekDates(refDate)

  const [rooms, periods, subjects, teachers, grades, entriesResult, rulesResult] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listEntriesForWeek(activeTerm.id, weekDates[0]),
    listScheduleRules(activeTerm.id),
  ])

  // Full objects for RuleDialog (expects ClassGroup & { grade: Grade })
  const fullClasses = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))
  // Slim objects for ScheduleEditor / ClassPickerDialog
  const classes = fullClasses.map(c => ({ id: c.id, number: c.number, grade: { number: c.grade.number } }))

  const rawEntries = entriesResult.success ? entriesResult.data : []
  const entries = rawEntries.map(e => ({
    id: e.id,
    date: String(e.date),
    periodId: e.periodId,
    roomId: e.roomId,
    sourceRuleId: e.sourceRuleId,
    classGroup: {
      number: e.classGroup.number,
      grade: { number: e.classGroup.grade.number },
    },
    status: e.status,
  }))

  const rules = rulesResult.success ? rulesResult.data : []

  const prevWeekDate = new Date(weekDates[0])
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const prevWeek = prevWeekDate.toISOString().slice(0, 10)

  const nextWeekDate = new Date(weekDates[0])
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeek = nextWeekDate.toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">주간 시간표 편집기</h1>
        <RuleDialog
          termId={activeTerm.id}
          rooms={rooms}
          classes={fullClasses}
          subjects={subjects}
          teachers={teachers}
          periods={periods}
          trigger={<Button variant="outline">고급 배정 규칙 추가</Button>}
        />
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4">
        <Link
          href={`/schedule?week=${prevWeek}`}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          ← 이전 주
        </Link>
        <span className="text-sm font-medium">
          {weekDates[0]} ~ {weekDates[4]}
        </span>
        <Link
          href={`/schedule?week=${nextWeek}`}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
        >
          다음 주 →
        </Link>
      </div>

      {/* Two-panel editor */}
      <ScheduleEditor
        termId={activeTerm.id}
        rooms={rooms.map(r => ({ id: r.id, name: r.name, roomType: r.roomType ?? null }))}
        periods={periods.map(p => ({
          id: p.id,
          number: p.number,
          startTime: p.startTime,
          endTime: p.endTime,
          label: p.label ?? null,
        }))}
        classes={classes}
        weekDates={weekDates}
        entries={entries}
      />

      {/* Rules list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">배정 규칙 목록</h2>
        {rules.length === 0 ? (
          <p className="text-gray-500 text-sm">등록된 배정 규칙이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="flex items-center justify-between border rounded p-3 bg-white text-sm"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">
                    {rule.room.name} · {rule.period.number}교시 ·{' '}
                    {rule.classGroup.grade.number}학년 {rule.classGroup.number}반
                    {rule.subject && ` · ${rule.subject.name}`}
                    {rule.teacher && ` · ${rule.teacher.name}`}
                  </div>
                  <div className="text-gray-500">
                    {String(rule.startDate).slice(0, 10)} 부터{' '}
                    {rule.repeatInterval}
                    {rule.repeatUnit === 'DAY' ? '일' : rule.repeatUnit === 'WEEK' ? '주' : '개월'}마다
                  </div>
                </div>
                <form
                  action={async () => {
                    'use server'
                    await deleteScheduleRule(rule.id)
                  }}
                >
                  <Button variant="destructive" size="sm" type="submit">삭제</Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/khami/Documents/timetable && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test**

```bash
cd /Users/khami/Documents/timetable && npm run dev
```

Open `http://localhost:3000/schedule` and verify:
1. Left sidebar shows list of special rooms
2. Clicking a room highlights it and shows its week grid on the right
3. Clicking an empty cell opens the class picker dialog with classes grouped by grade
4. Clicking a class button creates the assignment and refreshes
5. Clicking an assigned cell shows the menu (이번만 취소 / 규칙 전체 삭제)
6. "고급 배정 규칙 추가" button still opens the full RuleDialog
7. "교시" dropdown in the advanced dialog now shows periods

- [ ] **Step 4: Commit**

```bash
git add src/app/(schedule)/schedule/page.tsx
git commit -m "feat: replace schedule page with room-centric two-panel editor"
```
