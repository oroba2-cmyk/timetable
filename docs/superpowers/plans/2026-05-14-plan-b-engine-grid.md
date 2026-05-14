# Plan B: 배정 엔진 + 주간 그리드 편집기

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 반복 배정 규칙을 날짜별 엔트리로 전개하는 Rule Expander, 충돌을 검사하는 Conflict Checker, 드래그앤드롭 주간 그리드 편집기를 완성한다.

**Architecture:** 엔진(`src/engine/`)은 DB에 의존하지 않는 순수 함수로 구현하여 Vitest로 단위 테스트한다. Server Actions에서 DB 데이터를 로드하여 엔진에 전달한다. 주간 그리드는 DnD Kit을 사용한 Client Component로 구현하고, 충돌 결과를 실시간으로 표시한다.

**Tech Stack:** DnD Kit, Vitest, Next.js Server Actions

**전제 조건:** Plan A 완료 (Prisma 스키마, 기준정보 CRUD 존재)

---

## File Map

| 파일 | 역할 |
|------|------|
| `src/engine/expander/index.ts` | 반복 규칙 → 날짜 목록 전개 (순수 함수) |
| `src/engine/expander/index.test.ts` | 전개 엔진 단위 테스트 |
| `src/engine/conflict/index.ts` | 충돌 검사 (순수 함수) |
| `src/engine/conflict/index.test.ts` | 충돌 검사 단위 테스트 |
| `src/features/schedule/actions.ts` | 배정 규칙·엔트리 Server Actions |
| `src/features/schedule/WeeklyGrid.tsx` | 주간 그리드 (드래그앤드롭) |
| `src/features/schedule/GridCell.tsx` | 그리드 셀 |
| `src/features/schedule/RuleDialog.tsx` | 반복 설정 다이얼로그 |
| `src/features/schedule/ConflictPanel.tsx` | 충돌 목록 패널 |
| `src/app/(schedule)/page.tsx` | 주간 그리드 편집기 페이지 |

---

## Task 1: DnD Kit 설치 + Vitest 확인

**Files:**
- Modify: `package.json`

- [ ] **Step 1: DnD Kit 설치**

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

- [ ] **Step 2: Vitest 동작 확인**

```bash
npm test
```

Expected: `No test files found` — 오류 없이 종료.

- [ ] **Step 3: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: install DnD Kit"
```

---

## Task 2: Rule Expander 엔진 (TDD)

**Files:**
- Create: `src/engine/expander/index.ts`
- Create: `src/engine/expander/index.test.ts`

- [ ] **Step 1: 타입 정의 및 테스트 파일 작성**

```typescript
// src/engine/expander/index.test.ts
import { describe, it, expect } from 'vitest'
import { expandRule, RuleInput, AcademicEventInput } from './index'

const baseRule: RuleInput = {
  startDate: new Date('2026-03-02'), // 월요일
  repeatInterval: 1,
  repeatUnit: 'WEEK',
  repeatDays: [0], // 월요일만
  endType: 'COUNT',
  endCount: 4,
  endDate: null,
}

const noEvents: AcademicEventInput[] = []
const termEnd = new Date('2026-07-31')

describe('expandRule - WEEK 반복', () => {
  it('매주 월요일 4회 생성', () => {
    const dates = expandRule(baseRule, noEvents, termEnd)
    expect(dates).toHaveLength(4)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-09')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-16')
    expect(dates[3].toISOString().slice(0, 10)).toBe('2026-03-23')
  })

  it('격주 월요일 3회 생성', () => {
    const rule = { ...baseRule, repeatInterval: 2, endCount: 3 }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(3)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-16')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-30')
  })

  it('복수 요일 (월·수) 6회 생성', () => {
    const rule = { ...baseRule, repeatDays: [0, 2], endCount: 6 }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(6)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02') // 월
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-04') // 수
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-09') // 월
  })

  it('종료 날짜 기준 정지', () => {
    const rule = { ...baseRule, endType: 'DATE' as const, endDate: new Date('2026-03-15'), endCount: null }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(2) // 3/2, 3/9만 포함
  })

  it('학사일정 날짜 제외', () => {
    const events: AcademicEventInput[] = [
      { date: new Date('2026-03-09'), allowException: false },
    ]
    const dates = expandRule(baseRule, events, termEnd)
    expect(dates).toHaveLength(4) // 4회이지만 3/9 건너뜀
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-16')
  })

  it('allowException=true인 날짜는 포함', () => {
    const events: AcademicEventInput[] = [
      { date: new Date('2026-03-09'), allowException: true },
    ]
    const dates = expandRule(baseRule, events, termEnd)
    expect(dates).toHaveLength(4)
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-09')
  })

  it('학기 종료일 초과 시 정지', () => {
    const rule = { ...baseRule, endType: 'NONE' as const, endCount: null, endDate: null }
    const end = new Date('2026-03-20')
    const dates = expandRule(rule, noEvents, end)
    expect(dates.every(d => d <= end)).toBe(true)
  })
})

