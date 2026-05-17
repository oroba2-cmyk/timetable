# 전담 시간표 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a specialist teacher (전담) timetable editor that shares the existing ScheduleRule/ScheduleEntry engine, with roomId made optional so specialist teachers can teach in regular classrooms without a room assignment.

**Architecture:** Make `roomId` nullable in `ScheduleRule` and `ScheduleEntry`, change the entry unique constraint from `[date, periodId, roomId, classId]` to `[date, periodId, classId]`, and use `roomId IS NULL` vs `roomId IS NOT NULL` as the discriminator between specialist and room entries. A new `/specialist` page reuses existing grid and dialog components with a teacher-centric sidebar. The existing `/schedule` page is renamed "특별실 시간표" in the nav.

**Tech Stack:** Next.js 16 App Router, Prisma v7 with `@prisma/adapter-pg`, React Server Components + Client Components, TypeScript, Tailwind CSS. Prisma imports from `@/generated/prisma`. Server actions use `'use server'` directive. All dates stored as UTC.

---

## File Structure

**Modified files:**
- `prisma/schema.prisma` — make `ScheduleRule.roomId` and `ScheduleEntry.roomId` nullable; change entry unique constraint
- `src/engine/conflict/index.ts` — handle nullable `roomId` in `EntryLike` and `CheckParams`
- `src/features/schedule/actions.ts` — nullable roomId in createScheduleRule, fix upsert key, add entryType filter, update moveScheduleEntry for null room
- `src/features/schedule/RuleDialog.tsx` — add `ruleType` prop; room optional/required toggles based on type
- `src/features/schedule/RoomWeeklyGrid.tsx` — `RoomEntryData.roomId: string | null`
- `src/app/layout.tsx` — rename nav items, add 전담 시간표 link
- `src/app/(schedule)/schedule/page.tsx` — filter entries/rules by `roomId: { not: null }`
- `src/app/(calendar)/calendar/page.tsx` — handle null roomId in entries

**New files:**
- `src/app/(specialist)/layout.tsx` — thin layout wrapper
- `src/app/(specialist)/specialist/page.tsx` — server component; fetches teachers, entries (roomId null), rules
- `src/features/specialist/TeacherSidebar.tsx` — teacher list with entry counts
- `src/features/specialist/SpecialistAssignDialog.tsx` — pick class + optional room for a given teacher+period+date
- `src/features/specialist/SpecialistEditor.tsx` — main editor; teacher sidebar + grade tabs + RoomWeeklyGrid

---

### Task 1: Schema migration — nullable roomId + unique constraint

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Edit ScheduleRule in schema.prisma**

Change lines in `model ScheduleRule`:
```prisma
  roomId     String?
  room       SpecialRoom? @relation(fields: [roomId], references: [id])
```

- [ ] **Step 2: Edit ScheduleEntry in schema.prisma**

Change lines in `model ScheduleEntry` (remove `onDelete: Cascade` since relation is now optional, and change unique constraint):
```prisma
  roomId     String?
  room       SpecialRoom? @relation(fields: [roomId], references: [id])
  ...
  @@unique([date, periodId, classId])
```
Remove the old `@@unique([date, periodId, roomId, classId])` line entirely.

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name make-room-optional-specialist
```
Expected output: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify type-check passes**

```bash
npx tsc --noEmit
```
Expected: errors about `roomId` now being `string | null` in generated types — these will be fixed in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: make ScheduleRule/ScheduleEntry roomId nullable for specialist support"
```

---

### Task 2: Conflict engine — handle null roomId

**Files:**
- Modify: `src/engine/conflict/index.ts`

- [ ] **Step 1: Update EntryLike and CheckParams**

Replace the current interfaces and `checkConflict` function with:

```ts
export interface EntryLike {
  id: string
  date: Date
  periodId: string
  roomId: string | null
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

interface CheckParams {
  entry: {
    date: Date
    periodId: string
    roomId: string | null
    classId: string
    teacherId: string | null
  }
  existing: EntryLike[]
  room: RoomInfo | null                      // null for specialist (no room)
  roomUnavailabilities: UnavailabilityInput[] // empty for specialist
  teacherUnavailabilities: UnavailabilityInput[]
  excludeEntryId?: string
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function toMondayBasedDayUTC(date: Date): number {
  const d = date.getUTCDay()
  return d === 0 ? 6 : d - 1
}

export function checkConflict(params: CheckParams): ConflictResult {
  const { entry, existing, room, roomUnavailabilities, teacherUnavailabilities, excludeEntryId } = params
  const conflicts: ConflictInfo[] = []

  const active = existing.filter(
    (e) => e.id !== excludeEntryId && e.status !== 'EXCEPTION_CANCELLED'
  )

  const sameSlot = active.filter(
    (e) => isSameDayUTC(e.date, entry.date) && e.periodId === entry.periodId
  )

  // 1. 특별실 용량 초과 (only when room is assigned)
  if (entry.roomId && room) {
    const roomUsage = sameSlot.filter((e) => e.roomId === entry.roomId).length
    if (roomUsage >= room.capacity) {
      conflicts.push({
        type: 'ROOM_CAPACITY',
        message: `특별실 수용 인원 초과 (최대 ${room.capacity}개 학급 동시 사용 가능)`,
      })
    }
  }

  // 2. 학급 중복 배정
  if (sameSlot.some((e) => e.classId === entry.classId)) {
    conflicts.push({
      type: 'CLASS_DOUBLE_BOOKING',
      message: '해당 학급이 같은 날짜·교시에 이미 배정되어 있습니다',
    })
  }

  // 3. 교사 중복 배정
  if (entry.teacherId && sameSlot.some((e) => e.teacherId === entry.teacherId)) {
    conflicts.push({
      type: 'TEACHER_DOUBLE_BOOKING',
      message: '해당 교사가 같은 날짜·교시에 이미 배정되어 있습니다',
    })
  }

  // 4. 특별실 비가용 시간 (only when room is assigned)
  if (entry.roomId) {
    const dayOfWeek = toMondayBasedDayUTC(entry.date)
    if (roomUnavailabilities.some((u) => u.dayOfWeek === dayOfWeek && u.periodId === entry.periodId)) {
      conflicts.push({
        type: 'ROOM_UNAVAILABLE',
        message: '특별실이 해당 요일·교시에 사용 불가로 설정되어 있습니다',
      })
    }
  }

  // 5. 교사 비가용 시간
  if (entry.teacherId) {
    const dayOfWeek = toMondayBasedDayUTC(entry.date)
    if (teacherUnavailabilities.some((u) => u.dayOfWeek === dayOfWeek && u.periodId === entry.periodId)) {
      conflicts.push({
        type: 'TEACHER_UNAVAILABLE',
        message: '교사가 해당 요일·교시에 비가용으로 설정되어 있습니다',
      })
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts }
}
```

- [ ] **Step 2: Update conflict test for null room**

Open `src/engine/conflict/index.test.ts` and add a test case for specialist (null room) ensuring CLASS_DOUBLE_BOOKING still fires but ROOM_CAPACITY does not:

```ts
it('specialist entry: no room capacity conflict, but class double-booking fires', () => {
  const existing: EntryLike[] = [{
    id: 'e1', date: new Date('2026-04-07'), periodId: 'p1',
    roomId: null, classId: 'c1', teacherId: 't1', status: 'NORMAL',
  }]
  const result = checkConflict({
    entry: { date: new Date('2026-04-07'), periodId: 'p1', roomId: null, classId: 'c1', teacherId: 't2' },
    existing, room: null, roomUnavailabilities: [], teacherUnavailabilities: [],
  })
  expect(result.hasConflict).toBe(true)
  expect(result.conflicts.map(c => c.type)).toContain('CLASS_DOUBLE_BOOKING')
  expect(result.conflicts.map(c => c.type)).not.toContain('ROOM_CAPACITY')
})
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/engine/conflict
```
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/engine/conflict/index.ts src/engine/conflict/index.test.ts
git commit -m "feat: conflict engine handles null roomId for specialist entries"
```

---

### Task 3: Schedule actions — nullable roomId + upsert key fix + filters

**Files:**
- Modify: `src/features/schedule/actions.ts`

This task has many changes. Apply them in order.

- [ ] **Step 1: Update `listEntriesForWeek` — add optional entryType filter**

Replace the function signature and where clause:

```ts
export async function listEntriesForWeek(
  termId: string,
  weekStart: string,
  entryType?: 'ROOM' | 'SPECIALIST'
) {
  try {
    const start = new Date(weekStart)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)

    const roomFilter =
      entryType === 'ROOM'       ? { not: null } :
      entryType === 'SPECIALIST' ? null           :
      undefined  // no filter = all

    const entries = await prisma.scheduleEntry.findMany({
      where: {
        termId,
        date: { gte: start, lt: end },
        status: { not: 'EXCEPTION_CANCELLED' },
        ...(roomFilter !== undefined ? { roomId: roomFilter } : {}),
      },
      include: INCLUDE_RULE,
      orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
    })
    return { success: true as const, data: entries }
  } catch (err) {
    console.error('[listEntriesForWeek]', err)
    return { success: false as const, error: '주간 일정을 불러오는데 실패했습니다.' }
  }
}
```

- [ ] **Step 2: Update `listScheduleRules` — add optional entryType filter**

```ts
export async function listScheduleRules(
  termId: string,
  entryType?: 'ROOM' | 'SPECIALIST'
) {
  try {
    const roomFilter =
      entryType === 'ROOM'       ? { not: null } :
      entryType === 'SPECIALIST' ? null           :
      undefined

    const rules = await prisma.scheduleRule.findMany({
      where: {
        termId,
        ...(roomFilter !== undefined ? { roomId: roomFilter } : {}),
      },
      include: INCLUDE_RULE,
      orderBy: { createdAt: 'asc' },
    })
    return { success: true as const, data: rules }
  } catch (err) {
    console.error('[listScheduleRules]', err)
    return { success: false as const, error: '일정 규칙 목록을 불러오는데 실패했습니다.' }
  }
}
```

- [ ] **Step 3: Update `CreateScheduleRuleInput` — make roomId optional**

```ts
interface CreateScheduleRuleInput {
  termId: string
  roomId?: string        // undefined = specialist (no room)
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
}
```

- [ ] **Step 4: Update `createScheduleRule` body — handle null room**

Replace the validation block (currently lines 86-95) and the upsert logic:

```ts
export async function createScheduleRule(
  data: CreateScheduleRuleInput
): Promise<ActionResult<{ rule: ScheduleRule; created: number; conflicts: number }>> {
  try {
    const term = await prisma.schoolTerm.findUnique({ where: { id: data.termId } })
    if (!term) return { success: false, error: '학기를 찾을 수 없습니다.' }

    const room = data.roomId
      ? await prisma.specialRoom.findUnique({ where: { id: data.roomId } })
      : null
    if (data.roomId && !room) return { success: false, error: '특별실을 찾을 수 없습니다.' }

    const rule = await prisma.scheduleRule.create({
      data: {
        termId: data.termId,
        roomId: data.roomId ?? null,
        classId: data.classId,
        subjectId: data.subjectId ?? null,
        teacherId: data.teacherId ?? null,
        periodId: data.periodId,
        startDate: new Date(data.startDate),
        repeatInterval: data.repeatInterval,
        repeatUnit: data.repeatUnit,
        repeatDays: data.repeatDays,
        endType: data.endType,
        endDate: data.endDate ? new Date(data.endDate) : null,
        endCount: data.endCount ?? null,
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
        endCount: data.endCount ?? null,
      },
      academicEvents.map((e) => ({ date: e.date, endDate: e.endDate, allowException: e.allowException })),
      term.endDate
    )

    const [existingEntriesRaw, roomUnavailabilities] = await Promise.all([
      prisma.scheduleEntry.findMany({ where: { termId: data.termId } }),
      data.roomId
        ? prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } })
        : Promise.resolve([]),
    ])
    const existingEntries: EntryLike[] = existingEntriesRaw

    let created = 0
    let conflictCount = 0

    for (const date of dates) {
      const conflictResult = checkConflict({
        entry: {
          date,
          periodId: data.periodId,
          roomId: data.roomId ?? null,
          classId: data.classId,
          teacherId: data.teacherId ?? null,
        },
        existing: existingEntries,
        room: room ? { id: room.id, capacity: room.capacity } : null,
        roomUnavailabilities: roomUnavailabilities.map((u) => ({
          dayOfWeek: u.dayOfWeek,
          periodId: u.periodId,
        })),
        teacherUnavailabilities: [],
      })

      const status = conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL'

      await prisma.scheduleEntry.upsert({
        where: {
          date_periodId_classId: {
            date,
            periodId: data.periodId,
            classId: data.classId,
          },
        },
        create: {
          termId: data.termId,
          date,
          periodId: data.periodId,
          roomId: data.roomId ?? null,
          classId: data.classId,
          subjectId: data.subjectId ?? null,
          teacherId: data.teacherId ?? null,
          source: 'RULE',
          sourceRuleId: rule.id,
          status,
        },
        update: { status },
      })

      existingEntries.push({
        id: `new-${date.toISOString()}`,
        date,
        periodId: data.periodId,
        roomId: data.roomId ?? null,
        classId: data.classId,
        teacherId: data.teacherId ?? null,
        status,
      })

      conflictResult.hasConflict ? conflictCount++ : created++
    }

    revalidatePath('/schedule')
    revalidatePath('/specialist')
    return { success: true, data: { rule, created, conflicts: conflictCount } }
  } catch (err) {
    console.error('[createScheduleRule]', err)
    return { success: false, error: '일정 규칙 생성에 실패했습니다.' }
  }
}
```

- [ ] **Step 5: Update `moveScheduleEntry` — handle null room**

Find the `moveScheduleEntry` function. Replace the body to handle `existing.room` being null:

```ts
// Step 1: find entry (room may be null)
const existing = await prisma.scheduleEntry.findUnique({
  where: { id: entryId },
  include: { room: true },
})
if (!existing) return { success: false, error: '일정을 찾을 수 없습니다.' }