describe('expandRule - DAY 반복', () => {
  it('3일마다 4회 생성', () => {
    const rule: RuleInput = {
      ...baseRule,
      repeatUnit: 'DAY',
      repeatInterval: 3,
      repeatDays: [],
      endCount: 4,
    }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(4)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-03-05')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-03-08') // 주말 포함
  })
})

describe('expandRule - MONTH 반복', () => {
  it('매월 같은 날짜로 3회 생성', () => {
    const rule: RuleInput = {
      startDate: new Date('2026-03-02'),
      repeatInterval: 1,
      repeatUnit: 'MONTH',
      repeatDays: [],
      endType: 'COUNT',
      endCount: 3,
      endDate: null,
    }
    const dates = expandRule(rule, noEvents, termEnd)
    expect(dates).toHaveLength(3)
    expect(dates[0].toISOString().slice(0, 10)).toBe('2026-03-02')
    expect(dates[1].toISOString().slice(0, 10)).toBe('2026-04-02')
    expect(dates[2].toISOString().slice(0, 10)).toBe('2026-05-02')
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npm test
```

Expected: `Cannot find module './index'` 또는 import 오류.

- [ ] **Step 3: Rule Expander 구현**

```typescript
// src/engine/expander/index.ts
export type RepeatUnit = 'DAY' | 'WEEK' | 'MONTH'
export type EndType = 'NONE' | 'DATE' | 'COUNT'

export interface RuleInput {
  startDate: Date
  repeatInterval: number
  repeatUnit: RepeatUnit
  repeatDays: number[] // 0=월, 1=화, 2=수, 3=목, 4=금 (WEEK일 때만 사용)
  endType: EndType
  endDate: Date | null
  endCount: number | null
}

export interface AcademicEventInput {
  date: Date
  allowException: boolean
}

function toMondayBasedDay(date: Date): number {
  // JS: 0=일, 1=월 ... 6=토 → 변환: 0=월, 1=화, ..., 4=금, 5=토, 6=일
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isBlocked(date: Date, events: AcademicEventInput[]): boolean {
  return events.some(e => isSameDay(e.date, date) && !e.allowException)
}

export function expandRule(
  rule: RuleInput,
  academicEvents: AcademicEventInput[],
  termEndDate: Date
): Date[] {
  const dates: Date[] = []
  const current = new Date(rule.startDate)
  current.setHours(0, 0, 0, 0)

  const termEnd = new Date(termEndDate)
  termEnd.setHours(0, 0, 0, 0)

  const startMonday = getMondayOfWeek(rule.startDate)
  let count = 0

  while (current <= termEnd) {
    if (rule.endType === 'DATE' && rule.endDate) {
      const end = new Date(rule.endDate)
      end.setHours(0, 0, 0, 0)
      if (current > end) break
    }
    if (rule.endType === 'COUNT' && rule.endCount !== null && count >= rule.endCount) break

    let matches = false

    if (rule.repeatUnit === 'WEEK') {
      const dayOfWeek = toMondayBasedDay(current)
      if (rule.repeatDays.includes(dayOfWeek)) {
        const currentMonday = getMondayOfWeek(current)
        const weeksDiff = Math.round(
          (currentMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
        if (weeksDiff >= 0 && weeksDiff % rule.repeatInterval === 0) {
          matches = true
        }
      }
    } else if (rule.repeatUnit === 'DAY') {
      const start = new Date(rule.startDate)
      start.setHours(0, 0, 0, 0)
      const daysDiff = Math.round((current.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
      if (daysDiff >= 0 && daysDiff % rule.repeatInterval === 0) {
        matches = true
      }
    } else if (rule.repeatUnit === 'MONTH') {
      const startD = new Date(rule.startDate)
      if (current.getDate() === startD.getDate()) {
        const monthsDiff =
          (current.getFullYear() - startD.getFullYear()) * 12 +
          (current.getMonth() - startD.getMonth())
        if (monthsDiff >= 0 && monthsDiff % rule.repeatInterval === 0) {
          matches = true
        }
      }
    }

    if (matches && !isBlocked(current, academicEvents)) {
      dates.push(new Date(current))
      count++
    }

    current.setDate(current.getDate() + 1)
  }

  return dates
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npm test
```

Expected: 모든 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/engine/expander/
git commit -m "feat: add Rule Expander engine with full test coverage"
```

---

## Task 3: Conflict Checker 엔진 (TDD)

**Files:**
- Create: `src/engine/conflict/index.ts`
- Create: `src/engine/conflict/index.test.ts`

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/engine/conflict/index.test.ts
import { describe, it, expect } from 'vitest'
import { checkConflict, EntryLike, RoomInfo, UnavailabilityInput } from './index'

const entry = {
  date: new Date('2026-03-02'), // 월요일
  periodId: 'p1',
  roomId: 'r1',
  classId: 'c1',
  teacherId: 't1',
}

const room: RoomInfo = { id: 'r1', capacity: 1 }

describe('checkConflict - 특별실 용량 초과', () => {
  it('동일 날짜·교시·특별실에 기존 배정 있으면 충돌', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c2', teacherId: null, status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.hasConflict).toBe(true)
    expect(result.conflicts.some(c => c.type === 'ROOM_CAPACITY')).toBe(true)
  })

  it('용량 2인 특별실은 2학급까지 허용', () => {
    const bigRoom: RoomInfo = { id: 'r1', capacity: 2 }
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c2', teacherId: null, status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room: bigRoom, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'ROOM_CAPACITY')).toBe(false)
  })

  it('EXCEPTION_CANCELLED 상태는 용량에서 제외', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c2', teacherId: null, status: 'EXCEPTION_CANCELLED' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.hasConflict).toBe(false)
  })
})

describe('checkConflict - 학급 중복 배정', () => {
  it('같은 학급이 같은 날짜·교시에 중복되면 충돌', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r2', classId: 'c1', teacherId: null, status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'CLASS_DOUBLE_BOOKING')).toBe(true)
  })
})

describe('checkConflict - 교사 중복 배정', () => {
  it('같은 교사가 같은 날짜·교시에 중복되면 충돌', () => {
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r2', classId: 'c2', teacherId: 't1', status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'TEACHER_DOUBLE_BOOKING')).toBe(true)
  })

  it('교사 없는 배정은 교사 충돌 검사 생략', () => {
    const entryNoTeacher = { ...entry, teacherId: null }
    const existing: EntryLike[] = [
      { id: 'e1', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r2', classId: 'c2', teacherId: 't1', status: 'NORMAL' },
    ]
    const result = checkConflict({ entry: entryNoTeacher, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'TEACHER_DOUBLE_BOOKING')).toBe(false)
  })
})

describe('checkConflict - 비가용 시간', () => {
  it('특별실 비가용 시간에 배정하면 충돌', () => {
    // entry.date = 2026-03-02 = 월요일 = dayOfWeek 0
    const unavail: UnavailabilityInput[] = [{ dayOfWeek: 0, periodId: 'p1' }]
    const result = checkConflict({ entry, existing: [], room, roomUnavailabilities: unavail, teacherUnavailabilities: [] })
    expect(result.conflicts.some(c => c.type === 'ROOM_UNAVAILABLE')).toBe(true)
  })

  it('교사 비가용 시간에 배정하면 충돌', () => {
    const unavail: UnavailabilityInput[] = [{ dayOfWeek: 0, periodId: 'p1' }]
    const result = checkConflict({ entry, existing: [], room, roomUnavailabilities: [], teacherUnavailabilities: unavail })
    expect(result.conflicts.some(c => c.type === 'TEACHER_UNAVAILABLE')).toBe(true)
  })
})

describe('checkConflict - excludeEntryId', () => {
  it('자기 자신은 충돌에서 제외', () => {
    const existing: EntryLike[] = [
      { id: 'self', date: new Date('2026-03-02'), periodId: 'p1', roomId: 'r1', classId: 'c1', teacherId: 't1', status: 'NORMAL' },
    ]
    const result = checkConflict({ entry, existing, room, roomUnavailabilities: [], teacherUnavailabilities: [], excludeEntryId: 'self' })
    expect(result.hasConflict).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```bash
npm test
```

Expected: `Cannot find module './index'`.

- [ ] **Step 3: Conflict Checker 구현**

```typescript
// src/engine/conflict/index.ts

export interface EntryLike {
  id: string
  date: Date
  periodId: string
  roomId: string
  classId: string
  teacherId: string | null
  status: string
}

export interface RoomInfo {
  id: string
  capacity: number
}

export interface UnavailabilityInput {
  dayOfWeek: number // 0=월, 4=금
  periodId: string
}

export type ConflictType =
  | 'ROOM_CAPACITY'
  | 'CLASS_DOUBLE_BOOKING'
  | 'TEACHER_DOUBLE_BOOKING'
  | 'ROOM_UNAVAILABLE'
  | 'TEACHER_UNAVAILABLE'

export interface ConflictInfo {
  type: ConflictType
  message: string
}

export interface ConflictResult {
  hasConflict: boolean
  conflicts: ConflictInfo[]
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toMondayBasedDay(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

interface CheckParams {
  entry: {
    date: Date
    periodId: string
    roomId: string
    classId: string
    teacherId: string | null
  }
  existing: EntryLike[]
  room: RoomInfo
  roomUnavailabilities: UnavailabilityInput[]
  teacherUnavailabilities: UnavailabilityInput[]
  excludeEntryId?: string
}

export function checkConflict(params: CheckParams): ConflictResult {
  const { entry, existing, room, roomUnavailabilities, teacherUnavailabilities, excludeEntryId } = params
  const conflicts: ConflictInfo[] = []

  const active = existing.filter(
    (e) => e.id !== excludeEntryId && e.status !== 'EXCEPTION_CANCELLED'
  )

  const sameSlot = active.filter(
    (e) => isSameDay(e.date, entry.date) && e.periodId === entry.periodId
  )

  // 1. 특별실 용량 초과
  const roomUsage = sameSlot.filter((e) => e.roomId === entry.roomId).length
  if (roomUsage >= room.capacity) {
    conflicts.push({
      type: 'ROOM_CAPACITY',
      message: `특별실 수용 인원 초과 (최대 ${room.capacity}개 학급 동시 사용 가능)`,
    })
  }

  // 2. 학급 중복 배정
  const classConflict = sameSlot.some((e) => e.classId === entry.classId)
  if (classConflict) {
    conflicts.push({
      type: 'CLASS_DOUBLE_BOOKING',
      message: '해당 학급이 같은 날짜·교시에 이미 배정되어 있습니다',
    })
  }

  // 3. 교사 중복 배정
  if (entry.teacherId) {
    const teacherConflict = sameSlot.some(
      (e) => e.teacherId === entry.teacherId
    )
    if (teacherConflict) {
      conflicts.push({
        type: 'TEACHER_DOUBLE_BOOKING',
        message: '해당 교사가 같은 날짜·교시에 이미 배정되어 있습니다',
      })
    }
  }

  // 4. 특별실 비가용 시간
  const dayOfWeek = toMondayBasedDay(entry.date)
  const roomUnavail = roomUnavailabilities.some(
    (u) => u.dayOfWeek === dayOfWeek && u.periodId === entry.periodId
  )
  if (roomUnavail) {
    conflicts.push({
      type: 'ROOM_UNAVAILABLE',
      message: '특별실이 해당 요일·교시에 사용 불가로 설정되어 있습니다',
    })
  }

  // 5. 교사 비가용 시간
  if (entry.teacherId) {
    const teacherUnavail = teacherUnavailabilities.some(
      (u) => u.dayOfWeek === dayOfWeek && u.periodId === entry.periodId
    )
    if (teacherUnavail) {
      conflicts.push({
        type: 'TEACHER_UNAVAILABLE',
        message: '교사가 해당 요일·교시에 비가용으로 설정되어 있습니다',
      })
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts }
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npm test
```

Expected: 모든 테스트 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/engine/conflict/
git commit -m "feat: add Conflict Checker engine with full test coverage"
```

---

## Task 4: 배정 규칙 Server Actions

**Files:**
- Create: `src/features/schedule/actions.ts`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/schedule/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { ScheduleEntry, ScheduleRule } from '@prisma/client'
import { expandRule } from '@/engine/expander'
import { checkConflict } from '@/engine/conflict'

// ─── 배정 규칙 조회 ───────────────────────────────────────────────────────────

export async function listScheduleRules(termId: string) {
  return prisma.scheduleRule.findMany({
    where: { termId },
    include: {
      room: true,
      classGroup: { include: { grade: true } },
      subject: true,
      teacher: true,
      period: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

// ─── 배정 엔트리 조회 (주간) ──────────────────────────────────────────────────

export async function listEntriesForWeek(termId: string, weekStart: string) {
  const start = new Date(weekStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)

  return prisma.scheduleEntry.findMany({
    where: { termId, date: { gte: start, lt: end } },
    include: {
      room: true,
      classGroup: { include: { grade: true } },
      subject: true,
      teacher: true,
      period: true,
    },
    orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
  })
}

// ─── 배정 규칙 생성 + 전개 ────────────────────────────────────────────────────

export async function createScheduleRule(data: {
  termId: string
  roomId: string
  classId: string
  subjectId?: string
  teacherId?: string
  periodId: string
  startDate: string
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  repeatDays: number[]
  endType: 'NONE' | 'DATE' | 'COUNT'
  endDate?: string
  endCount?: number
}): Promise<ActionResult<{ rule: ScheduleRule; created: number; conflicts: number }>> {
  try {
    const term = await prisma.schoolTerm.findUnique({ where: { id: data.termId } })
    if (!term) return { success: false, error: '학기를 찾을 수 없습니다.' }

    const rule = await prisma.scheduleRule.create({
      data: {
        termId: data.termId,
        roomId: data.roomId,
        classId: data.classId,
        subjectId: data.subjectId || null,
        teacherId: data.teacherId || null,
        periodId: data.periodId,
        startDate: new Date(data.startDate),
        repeatInterval: data.repeatInterval,
        repeatUnit: data.repeatUnit,
        repeatDays: data.repeatDays,
        endType: data.endType,
        endDate: data.endDate ? new Date(data.endDate) : null,
        endCount: data.endCount || null,
      },
    })

    const academicEvents = await prisma.academicEvent.findMany({ where: { termId: data.termId } })
    const dates = expandRule(
      {
        startDate: new Date(data.startDate),
        repeatInterval: data.repeatInterval,
        repeatUnit: data.repeatUnit,
        repeatDays: data.repeatDays,
        endType: data.endType,
        endDate: data.endDate ? new Date(data.endDate) : null,
        endCount: data.endCount || null,
      },
      academicEvents.map(e => ({ date: e.date, allowException: e.allowException })),
      term.endDate
    )

    const [room, existingEntries, roomUnavail] = await Promise.all([
      prisma.specialRoom.findUnique({ where: { id: data.roomId } }),
      prisma.scheduleEntry.findMany({ where: { termId: data.termId } }),
      prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } }),
    ])

    let created = 0
    let conflictCount = 0

    for (const date of dates) {
      const conflictResult = checkConflict({
        entry: { date, periodId: data.periodId, roomId: data.roomId, classId: data.classId, teacherId: data.teacherId || null },
        existing: existingEntries,
        room: { id: room!.id, capacity: room!.capacity },
        roomUnavailabilities: roomUnavail.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
        teacherUnavailabilities: [],
      })

      const status = conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL'

      await prisma.scheduleEntry.upsert({
        where: {
          date_periodId_roomId_classId: {
            date,
            periodId: data.periodId,
            roomId: data.roomId,
            classId: data.classId,
          },
        },
        create: {
          termId: data.termId,
          date,
          periodId: data.periodId,
          roomId: data.roomId,
          classId: data.classId,
          subjectId: data.subjectId || null,
          teacherId: data.teacherId || null,
          sourceRuleId: rule.id,
          source: 'RULE',
          status,
        },
        update: { status },
      })

      if (conflictResult.hasConflict) conflictCount++
      else created++
    }

    revalidatePath('/schedule')
    return { success: true, data: { rule, created, conflicts: conflictCount } }
  } catch (e) {
    console.error(e)
    return { success: false, error: '배정 규칙 생성 중 오류가 발생했습니다.' }
  }
}

// ─── 엔트리 이동 (드래그앤드롭) ───────────────────────────────────────────────

export async function moveScheduleEntry(
  entryId: string,
  newDate: string,
  newPeriodId: string,
  force = false
): Promise<ActionResult<{ entry: ScheduleEntry; conflicts: { type: string; message: string }[] }>> {
  try {
    const entry = await prisma.scheduleEntry.findUnique({
      where: { id: entryId },
      include: { room: true },
    })
    if (!entry) return { success: false, error: '배정을 찾을 수 없습니다.' }

    const [existing, roomUnavail, teacherUnavail] = await Promise.all([
      prisma.scheduleEntry.findMany({ where: { termId: entry.termId } }),
      prisma.roomUnavailability.findMany({ where: { roomId: entry.roomId } }),
      entry.teacherId
        ? prisma.teacherUnavailability.findMany({ where: { teacherId: entry.teacherId } })
        : Promise.resolve([]),
    ])

    const conflictResult = checkConflict({
      entry: {
        date: new Date(newDate),
        periodId: newPeriodId,
        roomId: entry.roomId,
        classId: entry.classId,
        teacherId: entry.teacherId,
      },
      existing,
      room: { id: entry.room.id, capacity: entry.room.capacity },
      roomUnavailabilities: roomUnavail.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
      teacherUnavailabilities: teacherUnavail.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
      excludeEntryId: entryId,
    })

    if (conflictResult.hasConflict && !force) {
      return { success: false, error: '충돌이 있습니다. 강제 배정하려면 force=true로 호출하세요.' }
    }

    const updated = await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: {
        date: new Date(newDate),
        periodId: newPeriodId,
        source: 'MANUAL',
        status: conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL',
      },
    })

    revalidatePath('/schedule')
    return { success: true, data: { entry: updated, conflicts: conflictResult.conflicts } }
  } catch {
    return { success: false, error: '배정 이동 중 오류가 발생했습니다.' }
  }
}

// ─── 배정 규칙 삭제 + 연관 엔트리 삭제 ───────────────────────────────────────

export async function deleteScheduleRule(ruleId: string): Promise<ActionResult> {
  try {
    await prisma.scheduleEntry.deleteMany({ where: { sourceRuleId: ruleId } })
    await prisma.scheduleRule.delete({ where: { id: ruleId } })
    revalidatePath('/schedule')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '배정 규칙 삭제 중 오류가 발생했습니다.' }
  }
}

// ─── 배정 엔트리 단건 취소 ───────────────────────────────────────────────────

export async function cancelScheduleEntry(entryId: string): Promise<ActionResult> {
  try {
    await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: { status: 'EXCEPTION_CANCELLED' },
    })
    revalidatePath('/schedule')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '배정 취소 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/schedule/actions.ts
git commit -m "feat: add schedule rule and entry Server Actions"
```

---

## Task 5: 반복 설정 다이얼로그 (RuleDialog)

**Files:**
- Create: `src/features/schedule/RuleDialog.tsx`

- [ ] **Step 1: RuleDialog 컴포넌트 작성**

```typescript
// src/features/schedule/RuleDialog.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createScheduleRule } from './actions'
import { ClassGroup, Grade, Period, SpecialRoom, Subject, Teacher } from '@prisma/client'

const DAY_LABELS = ['월', '화', '수', '목', '금']

interface Props {
  termId: string
  rooms: SpecialRoom[]
  classes: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  periods: Period[]
  trigger: React.ReactNode
}

export function RuleDialog({ termId, rooms, classes, subjects, teachers, periods, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [repeatUnit, setRepeatUnit] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK')
  const [endType, setEndType] = useState<'NONE' | 'DATE' | 'COUNT'>('NONE')
  const [selectedDays, setSelectedDays] = useState<number[]>([0])

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  async function handleSubmit(fd: FormData) {
    const result = await createScheduleRule({
      termId,
      roomId: fd.get('roomId') as string,
      classId: fd.get('classId') as string,
      subjectId: (fd.get('subjectId') as string) || undefined,
      teacherId: (fd.get('teacherId') as string) || undefined,
      periodId: fd.get('periodId') as string,
      startDate: fd.get('startDate') as string,
      repeatInterval: Number(fd.get('repeatInterval')),
      repeatUnit,
      repeatDays: repeatUnit === 'WEEK' ? selectedDays : [],
      endType,
      endDate: endType === 'DATE' ? (fd.get('endDate') as string) : undefined,
      endCount: endType === 'COUNT' ? Number(fd.get('endCount')) : undefined,
    })

    if (result.success) {
      const { created, conflicts } = result.data
      setOpen(false)
      setError('')
      if (conflicts > 0) alert(`${created}개 배정 완료, ${conflicts}개 충돌 (강제 배정됨)`)
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>배정 규칙 추가</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>특별실</Label>
              <select name="roomId" required className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">선택</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label>학급</Label>
              <select name="classId" required className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">선택</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.grade.number}학년 {c.number}반</option>
                ))}
              </select>
            </div>
            <div>
              <Label>과목 (선택)</Label>
              <select name="subjectId" className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">없음</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>교사 (선택)</Label>
              <select name="teacherId" className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">없음</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>교시</Label>
              <select name="periodId" required className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">선택</option>
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.number}교시 ({p.startTime}~{p.endTime})</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="startDate">시작일</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
          </div>

          {/* 반복 설정 */}
          <div className="border rounded p-3 space-y-3">
            <p className="text-sm font-medium">반복 설정</p>
            <div className="flex items-center gap-2">
              <Label className="shrink-0">반복 주기</Label>
              <Input name="repeatInterval" type="number" min={1} defaultValue={1} className="w-16" />
              <Select value={repeatUnit} onValueChange={(v) => setRepeatUnit(v as any)}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAY">일</SelectItem>
                  <SelectItem value="WEEK">주</SelectItem>
                  <SelectItem value="MONTH">개월</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {repeatUnit === 'WEEK' && (
              <div>
                <Label>반복 요일</Label>
                <div className="flex gap-2 mt-1">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-colors
                        ${selectedDays.includes(i)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>종료</Label>
              <div className="space-y-2 mt-1">
                {(['NONE', 'DATE', 'COUNT'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="endTypeRadio"
                      checked={endType === type}
                      onChange={() => setEndType(type)}
                    />
                    {type === 'NONE' && <span className="text-sm">없음</span>}
                    {type === 'DATE' && (
                      <span className="flex items-center gap-2 text-sm">
                        날짜:
                        {endType === 'DATE' && <Input name="endDate" type="date" className="w-40 h-7 text-sm" />}
                      </span>
                    )}
                    {type === 'COUNT' && (
                      <span className="flex items-center gap-2 text-sm">
                        다음
                        {endType === 'COUNT' && <Input name="endCount" type="number" min={1} defaultValue={13} className="w-16 h-7 text-sm" />}
                        회 반복
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">배정 규칙 추가</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/schedule/RuleDialog.tsx
git commit -m "feat: add RuleDialog with calendar-style repeat settings"
```

---

## Task 6: 주간 그리드 편집기 UI

**Files:**
- Create: `src/features/schedule/GridCell.tsx`
- Create: `src/features/schedule/ConflictPanel.tsx`
- Create: `src/features/schedule/WeeklyGrid.tsx`
- Create: `src/app/(schedule)/page.tsx`

- [ ] **Step 1: GridCell 컴포넌트 작성**

```typescript
// src/features/schedule/GridCell.tsx
'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface EntryData {
  id: string
  className: string
  subjectName?: string | null
  teacherName?: string | null
  status: string
}

interface CellProps {
  dayIndex: number   // 0=월, 4=금
  periodId: string
  entries: EntryData[]
  date: string       // ISO 날짜 "YYYY-MM-DD"
  onCancel: (entryId: string) => void
}

function DraggableEntry({ entry }: { entry: EntryData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: entry,
  })
  const style = { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1 }

  const isConflict = entry.status === 'FORCE_ASSIGNED'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`text-xs p-1 rounded cursor-grab select-none
        ${isConflict ? 'bg-red-100 border border-red-400' : 'bg-blue-100 border border-blue-300'}`}
    >
      <div className="font-medium">{entry.className}</div>
      {entry.subjectName && <div className="text-gray-600">{entry.subjectName}</div>}
      {entry.teacherName && <div className="text-gray-500">{entry.teacherName}</div>}
    </div>
  )
}

export function GridCell({ dayIndex, periodId, entries, date }: CellProps) {
  const droppableId = `${date}__${periodId}`
  const { isOver, setNodeRef } = useDroppable({ id: droppableId, data: { date, periodId } })

  return (
    <div
      ref={setNodeRef}
      className={`border min-h-16 p-1 space-y-1 transition-colors
        ${isOver ? 'bg-blue-50' : 'bg-white'}`}
    >
      {entries.map(entry => <DraggableEntry key={entry.id} entry={entry} />)}
    </div>
  )
}
```

- [ ] **Step 2: ConflictPanel 컴포넌트 작성**

```typescript
// src/features/schedule/ConflictPanel.tsx
interface Conflict {
  entryId: string
  date: string
  className: string
  periodNumber: number
  messages: string[]
}

export function ConflictPanel({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-red-700 font-medium mb-2">충돌 목록 ({conflicts.length}건)</h3>
      <div className="space-y-2">
        {conflicts.map(c => (
          <div key={c.entryId} className="text-sm">
            <span className="font-medium">{c.date} {c.periodNumber}교시 {c.className}</span>
            <ul className="text-red-600 pl-4 list-disc">
              {c.messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: WeeklyGrid 컴포넌트 작성**

```typescript
// src/features/schedule/WeeklyGrid.tsx
'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { GridCell } from './GridCell'
import { moveScheduleEntry } from './actions'

const DAY_LABELS = ['월', '화', '수', '목', '금']

interface Period { id: string; number: number; startTime: string; endTime: string }
interface Entry {
  id: string; date: Date; periodId: string; roomId: string; classId: string
  status: string
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
}

interface Props {
  weekDates: string[]   // 5 ISO date strings, Mon~Fri
  periods: Period[]
  entries: Entry[]
  roomFilter: string | null
}

export function WeeklyGrid({ weekDates, periods, entries, roomFilter }: Props) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [pending, setPending] = useState(false)

  const filtered = roomFilter
    ? localEntries.filter(e => e.roomId === roomFilter)
    : localEntries

  function getEntries(date: string, periodId: string) {
    return filtered
      .filter(e => e.date.toISOString().slice(0, 10) === date && e.periodId === periodId)
      .map(e => ({
        id: e.id,
        className: `${e.classGroup.grade.number}-${e.classGroup.number}`,
        subjectName: e.subject?.name,
        teacherName: e.teacher?.name,
        status: e.status,
      }))
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const entryId = active.id as string
    const [newDate, newPeriodId] = (over.id as string).split('__')

    setPending(true)
    const result = await moveScheduleEntry(entryId, newDate, newPeriodId)
    if (!result.success && result.error.includes('충돌')) {
      const force = confirm(`충돌이 있습니다. 강제 배정하시겠습니까?\n\n확인을 누르면 충돌을 무시하고 배정합니다.`)
      if (force) await moveScheduleEntry(entryId, newDate, newPeriodId, true)
    }
    setPending(false)
  }, [])

  return (
    <div className={pending ? 'opacity-50 pointer-events-none' : ''}>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border bg-gray-50 p-2 w-24">교시</th>
                {weekDates.map((date, i) => (
                  <th key={date} className="border bg-gray-50 p-2">
                    {DAY_LABELS[i]}<br />
                    <span className="text-xs text-gray-500">{date.slice(5)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(period => (
                <tr key={period.id}>
                  <td className="border bg-gray-50 p-2 text-center">
                    <div className="font-medium">{period.number}교시</div>
                    <div className="text-xs text-gray-500">{period.startTime}</div>
                  </td>
                  {weekDates.map((date, i) => (
                    <td key={date} className="border p-0">
                      <GridCell
                        dayIndex={i}
                        periodId={period.id}
                        entries={getEntries(date, period.id)}
                        date={date}
                        onCancel={() => {}}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DndContext>
    </div>
  )
}
```

- [ ] **Step 4: 주간 그리드 페이지 작성**

```typescript
// src/app/(schedule)/page.tsx
import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listEntriesForWeek, listScheduleRules, deleteScheduleRule } from '@/features/schedule/actions'
import { listGrades } from '@/features/classes/actions'
import { WeeklyGrid } from '@/features/schedule/WeeklyGrid'
import { RuleDialog } from '@/features/schedule/RuleDialog'
import { Button } from '@/components/ui/button'

function getWeekDates(referenceDate: Date): string[] {
  const d = new Date(referenceDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // 월요일로 조정
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
  searchParams: { week?: string; room?: string }
}) {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <div className="p-8"><p className="text-gray-500">먼저 학기를 등록해 주세요.</p></div>

  const refDate = searchParams.week ? new Date(searchParams.week) : new Date()
  const weekDates = getWeekDates(refDate)

  const [rooms, periods, subjects, teachers, grades, entries, rules] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listEntriesForWeek(activeTerm.id, weekDates[0]),
    listScheduleRules(activeTerm.id),
  ])

  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))
  const prevWeek = new Date(weekDates[0]); prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(weekDates[0]); nextWeek.setDate(nextWeek.getDate() + 7)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">주간 시간표 편집기</h1>
        <RuleDialog
          termId={activeTerm.id}
          rooms={rooms}
          classes={classes}
          subjects={subjects}
          teachers={teachers as any}
          periods={periods}
          trigger={<Button>+ 배정 규칙 추가</Button>}
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <a href={`/schedule?week=${prevWeek.toISOString().slice(0, 10)}`}>
          <Button variant="outline" size="sm">← 이전 주</Button>
        </a>
        <span className="font-medium">{weekDates[0]} ~ {weekDates[4]}</span>
        <a href={`/schedule?week=${nextWeek.toISOString().slice(0, 10)}`}>
          <Button variant="outline" size="sm">다음 주 →</Button>
        </a>

        <select className="border rounded px-2 py-1 text-sm ml-auto"
          onChange={e => { window.location.href = `/schedule?week=${weekDates[0]}&room=${e.target.value}` }}>
          <option value="">전체 특별실</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id} selected={searchParams.room === r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <WeeklyGrid
        weekDates={weekDates}
        periods={periods}
        entries={entries as any}
        roomFilter={searchParams.room || null}
      />

      <div className="mt-6">
        <h2 className="font-semibold mb-2">등록된 배정 규칙</h2>
        <div className="space-y-1">
          {rules.map(rule => (
            <div key={rule.id} className="bg-white rounded p-3 shadow-sm flex items-center gap-3 text-sm">
              <span className="font-medium">{rule.room.name}</span>
              <span>{rule.classGroup.grade.number}학년 {rule.classGroup.number}반</span>
              {rule.subject && <span className="text-gray-500">{rule.subject.name}</span>}
              {rule.teacher && <span className="text-gray-500">{rule.teacher.name}</span>}
              <span className="text-gray-400">{rule.period.number}교시</span>
              <form action={async () => { 'use server'; await deleteScheduleRule(rule.id) }} className="ml-auto">
                <Button variant="destructive" size="sm" type="submit">삭제</Button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 동작 확인**

```bash
npm run dev
```

`http://localhost:3000/schedule` → 배정 규칙 추가 → 주간 그리드에 배정 표시 → 드래그앤드롭으로 이동 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/features/schedule/ src/app/\(schedule\)/
git commit -m "feat: add weekly grid editor with drag-and-drop — Plan B complete"
```

---

## 완료 기준

- [ ] `npm test` — 전체 통과 (Rule Expander + Conflict Checker)
- [ ] `/schedule` 페이지에서 배정 규칙 추가 동작
- [ ] 주간 그리드에 배정 표시 및 드래그앤드롭 이동 동작
- [ ] 충돌 시 빨간 테두리 + 강제 배정 confirm 다이얼로그 동작
- [ ] 모든 변경사항 커밋 완료

**다음 단계:** Plan C (달력형·목록형 보기 + 단발 예약 + 엑셀 내보내기) 진행.