// Step 2: load existing entries and unavailabilities
const [allEntries, roomUnavailabilities, teacherUnavailabilities] = await Promise.all([
  prisma.scheduleEntry.findMany({ where: { termId: existing.termId } }),
  existing.roomId
    ? prisma.roomUnavailability.findMany({ where: { roomId: existing.roomId } })
    : Promise.resolve([]),
  existing.teacherId
    ? prisma.teacherUnavailability.findMany({ where: { teacherId: existing.teacherId } })
    : Promise.resolve([]),
])

// Step 3: check conflict
const conflictResult = checkConflict({
  entry: {
    date: new Date(newDate),
    periodId: newPeriodId,
    roomId: existing.roomId,
    classId: existing.classId,
    teacherId: existing.teacherId,
  },
  existing: allEntries,
  room: existing.room ? { id: existing.room.id, capacity: existing.room.capacity } : null,
  roomUnavailabilities: roomUnavailabilities.map((u) => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
  teacherUnavailabilities: teacherUnavailabilities.map((u) => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
  excludeEntryId: entryId,
})
```

- [ ] **Step 6: Update `quickAssignClass` — fix upsert key**

Find `quickAssignClass`. The upsert `where` key changes from `date_periodId_roomId_classId` to `date_periodId_classId`. Update it:

```ts
await prisma.scheduleEntry.upsert({
  where: {
    date_periodId_classId: {
      date: entryDate,
      periodId: data.periodId,
      classId: data.classId,
    },
  },
  create: { ... },  // keep existing create body unchanged
  update: { status },
})
```

- [ ] **Step 7: Update `updateScheduleRule` — fix revalidatePath**

Add `revalidatePath('/specialist')` after the existing `revalidatePath('/schedule')` call in `updateScheduleRule`.

- [ ] **Step 8: Update `bulkDeleteScheduleRules` — fix revalidatePath**

Same: add `revalidatePath('/specialist')`.

- [ ] **Step 9: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add src/features/schedule/actions.ts
git commit -m "feat: schedule actions support nullable roomId and specialist entry type filter"
```

---

### Task 4: RoomWeeklyGrid — nullable roomId in RoomEntryData

**Files:**
- Modify: `src/features/schedule/RoomWeeklyGrid.tsx`

- [ ] **Step 1: Update RoomEntryData interface**

```ts
export interface RoomEntryData {
  id: string
  date: string
  periodId: string
  roomId: string | null
  sourceRuleId: string | null
  classGroup: { number: number; grade: { number: number } }
  status: string
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors (Prisma's generated types now return `string | null` for roomId, matching the interface)

- [ ] **Step 3: Commit**

```bash
git add src/features/schedule/RoomWeeklyGrid.tsx
git commit -m "fix: RoomEntryData.roomId nullable after schema change"
```

---

### Task 5: RuleDialog — add ruleType prop for specialist mode

**Files:**
- Modify: `src/features/schedule/RuleDialog.tsx`

- [ ] **Step 1: Add ruleType prop to Props interface**

```ts
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
  ruleType?: 'ROOM' | 'SPECIALIST'   // ← add this
  forcedOpen?: boolean
  onForcedClose?: () => void
  onSaved?: () => void
}
```

- [ ] **Step 2: Use ruleType in the component**

Add `const isSpecialist = ruleType === 'SPECIALIST'` after destructuring.

In `handleSubmit`, change `roomId` extraction:
```ts
const roomId = isSpecialist
  ? (fd.get('roomId') as string) || undefined   // optional for specialist
  : (fd.get('roomId') as string)                // required for room booking
```

Change `createScheduleRule` call to omit `roomId` when undefined:
```ts
const payload = {
  termId,
  ...(roomId ? { roomId } : {}),
  classId, subjectId, teacherId, periodId,
  startDate, repeatInterval, repeatUnit,
  repeatDays: repeatUnit === 'WEEK' ? selectedDays : [],
  endType, endDate, endCount,
}
```

- [ ] **Step 3: Update room select in JSX — optional for specialist**

```tsx
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
```

- [ ] **Step 4: Move teacher select above subject for specialist mode**

Wrap teacher and subject selects:

```tsx
{/* For specialist: teacher is required and shown first */}
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
        {teachers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
      </select>
    </div>
  </>
)}
```

- [ ] **Step 5: Update dialog title**

```tsx
<DialogTitle>
  {isEdit
    ? (isSpecialist ? '전담 배정 규칙 수정' : '배정 규칙 수정')
    : (isSpecialist ? '전담 배정 규칙 추가' : '배정 규칙 추가')}
</DialogTitle>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/features/schedule/RuleDialog.tsx
git commit -m "feat: RuleDialog supports specialist mode with optional room and required teacher"
```

---

### Task 6: TeacherSidebar component

**Files:**
- Create: `src/features/specialist/TeacherSidebar.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

interface TeacherData {
  id: string
  name: string
  subjects: { name: string }[]
}

interface Props {
  teachers: TeacherData[]
  selectedTeacherId: string | null   // null = "모든 전담교사"
  onSelect: (id: string | null) => void
  assignmentCounts: Record<string, number>
}

export function TeacherSidebar({ teachers, selectedTeacherId, onSelect, assignmentCounts }: Props) {
  const allSelected = selectedTeacherId === null
  const totalCount = Object.values(assignmentCounts).reduce((s, n) => s + n, 0)

  return (
    <div className="w-48 shrink-0 border-r bg-gray-50 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
        전담교사
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 ${
          allSelected ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span>모든 전담교사</span>
          {totalCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              allSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {totalCount}
            </span>
          )}
        </div>
      </button>

      {teachers.map(teacher => {
        const count = assignmentCounts[teacher.id] ?? 0
        const isSelected = teacher.id === selectedTeacherId

        return (
          <button
            key={teacher.id}
            type="button"
            onClick={() => onSelect(teacher.id)}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-0 ${
              isSelected ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate">{teacher.name}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  isSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </div>
            {teacher.subjects.length > 0 && (
              <div className={`text-xs mt-0.5 truncate ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                {teacher.subjects.map(s => s.name).join('·')}
              </div>
            )}
          </button>
        )
      })}
      {teachers.length === 0 && (
        <p className="px-3 py-4 text-xs text-gray-400">등록된 전담교사 없음</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/specialist/TeacherSidebar.tsx
git commit -m "feat: TeacherSidebar component for specialist editor"
```

---

### Task 7: SpecialistAssignDialog component

**Files:**
- Create: `src/features/specialist/SpecialistAssignDialog.tsx`

This dialog opens when a cell is clicked in the specialist editor. The teacher is already selected. The user picks a class and optionally a room.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { quickAssignSpecialist } from './actions'

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface RoomOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  termId: string
  teacherId: string
  teacherName: string
  periodId: string
  date: string     // YYYY-MM-DD
  classes: ClassData[]
  availableRooms: RoomOption[]
  onAssigned: (details: { teacherId: string; classIds: string[]; periodId: string; date: string }) => void
}

const DAY_KO = ['월', '화', '수', '목', '금', '토', '일']

export function SpecialistAssignDialog({
  open, onClose, termId, teacherId, teacherName, periodId, date, classes, availableRooms, onAssigned,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const gradeMap = new Map<number, ClassData[]>()
  for (const cls of classes) {
    const gn = cls.grade.number
    if (!gradeMap.has(gn)) gradeMap.set(gn, [])
    gradeMap.get(gn)!.push(cls)
  }
  const grades = [...gradeMap.keys()].sort((a, b) => a - b)

  const d = new Date(date)
  const utcDay = d.getUTCDay()
  const mondayBased = utcDay === 0 ? 6 : utcDay - 1
  const dateLabel = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${DAY_KO[mondayBased]})`

  function toggleClass(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAssign() {
    if (selected.size === 0) return
    setError('')
    startTransition(async () => {
      let created = 0, conflicts = 0
      for (const classId of selected) {
        const result = await quickAssignSpecialist({
          termId, teacherId, classId, periodId, date,
          roomId: selectedRoomId || undefined,
        })
        if (!result.success) { setError(result.error); return }
        created += result.data.created
        conflicts += result.data.conflicts
      }
      if (conflicts > 0) alert(`${created}개 배정 완료, ${conflicts}개 충돌 감지됨`)
      const assignedClassIds = [...selected]
      setSelected(new Set())
      setSelectedRoomId('')
      onAssigned({ teacherId, classIds: assignedClassIds, periodId, date })
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setSelected(new Set()); setError(''); onClose() } }}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{teacherName} 전담 배정 — {dateLabel}</DialogTitle>
        </DialogHeader>

        {/* Room picker (optional) */}
        <div className="border-b pb-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5">특별실 (선택)</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRoomId('')}
              className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                !selectedRoomId
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400'
              }`}
            >
              일반 교실
            </button>
            {availableRooms.map(room => (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedRoomId(room.id)}
                className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                  selectedRoomId === room.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>

        {/* Class picker */}
        <div className="overflow-y-auto flex-1 space-y-3 pt-1 pr-1">
          {grades.map(grade => {
            const group = gradeMap.get(grade)!.sort((a, b) => a.number - b.number)
            return (
              <div key={grade}>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">{grade}학년</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.map(cls => {
                    const isSel = selected.has(cls.id)
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleClass(cls.id)}
                        className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                          isSel
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 hover:bg-blue-50 hover:border-blue-400'
                        }`}
                      >
                        {cls.number}반
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>취소</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || isPending}>
            {isPending ? '배정 중...' : `${selected.size}개 학급 배정`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create `quickAssignSpecialist` action in `src/features/specialist/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { expandRule } from '@/engine/expander'
import { checkConflict } from '@/engine/conflict'
import type { EntryLike } from '@/engine/conflict'
import { ActionResult } from '@/types'

export async function quickAssignSpecialist(data: {
  termId: string
  teacherId: string
  classId: string
  periodId: string
  date: string          // YYYY-MM-DD
  roomId?: string       // optional
}): Promise<ActionResult<{ created: number; conflicts: number }>> {
  try {
    const term = await prisma.schoolTerm.findUnique({ where: { id: data.termId } })
    if (!term) return { success: false, error: '학기를 찾을 수 없습니다.' }

    const room = data.roomId
      ? await prisma.specialRoom.findUnique({ where: { id: data.roomId } })
      : null

    const entryDate = new Date(data.date)
    entryDate.setUTCHours(0, 0, 0, 0)

    const rule = await prisma.scheduleRule.create({
      data: {
        termId: data.termId,
        roomId: data.roomId ?? null,
        classId: data.classId,
        teacherId: data.teacherId,
        periodId: data.periodId,
        startDate: entryDate,
        repeatInterval: 1,
        repeatUnit: 'WEEK',
        repeatDays: [entryDate.getUTCDay() === 0 ? 6 : entryDate.getUTCDay() - 1],
        endType: 'NONE',
        endDate: null,
        endCount: null,
      },
    })

    const existingEntries = await prisma.scheduleEntry.findMany({ where: { termId: data.termId } })
    const roomUnavailabilities = data.roomId
      ? await prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } })
      : []

    const conflictResult = checkConflict({
      entry: { date: entryDate, periodId: data.periodId, roomId: data.roomId ?? null, classId: data.classId, teacherId: data.teacherId },
      existing: existingEntries,
      room: room ? { id: room.id, capacity: room.capacity } : null,
      roomUnavailabilities: roomUnavailabilities.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
      teacherUnavailabilities: [],
    })

    const status = conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL'

    await prisma.scheduleEntry.upsert({
      where: { date_periodId_classId: { date: entryDate, periodId: data.periodId, classId: data.classId } },
      create: {
        termId: data.termId,
        date: entryDate,
        periodId: data.periodId,
        roomId: data.roomId ?? null,
        classId: data.classId,
        teacherId: data.teacherId,
        source: 'RULE',
        sourceRuleId: rule.id,
        status,
      },
      update: { status },
    })

    revalidatePath('/specialist')
    revalidatePath('/calendar')

    return { success: true, data: { created: 1, conflicts: conflictResult.hasConflict ? 1 : 0 } }
  } catch (err) {
    console.error('[quickAssignSpecialist]', err)
    return { success: false, error: '전담 배정에 실패했습니다.' }
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/specialist/SpecialistAssignDialog.tsx src/features/specialist/actions.ts
git commit -m "feat: SpecialistAssignDialog and quickAssignSpecialist action"
```

---

### Task 8: SpecialistEditor component

**Files:**
- Create: `src/features/specialist/SpecialistEditor.tsx`

The specialist editor shares `RoomWeeklyGrid`, `RuleListClient`, `RuleDialog`, and `computePeriodRows` logic with the existing schedule editor. The key difference is the teacher sidebar and specialist-scoped entries.

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TeacherSidebar } from './TeacherSidebar'
import { SpecialistAssignDialog } from './SpecialistAssignDialog'
import { RoomWeeklyGrid } from '@/features/schedule/RoomWeeklyGrid'
import type { RoomEntryData, GridPeriodRow } from '@/features/schedule/RoomWeeklyGrid'
import { RuleListClient, type RuleItem } from '@/features/schedule/RuleListClient'
import { RuleDialog, type RulePrefill } from '@/features/schedule/RuleDialog'
import { cancelScheduleEntry, deleteScheduleRule } from '@/features/schedule/actions'
import type { SpecialRoom, ClassGroup, Grade, Subject, Teacher, Period } from '@/generated/prisma'

interface TeacherData {
  id: string
  name: string
  subjects: { name: string }[]
}

interface AllPeriodDetailed {
  id: string
  number: number
  gradeNumber: number
  startTime: string
  endTime: string
  label: string | null
}

interface ClassData {
  id: string
  number: number
  grade: { number: number }
}

interface RoomData {
  id: string
  name: string
}

interface Props {
  termId: string
  termStartDate: string
  teachers: TeacherData[]
  allPeriods: AllPeriodDetailed[]
  classes: ClassData[]
  rooms: RoomData[]
  weekDates: string[]
  entries: RoomEntryData[]
  rules: RuleItem[]
  fullRooms: SpecialRoom[]
  fullClasses: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  allTeachers: Teacher[]
  rawPeriods: Period[]
  headerButton?: React.ReactNode
}

function computePeriodRows(allPeriods: AllPeriodDetailed[], gradeNumbers: number[]): GridPeriodRow[] {
  let relevant: AllPeriodDetailed[]
  if (gradeNumbers.length === 0) {
    const grade0 = allPeriods.filter(p => p.gradeNumber === 0)
    relevant = grade0.length > 0 ? grade0 : allPeriods.filter(p => p.gradeNumber === 1)
  } else {
    relevant = allPeriods.filter(p => p.gradeNumber === 0 || gradeNumbers.includes(p.gradeNumber))
    if (relevant.length === 0) {
      const grade0 = allPeriods.filter(p => p.gradeNumber === 0)
      relevant = grade0.length > 0 ? grade0 : allPeriods.filter(p => p.gradeNumber === 1)
    }
  }

  const byNumber = new Map<number, AllPeriodDetailed[]>()
  for (const p of relevant) {
    const arr = byNumber.get(p.number) ?? []
    arr.push(p)
    byNumber.set(p.number, arr)
  }

  const rows: GridPeriodRow[] = []
  for (const [number, periods] of byNumber) {
    const byTime = new Map<string, AllPeriodDetailed[]>()
    for (const p of periods) {
      const key = `${p.startTime}-${p.endTime}`
      const arr = byTime.get(key) ?? []
      arr.push(p)
      byTime.set(key, arr)
    }
    const hasMultipleTimes = byTime.size > 1
    for (const timePeriods of byTime.values()) {
      const first = timePeriods[0]
      let gradeHint: string | null = null
      if (hasMultipleTimes) {
        const grades = timePeriods.map(p => p.gradeNumber).filter(g => g !== 0).sort((a, b) => a - b)
        if (grades.length > 0) gradeHint = grades.map(g => `${g}학년`).join('·')
      }
      rows.push({ number, label: first.label ?? null, startTime: first.startTime, endTime: first.endTime, periodIds: timePeriods.map(p => p.id), gradeHint })
    }
  }
  rows.sort((a, b) => a.startTime.localeCompare(b.startTime))
  return rows
}

export function SpecialistEditor({
  termId, termStartDate, teachers, allPeriods, classes, rooms, weekDates, entries, rules,
  fullRooms, fullClasses, subjects, allTeachers, rawPeriods, headerButton,
}: Props) {
  const router = useRouter()
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(teachers[0]?.id ?? null)
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [pickerCell, setPickerCell] = useState<{ date: string; periodId: string } | null>(null)
  const [ruleQueue, setRuleQueue] = useState<RulePrefill[]>([])
  const [, startTransition] = useTransition()

  const gradeNumbers = [...new Set(classes.map(c => c.grade.number))].sort((a, b) => a - b)
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId) ?? null

  const gridPeriods = selectedGrade !== null
    ? computePeriodRows(allPeriods, [selectedGrade])
    : computePeriodRows(allPeriods, [])

  const filteredEntries = entries.filter(e =>
    (selectedTeacherId === null || e.teacherId === selectedTeacherId) &&
    (selectedGrade === null || e.classGroup.grade.number === selectedGrade)
  )

  const assignmentCounts: Record<string, number> = {}
  for (const entry of entries) {
    if (entry.teacherId) {
      assignmentCounts[entry.teacherId] = (assignmentCounts[entry.teacherId] ?? 0) + 1
    }
  }

  function handleEntryAction(entryId: string, sourceRuleId: string | null, action: 'cancel' | 'deleteRule') {
    if (action === 'deleteRule') {
      if (!sourceRuleId) return
      if (!window.confirm('이 배정 규칙을 삭제하면 모든 주의 해당 배정이 사라집니다. 계속할까요?')) return
      startTransition(async () => { await deleteScheduleRule(sourceRuleId); router.refresh() })
    } else {
      startTransition(async () => { await cancelScheduleEntry(entryId); router.refresh() })
    }
  }

  function handleAssigned(details: { teacherId: string; classIds: string[]; periodId: string; date: string }) {
    setPickerCell(null)
    router.refresh()
    const d = new Date(details.date)
    const utcDay = d.getUTCDay()
    const repeatDay = utcDay === 0 ? 6 : utcDay - 1
    setRuleQueue(details.classIds.map(classId => ({
      classId,
      periodId: details.periodId,
      startDate: termStartDate,
      repeatDay,
      teacherId: details.teacherId,
    })))
  }

  // RoomEntryData needs teacherId — the grid's entry data must include it
  // We pass entries that include teacherId via the page (see Task 9 mapping)
  const showRoom = true  // always show room in specialist view (room is optional info)

  return (
    <>
    {ruleQueue.length > 0 && (
      <RuleDialog
        termId={termId}
        rooms={fullRooms}
        classes={fullClasses}
        subjects={subjects}
        teachers={allTeachers}
        periods={rawPeriods}
        ruleType="SPECIALIST"
        prefill={ruleQueue[0]}
        forcedOpen={true}
        onForcedClose={() => setRuleQueue(q => q.slice(1))}
        onSaved={() => { setRuleQueue(q => q.slice(1)); router.refresh() }}
      />
    )}

    <div className="flex items-center justify-end gap-2 mb-3">
      {headerButton}
    </div>

    <div className="flex border rounded-lg overflow-hidden min-h-80">
      <TeacherSidebar
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onSelect={setSelectedTeacherId}
        assignmentCounts={assignmentCounts}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Grade tabs */}
        <div className="flex gap-0 border-b bg-gray-50 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setSelectedGrade(null)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-r transition-colors ${
              selectedGrade === null
                ? 'bg-white text-blue-700 font-medium border-b-2 border-b-blue-600 -mb-px'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            모든 학년
          </button>
          {gradeNumbers.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGrade(g)}
              className={`px-3 py-2 text-sm whitespace-nowrap border-r transition-colors ${
                selectedGrade === g
                  ? 'bg-white text-blue-700 font-medium border-b-2 border-b-blue-600 -mb-px'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {g}학년
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          <RoomWeeklyGrid
            weekDates={weekDates}
            periods={gridPeriods}
            entries={filteredEntries}
            onCellClick={(date, periodId) => {
              if (!selectedTeacherId) return  // require teacher selection
              setPickerCell({ date, periodId })
            }}
            onEntryAction={handleEntryAction}
            showRoom={showRoom}
            rooms={rooms}
            readOnly={!selectedTeacherId}
          />
        </div>
      </div>
    </div>

    {pickerCell && selectedTeacherId && selectedTeacher && (
      <SpecialistAssignDialog
        open={true}
        onClose={() => setPickerCell(null)}
        termId={termId}
        teacherId={selectedTeacherId}
        teacherName={selectedTeacher.name}
        periodId={pickerCell.periodId}
        date={pickerCell.date}
        classes={selectedGrade !== null ? classes.filter(c => c.grade.number === selectedGrade) : classes}
        availableRooms={rooms}
        onAssigned={details => handleAssigned({ ...details, teacherId: selectedTeacherId })}
      />
    )}

    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">전담 배정 규칙 목록</h2>
      <RuleListClient
        termId={termId}
        rooms={fullRooms}
        classes={fullClasses}
        subjects={subjects}
        teachers={allTeachers}
        periods={rawPeriods}
        rules={rules.filter(rule =>
          (selectedTeacherId === null || rule.teacherId === selectedTeacherId) &&
          (selectedGrade === null || rule.classGradeNumber === selectedGrade)
        )}
      />
    </div>
    </>
  )
}
```

- [ ] **Step 2: Note on RoomEntryData**

`RoomEntryData` currently does not include `teacherId`. The specialist editor needs it to:
1. Filter entries by teacher (`e.teacherId === selectedTeacherId`)
2. Count assignments per teacher

Add `teacherId: string | null` to `RoomEntryData` in `src/features/schedule/RoomWeeklyGrid.tsx`:

```ts
export interface RoomEntryData {
  id: string
  date: string
  periodId: string
  roomId: string | null
  sourceRuleId: string | null
  classGroup: { number: number; grade: { number: number } }
  status: string
  teacherId: string | null   // ← add this
}
```

- [ ] **Step 3: Add teacherId to RuleItem in RuleListClient**

In `src/features/schedule/RuleListClient.tsx`, add `teacherId: string | null` to `RuleItem`:

```ts
export interface RuleItem {
  id: string
  roomName: string
  periodNumber: number
  classGradeNumber: number
  classNumber: number
  subjectName: string | null
  teacherName: string | null
  teacherId: string | null   // ← add this
  startDate: string
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  edit: EditRuleData
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: errors in page.tsx files that don't yet pass `teacherId` in the rule/entry mappings — fixed in Task 9.

- [ ] **Step 5: Commit**

```bash
git add src/features/specialist/SpecialistEditor.tsx src/features/schedule/RoomWeeklyGrid.tsx src/features/schedule/RuleListClient.tsx
git commit -m "feat: SpecialistEditor component with teacher sidebar and grade tabs"
```

---

### Task 9: Specialist page + layout

**Files:**
- Create: `src/app/(specialist)/layout.tsx`
- Create: `src/app/(specialist)/specialist/page.tsx`

- [ ] **Step 1: Create layout**

```tsx
// src/app/(specialist)/layout.tsx
export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>
}
```

- [ ] **Step 2: Create specialist page**

```tsx
// src/app/(specialist)/specialist/page.tsx
export const dynamic = 'force-dynamic'

import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods, listAllPeriodsDetailed } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listEntriesForWeek, listScheduleRules } from '@/features/schedule/actions'
import { listGrades } from '@/features/classes/actions'
import { WeekNavigator } from '@/features/schedule/WeekNavigator'
import { SpecialistEditor } from '@/features/specialist/SpecialistEditor'
import { RuleDialog } from '@/features/schedule/RuleDialog'
import { Button } from '@/components/ui/button'

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

export default async function SpecialistPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams

  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return <div className="text-center py-16 text-gray-500">학기를 등록해 주세요.</div>
  }

  const refDate = week ? new Date(week) : new Date()
  const weekDates = getWeekDates(refDate)

  const [rooms, periods, allPeriods, subjects, teachers, grades, entriesResult, rulesResult] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listAllPeriodsDetailed(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listEntriesForWeek(activeTerm.id, weekDates[0], 'SPECIALIST'),
    listScheduleRules(activeTerm.id, 'SPECIALIST'),
  ])

  const fullClasses = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))
  const classes = fullClasses.map(c => ({ id: c.id, number: c.number, grade: { number: c.grade.number } }))

  const rawEntries = entriesResult.success ? entriesResult.data : []
  const entries = rawEntries.map(e => ({
    id: e.id,
    date: new Date(e.date).toISOString(),
    periodId: e.periodId,
    roomId: e.roomId,
    sourceRuleId: e.sourceRuleId,
    classGroup: { number: e.classGroup.number, grade: { number: e.classGroup.grade.number } },
    status: e.status,
    teacherId: e.teacherId,
  }))

  const rules = rulesResult.success ? rulesResult.data : []

  // Specialist teachers: only teachers with subjects (전담교사)
  const specialistTeachers = teachers
    .filter(t => t.subjects && t.subjects.length > 0)
    .map(t => ({ id: t.id, name: t.name, subjects: (t.subjects ?? []).map(s => ({ name: s.subject.name })) }))

  const prevWeekDate = new Date(weekDates[0])
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const prevWeek = prevWeekDate.toISOString().slice(0, 10)

  const nextWeekDate = new Date(weekDates[0])
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const nextWeek = nextWeekDate.toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">전담 시간표</h1>

      <WeekNavigator weekDates={weekDates} prevWeek={prevWeek} nextWeek={nextWeek} />

      <SpecialistEditor
        termId={activeTerm.id}
        termStartDate={new Date(activeTerm.startDate).toISOString().slice(0, 10)}
        teachers={specialistTeachers}
        allPeriods={allPeriods.map(p => ({
          id: p.id, number: p.number, gradeNumber: p.gradeNumber,
          startTime: p.startTime, endTime: p.endTime, label: p.label ?? null,
        }))}
        classes={classes}
        rooms={rooms.map(r => ({ id: r.id, name: r.name }))}
        weekDates={weekDates}
        entries={entries}
        rules={rules.map(rule => ({
          id: rule.id,
          roomName: rule.room?.name ?? '일반 교실',
          periodNumber: rule.period.number,
          classGradeNumber: rule.classGroup.grade.number,
          classNumber: rule.classGroup.number,
          subjectName: rule.subject?.name ?? null,
          teacherName: rule.teacher?.name ?? null,
          teacherId: rule.teacherId,
          startDate: new Date(rule.startDate).toISOString().slice(0, 10),
          repeatInterval: rule.repeatInterval,
          repeatUnit: rule.repeatUnit as 'DAY' | 'WEEK' | 'MONTH',
          edit: {
            id: rule.id,
            roomId: rule.roomId ?? undefined,
            classId: rule.classId,
            subjectId: rule.subjectId ?? null,
            teacherId: rule.teacherId ?? null,
            periodId: rule.periodId,
            startDate: new Date(rule.startDate).toISOString().slice(0, 10),
            repeatInterval: rule.repeatInterval,
            repeatUnit: rule.repeatUnit as 'DAY' | 'WEEK' | 'MONTH',
            repeatDays: rule.repeatDays as number[],
            endType: rule.endType as 'NONE' | 'DATE' | 'COUNT',
            endDate: rule.endDate ? new Date(rule.endDate).toISOString().slice(0, 10) : null,
            endCount: rule.endCount ?? null,
          },
        }))}
        fullRooms={rooms}
        fullClasses={fullClasses}
        subjects={subjects}
        allTeachers={teachers}
        rawPeriods={periods}
        headerButton={
          <RuleDialog
            termId={activeTerm.id}
            rooms={rooms}
            classes={fullClasses}
            subjects={subjects}
            teachers={teachers}
            periods={periods}
            ruleType="SPECIALIST"
            trigger={<Button variant="outline">전담 배정 규칙 추가</Button>}
          />
        }
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(specialist)/layout.tsx src/app/(specialist)/specialist/page.tsx
git commit -m "feat: specialist timetable page with full editor"
```

---

### Task 10: Schedule page — filter to ROOM entries only + fix teacherId in entries

**Files:**
- Modify: `src/app/(schedule)/schedule/page.tsx`

- [ ] **Step 1: Filter entries and rules to ROOM type**

In `Promise.all`, change:
```ts
listEntriesForWeek(activeTerm.id, weekDates[0], 'ROOM'),
listScheduleRules(activeTerm.id, 'ROOM'),
```

- [ ] **Step 2: Add teacherId to entry mapping**

In the `entries` mapping:
```ts
const entries = rawEntries.map(e => ({
  id: e.id,
  date: new Date(e.date).toISOString(),
  periodId: e.periodId,
  roomId: e.roomId,
  sourceRuleId: e.sourceRuleId,
  classGroup: { number: e.classGroup.number, grade: { number: e.classGroup.grade.number } },
  status: e.status,
  teacherId: e.teacherId,   // ← add this
}))
```

- [ ] **Step 3: Add teacherId to rule mapping**

In the `rules` mapping (in both ScheduleEditor props and RuleListClient props — they're combined now):
```ts
teacherId: rule.teacherId,   // ← add to each rule object
```

Also update `roomName` to handle nullable roomId:
```ts
roomName: rule.room?.name ?? '일반 교실',
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(schedule)/schedule/page.tsx
git commit -m "fix: schedule page filters ROOM-type entries and passes teacherId"
```

---

### Task 11: Nav rename + new link + calendar fix

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(calendar)/calendar/page.tsx`

- [ ] **Step 1: Update nav in layout.tsx**

Change the nav links:
```tsx
<div className="text-xs text-gray-400 mt-3 mb-1 px-2">시간표</div>
<Link href="/schedule" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">특별실 시간표</Link>
<Link href="/specialist" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">전담 시간표</Link>
<Link href="/calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">달력형 보기</Link>
<Link href="/list" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">목록형 보기</Link>
```

Also update the schedule page's `<h1>`:
In `src/app/(schedule)/schedule/page.tsx`, change:
```tsx
<h1 className="text-2xl font-bold">주간 시간표 편집기</h1>
```
to:
```tsx
<h1 className="text-2xl font-bold">특별실 시간표</h1>
```

- [ ] **Step 2: Fix calendar page — handle null roomId**

In `src/app/(calendar)/calendar/page.tsx`, the entries query includes `room: true`. With nullable roomId this becomes `room: true` on an optional relation — Prisma will return `room: null` when roomId is null. Ensure the `CalendarView` component handles `entry.room` being null.

Open `src/features/calendar-view/CalendarView.tsx` and find the chip format line. Update it to handle null room:

Find:
```ts
`[${e.period.number}]${e.room.name}(${e.classGroup.grade.number}-${e.classGroup.number})`
```
Replace with:
```ts
`[${e.period.number}]${e.room?.name ?? e.teacher?.name ?? '전담'}(${e.classGroup.grade.number}-${e.classGroup.number})`
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/(schedule)/schedule/page.tsx src/features/calendar-view/CalendarView.tsx
git commit -m "feat: rename nav to 특별실/전담 시간표, fix calendar chip for null room"
```

---

### Task 12: EditRuleData — make roomId optional

**Files:**
- Modify: `src/features/schedule/RuleDialog.tsx`

The `EditRuleData` interface currently requires `roomId: string`. Specialist rules have `roomId: string | undefined`. Update the interface so existing code doesn't break.

- [ ] **Step 1: Update EditRuleData**

```ts
export interface EditRuleData {
  id: string
  roomId: string | undefined   // ← was string, now optional (specialist rules have no room)
  classId: string
  subjectId: string | null
  teacherId: string | null
  periodId: string
  startDate: string
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  repeatDays: number[]
  endType: 'NONE' | 'DATE' | 'COUNT'
  endDate: string | null
  endCount: number | null
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/schedule/RuleDialog.tsx
git commit -m "fix: EditRuleData.roomId optional for specialist rules"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ roomId nullable (Task 1)
- ✅ Specialist editor with teacher sidebar (Tasks 6–8)
- ✅ Grade tabs (Task 8)
- ✅ Optional room assignment (Task 7)
- ✅ Conflict detection for null room (Task 2)
- ✅ Rule creation with SPECIALIST type (Tasks 5, 7)
- ✅ Nav rename 특별실/전담 시간표 (Task 11)
- ✅ Calendar view handles null room (Task 11)
- ✅ ROOM-type filter on schedule page (Task 10)
- ✅ Post-assignment RuleDialog (Task 8 — via ruleQueue + RuleDialog forcedOpen)

**2. Placeholder scan:** None found.

**3. Type consistency:**
- `RoomEntryData.teacherId: string | null` — added in Task 8, used in SpecialistEditor filter ✅
- `RuleItem.teacherId: string | null` — added in Task 8, used in SpecialistEditor rule filter ✅
- `date_periodId_classId` upsert key — used in Task 3 quickAssignClass and Task 7 quickAssignSpecialist ✅
- `checkConflict({ room: null })` — engine handles in Task 2 ✅
- `EditRuleData.roomId: string | undefined` — Task 12 fixes this ✅
