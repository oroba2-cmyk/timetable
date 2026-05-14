# Plan C: 달력형·목록형 보기 + 단발 예약 + 엑셀 내보내기

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 월별 달력 보기, 목록형 보기(특별실 사용 일수 집계 포함), 단발성 예약, 엑셀 내보내기를 완성하여 시스템을 MVP 완료 상태로 마무리한다.

**Architecture:** 달력·목록 뷰는 서버 컴포넌트로 DB에서 직접 데이터를 가져온다. 단발 예약은 Conflict Checker를 재사용한다. 엑셀 내보내기는 ExcelJS를 사용하는 API Route로 구현한다.

**Tech Stack:** ExcelJS, Next.js Server Components, Next.js API Route

**전제 조건:** Plan A + Plan B 완료

---

## File Map

| 파일 | 역할 |
|------|------|
| `src/features/reservations/actions.ts` | 단발 예약 Server Actions |
| `src/features/reservations/ReservationForm.tsx` | 단발 예약 폼 다이얼로그 |
| `src/features/calendar-view/CalendarView.tsx` | 월별 달력 보기 컴포넌트 |
| `src/features/list-view/ListView.tsx` | 목록형 보기 + 사용 일수 집계 |
| `src/lib/excel/exporter.ts` | ExcelJS 내보내기 로직 |
| `src/app/(calendar)/page.tsx` | 달력형 보기 페이지 |
| `src/app/(list)/page.tsx` | 목록형 보기 페이지 |
| `src/app/api/export/route.ts` | 엑셀 내보내기 API Route |

---

## Task 1: ExcelJS 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: ExcelJS 설치**

```bash
npm install exceljs
```

- [ ] **Step 2: 커밋**

```bash
git add package.json package-lock.json
git commit -m "chore: install ExcelJS"
```

---

## Task 2: 단발성 예약 CRUD

**Files:**
- Create: `src/features/reservations/actions.ts`
- Create: `src/features/reservations/ReservationForm.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/reservations/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { Reservation } from '@prisma/client'
import { checkConflict } from '@/engine/conflict'

export async function listReservations(termId: string, date?: string) {
  return prisma.reservation.findMany({
    where: {
      termId,
      ...(date ? { date: new Date(date) } : {}),
    },
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

export async function createReservation(data: {
  termId: string
  date: string
  periodId: string
  roomId: string
  classId: string
  subjectId?: string
  teacherId?: string
  reason?: string
  force?: boolean
}): Promise<ActionResult<{ reservation: Reservation; conflicts: { type: string; message: string }[] }>> {
  try {
    const [room, existing, roomUnavail, teacherUnavail] = await Promise.all([
      prisma.specialRoom.findUnique({ where: { id: data.roomId } }),
      prisma.scheduleEntry.findMany({ where: { termId: data.termId } }),
      prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } }),
      data.teacherId
        ? prisma.teacherUnavailability.findMany({ where: { teacherId: data.teacherId } })
        : Promise.resolve([]),
    ])

    if (!room) return { success: false, error: '특별실을 찾을 수 없습니다.' }

    const conflictResult = checkConflict({
      entry: {
        date: new Date(data.date),
        periodId: data.periodId,
        roomId: data.roomId,
        classId: data.classId,
        teacherId: data.teacherId || null,
      },
      existing,
      room: { id: room.id, capacity: room.capacity },
      roomUnavailabilities: roomUnavail.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
      teacherUnavailabilities: teacherUnavail.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
    })

    if (conflictResult.hasConflict && !data.force) {
      return { success: false, error: `충돌: ${conflictResult.conflicts.map(c => c.message).join(', ')}` }
    }

    const reservation = await prisma.reservation.create({
      data: {
        termId: data.termId,
        date: new Date(data.date),
        periodId: data.periodId,
        roomId: data.roomId,
        classId: data.classId,
        subjectId: data.subjectId || null,
        teacherId: data.teacherId || null,
        reason: data.reason || null,
      },
    })

    // 예약도 ScheduleEntry로 등록하여 충돌 검사에 포함
    await prisma.scheduleEntry.upsert({
      where: {
        date_periodId_roomId_classId: {
          date: new Date(data.date),
          periodId: data.periodId,
          roomId: data.roomId,
          classId: data.classId,
        },
      },
      create: {
        termId: data.termId,
        date: new Date(data.date),
        periodId: data.periodId,
        roomId: data.roomId,
        classId: data.classId,
        subjectId: data.subjectId || null,
        teacherId: data.teacherId || null,
        source: 'RESERVATION',
        status: conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL',
      },
      update: {
        source: 'RESERVATION',
        status: conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL',
      },
    })

    revalidatePath('/calendar')
    revalidatePath('/list')
    return { success: true, data: { reservation, conflicts: conflictResult.conflicts } }
  } catch (e) {
    console.error(e)
    return { success: false, error: '예약 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteReservation(id: string): Promise<ActionResult> {
  try {
    const reservation = await prisma.reservation.findUnique({ where: { id } })
    if (reservation) {
      await prisma.scheduleEntry.deleteMany({
        where: {
          date: reservation.date,
          periodId: reservation.periodId,
          roomId: reservation.roomId,
          classId: reservation.classId,
          source: 'RESERVATION',
        },
      })
    }
    await prisma.reservation.delete({ where: { id } })
    revalidatePath('/calendar')
    revalidatePath('/list')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '예약 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: ReservationForm 컴포넌트 작성**

```typescript
// src/features/reservations/ReservationForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createReservation } from './actions'
import { ClassGroup, Grade, Period, SpecialRoom, Subject, Teacher } from '@prisma/client'

interface Props {
  termId: string
  defaultDate?: string
  rooms: SpecialRoom[]
  classes: (ClassGroup & { grade: Grade })[]
  subjects: Subject[]
  teachers: Teacher[]
  periods: Period[]
  trigger: React.ReactNode
}

export function ReservationForm({ termId, defaultDate, rooms, classes, subjects, teachers, periods, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const result = await createReservation({
      termId,
      date: fd.get('date') as string,
      periodId: fd.get('periodId') as string,
      roomId: fd.get('roomId') as string,
      classId: fd.get('classId') as string,
      subjectId: (fd.get('subjectId') as string) || undefined,
      teacherId: (fd.get('teacherId') as string) || undefined,
      reason: (fd.get('reason') as string) || undefined,
    })

    if (result.success) {
      const { conflicts } = result.data
      setOpen(false)
      setError('')
      if (conflicts.length > 0) {
        alert(`예약 완료 (충돌 ${conflicts.length}건 강제 등록됨)`)
      }
    } else {
      const isConflict = result.error.startsWith('충돌:')
      if (isConflict) {
        const force = confirm(`${result.error}\n\n강제 예약하시겠습니까?`)
        if (force) {
          const forceResult = await createReservation({
            termId,
            date: fd.get('date') as string,
            periodId: fd.get('periodId') as string,
            roomId: fd.get('roomId') as string,
            classId: fd.get('classId') as string,
            subjectId: (fd.get('subjectId') as string) || undefined,
            teacherId: (fd.get('teacherId') as string) || undefined,
            reason: (fd.get('reason') as string) || undefined,
            force: true,
          })
          if (forceResult.success) { setOpen(false); setError('') }
          else setError(forceResult.error)
        }
      } else {
        setError(result.error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>단발성 예약</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">날짜</Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
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
          </div>
          <div>
            <Label htmlFor="reason">사유</Label>
            <Textarea id="reason" name="reason" rows={2} placeholder="예약 사유를 입력하세요" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">예약 등록</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/features/reservations/
git commit -m "feat: add single reservation with conflict check"
```

---

## Task 3: 달력형 보기

**Files:**
- Create: `src/features/calendar-view/CalendarView.tsx`
- Create: `src/app/(calendar)/page.tsx`

- [ ] **Step 1: CalendarView 컴포넌트 작성**

```typescript
// src/features/calendar-view/CalendarView.tsx
import { ScheduleEntry, AcademicEvent, SpecialRoom } from '@prisma/client'

type EntryWithRelations = ScheduleEntry & {
  room: SpecialRoom
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
  period: { number: number }
}

interface Props {
  year: number
  month: number   // 1-12
  entries: EntryWithRelations[]
  academicEvents: AcademicEvent[]
  roomFilter: string | null
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0=일, 1=월, ..., 6=토 → 월요일 시작 기준 변환
  const d = new Date(year, month - 1, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function CalendarView({ year, month, entries, academicEvents, roomFilter }: Props) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  const DAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']

  function getDateStr(day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getEntriesForDay(day: number): EntryWithRelations[] {
    const dateStr = getDateStr(day)
    return entries.filter(e => {
      const entryDate = new Date(e.date).toISOString().slice(0, 10)
      return entryDate === dateStr && e.status !== 'EXCEPTION_CANCELLED' &&
        (!roomFilter || e.roomId === roomFilter)
    })
  }

  function getAcademicEventForDay(day: number): AcademicEvent | undefined {
    const dateStr = getDateStr(day)
    return academicEvents.find(e => new Date(e.date).toISOString().slice(0, 10) === dateStr)
  }

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // 7의 배수로 맞추기
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-sm font-medium bg-gray-50 border-b">
        {DAY_HEADERS.map(h => (
          <div key={h} className="py-2 border-r last:border-r-0">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="border-b border-r min-h-24 bg-gray-50" />

          const dayEntries = getEntriesForDay(day)
          const event = getAcademicEventForDay(day)
          const isWeekend = (idx + firstDay) % 7 >= 5

          return (
            <div key={day} className={`border-b border-r min-h-24 p-1
              ${isWeekend ? 'bg-gray-50' : 'bg-white'}
              ${event ? 'bg-yellow-50' : ''}`}
            >
              <div className="text-sm font-medium mb-1">{day}</div>
              {event && (
                <div className="text-xs text-yellow-700 bg-yellow-100 rounded px-1 mb-1">
                  {event.eventType}
                </div>
              )}
              <div className="space-y-0.5">
                {dayEntries.slice(0, 3).map(e => (
                  <div key={e.id}
                    className={`text-xs rounded px-1 truncate
                      ${e.status === 'FORCE_ASSIGNED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
                  >
                    {e.period.number}교시 {e.room.name} {e.classGroup.grade.number}-{e.classGroup.number}
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="text-xs text-gray-400">+{dayEntries.length - 3}건 더</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 달력형 보기 페이지 작성**

```typescript
// src/app/(calendar)/page.tsx
import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listPeriods } from '@/features/periods/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listGrades } from '@/features/classes/actions'
import { listAcademicEvents } from '@/features/academic-calendar/actions'
import { prisma } from '@/lib/db/client'
import { CalendarView } from '@/features/calendar-view/CalendarView'
import { ReservationForm } from '@/features/reservations/ReservationForm'
import { Button } from '@/components/ui/button'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; room?: string }
}) {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <div className="p-8"><p className="text-gray-500">먼저 학기를 등록해 주세요.</p></div>

  const now = new Date()
  const year = Number(searchParams.year || now.getFullYear())
  const month = Number(searchParams.month || now.getMonth() + 1)
  const roomFilter = searchParams.room || null

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  const [rooms, periods, subjects, teachers, grades, academicEvents, entries] = await Promise.all([
    listRooms(activeTerm.id),
    listPeriods(activeTerm.id),
    listSubjects(activeTerm.id),
    listTeachers(activeTerm.id),
    listGrades(activeTerm.id),
    listAcademicEvents(activeTerm.id),
    prisma.scheduleEntry.findMany({
      where: { termId: activeTerm.id, date: { gte: monthStart, lte: monthEnd } },
      include: {
        room: true,
        classGroup: { include: { grade: true } },
        subject: true,
        teacher: true,
        period: true,
      },
    }),
  ])

  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))

  const prevMonth = month === 1 ? `?year=${year - 1}&month=12` : `?year=${year}&month=${month - 1}`
  const nextMonth = month === 12 ? `?year=${year + 1}&month=1` : `?year=${year}&month=${month + 1}`

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">달력형 보기</h1>
        <ReservationForm
          termId={activeTerm.id}
          rooms={rooms}
          classes={classes}
          subjects={subjects}
          teachers={teachers as any}
          periods={periods}
          trigger={<Button>+ 단발 예약</Button>}
        />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <a href={prevMonth}><Button variant="outline" size="sm">← 이전 달</Button></a>
        <span className="font-medium">{year}년 {month}월</span>
        <a href={nextMonth}><Button variant="outline" size="sm">다음 달 →</Button></a>

        <select className="border rounded px-2 py-1 text-sm ml-auto"
          onChange={e => { window.location.href = `/calendar?year=${year}&month=${month}&room=${e.target.value}` }}>
          <option value="">전체 특별실</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id} selected={roomFilter === r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <CalendarView
          year={year}
          month={month}
          entries={entries as any}
          academicEvents={academicEvents}
          roomFilter={roomFilter}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 동작 확인 후 커밋**

```bash
npm run dev
```

`http://localhost:3000/calendar` → 월별 달력에 배정 표시, 학사일정 표시, 이전·다음 달 이동 확인.

```bash
git add src/features/calendar-view/ src/app/\(calendar\)/
git commit -m "feat: add calendar view with academic event overlay"
```

---

## Task 4: 목록형 보기 + 사용 일수 집계

**Files:**
- Create: `src/features/list-view/ListView.tsx`
- Create: `src/app/(list)/page.tsx`

- [ ] **Step 1: ListView 컴포넌트 작성**

```typescript
// src/features/list-view/ListView.tsx
import { ScheduleEntry, AcademicEvent, SpecialRoom } from '@prisma/client'

type EntryWithRelations = ScheduleEntry & {
  room: SpecialRoom
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
  period: { number: number; startTime: string; endTime: string }
}

interface UsageStat {
  roomId: string
  roomName: string
  totalDays: number       // 특별실 사용 총 일수 (동일 날짜 중복 제거)
  totalSessions: number   // 총 사용 교시 수
}

function computeUsageStats(entries: EntryWithRelations[]): UsageStat[] {
  const roomMap = new Map<string, { name: string; days: Set<string>; sessions: number }>()

  for (const e of entries) {
    if (e.status === 'EXCEPTION_CANCELLED') continue
    if (!roomMap.has(e.roomId)) {
      roomMap.set(e.roomId, { name: e.room.name, days: new Set(), sessions: 0 })
    }
    const stat = roomMap.get(e.roomId)!
    stat.days.add(new Date(e.date).toISOString().slice(0, 10))
    stat.sessions++
  }

  return Array.from(roomMap.entries()).map(([roomId, s]) => ({
    roomId,
    roomName: s.name,
    totalDays: s.days.size,
    totalSessions: s.sessions,
  }))
}

interface Props {
  entries: EntryWithRelations[]
  academicEvents: AcademicEvent[]
  termStart: Date
  termEnd: Date
  roomFilter: string | null
  classFilter: string | null
}

export function ListView({ entries, academicEvents, termStart, termEnd, roomFilter, classFilter }: Props) {
  const filtered = entries.filter(e => {
    if (e.status === 'EXCEPTION_CANCELLED') return false
    if (roomFilter && e.roomId !== roomFilter) return false
    if (classFilter && e.classId !== classFilter) return false
    return true
  })

  const stats = computeUsageStats(filtered)

  // 학사일정 기반 수업 가능일 계산
  const blockedDates = new Set(
    academicEvents
      .filter(ev => !ev.allowException)
      .map(ev => new Date(ev.date).toISOString().slice(0, 10))
  )

  let schoolDays = 0
  const cur = new Date(termStart)
  while (cur <= termEnd) {
    const dayOfWeek = cur.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
    const dateStr = cur.toISOString().slice(0, 10)
    if (isWeekday && !blockedDates.has(dateStr)) schoolDays++
    cur.setDate(cur.getDate() + 1)
  }

  return (
    <div className="space-y-6">
      {/* 사용 통계 */}
      <div>
        <h2 className="font-semibold mb-2">특별실 사용 현황</h2>
        <div className="text-sm text-gray-500 mb-2">학기 총 수업일: {schoolDays}일</div>
        <div className="grid grid-cols-1 gap-2">
          {stats.map(s => (
            <div key={s.roomId} className="bg-white rounded-lg p-4 shadow flex items-center gap-6">
              <span className="font-medium w-32">{s.roomName}</span>
              <span className="text-sm text-gray-600">사용 일수: <strong>{s.totalDays}일</strong></span>
              <span className="text-sm text-gray-600">총 교시: <strong>{s.totalSessions}회</strong></span>
              <div className="flex-1 h-2 bg-gray-100 rounded">
                <div
                  className="h-2 bg-blue-400 rounded"
                  style={{ width: `${Math.min((s.totalDays / schoolDays) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{schoolDays > 0 ? Math.round((s.totalDays / schoolDays) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 배정 목록 */}
      <div>
        <h2 className="font-semibold mb-2">배정 목록 ({filtered.length}건)</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 border-b">날짜</th>
                <th className="text-left p-3 border-b">교시</th>
                <th className="text-left p-3 border-b">특별실</th>
                <th className="text-left p-3 border-b">학급</th>
                <th className="text-left p-3 border-b">과목</th>
                <th className="text-left p-3 border-b">교사</th>
                <th className="text-left p-3 border-b">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(e.date).toLocaleDateString('ko-KR')}</td>
                  <td className="p-3">{e.period.number}교시</td>
                  <td className="p-3">{e.room.name}</td>
                  <td className="p-3">{e.classGroup.grade.number}학년 {e.classGroup.number}반</td>
                  <td className="p-3">{e.subject?.name ?? '-'}</td>
                  <td className="p-3">{e.teacher?.name ?? '-'}</td>
                  <td className="p-3">
                    {e.status === 'FORCE_ASSIGNED' && <span className="text-red-500">충돌</span>}
                    {e.status === 'NORMAL' && <span className="text-green-600">정상</span>}
                    {e.status === 'EXCEPTION_ALLOWED' && <span className="text-yellow-600">예외허용</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">배정 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 목록형 보기 페이지 작성**

```typescript
// src/app/(list)/page.tsx
import { listTerms } from '@/features/terms/actions'
import { listRooms } from '@/features/rooms/actions'
import { listGrades } from '@/features/classes/actions'
import { listAcademicEvents } from '@/features/academic-calendar/actions'
import { prisma } from '@/lib/db/client'
import { ListView } from '@/features/list-view/ListView'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function ListPage({
  searchParams,
}: {
  searchParams: { room?: string; class?: string; from?: string; to?: string }
}) {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <div className="p-8"><p className="text-gray-500">먼저 학기를 등록해 주세요.</p></div>

  const fromDate = searchParams.from ? new Date(searchParams.from) : activeTerm.startDate
  const toDate = searchParams.to ? new Date(searchParams.to) : activeTerm.endDate

  const [rooms, grades, academicEvents, entries] = await Promise.all([
    listRooms(activeTerm.id),
    listGrades(activeTerm.id),
    listAcademicEvents(activeTerm.id),
    prisma.scheduleEntry.findMany({
      where: {
        termId: activeTerm.id,
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        room: true,
        classGroup: { include: { grade: true } },
        subject: true,
        teacher: true,
        period: true,
      },
      orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
    }),
  ])

  const classes = grades.flatMap(g => g.classGroups.map(c => ({ ...c, grade: g })))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">목록형 보기</h1>
        <Link href={`/api/export?termId=${activeTerm.id}&from=${fromDate.toISOString().slice(0,10)}&to=${toDate.toISOString().slice(0,10)}${searchParams.room ? `&room=${searchParams.room}` : ''}`}>
          <Button variant="outline">엑셀 내보내기</Button>
        </Link>
      </div>

      {/* 필터 */}
      <form className="flex gap-3 mb-6 flex-wrap">
        <input type="date" name="from" defaultValue={fromDate.toISOString().slice(0, 10)}
          className="border rounded px-2 py-1 text-sm" />
        <span className="self-center text-sm">~</span>
        <input type="date" name="to" defaultValue={toDate.toISOString().slice(0, 10)}
          className="border rounded px-2 py-1 text-sm" />
        <select name="room" className="border rounded px-2 py-1 text-sm">
          <option value="">전체 특별실</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id} selected={searchParams.room === r.id}>{r.name}</option>
          ))}
        </select>
        <select name="class" className="border rounded px-2 py-1 text-sm">
          <option value="">전체 학급</option>
          {classes.map(c => (
            <option key={c.id} value={c.id} selected={searchParams.class === c.id}>
              {c.grade.number}학년 {c.number}반
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">조회</Button>
      </form>

      <ListView
        entries={entries as any}
        academicEvents={academicEvents}
        termStart={activeTerm.startDate}
        termEnd={activeTerm.endDate}
        roomFilter={searchParams.room || null}
        classFilter={searchParams.class || null}
      />
    </div>
  )
}
```

- [ ] **Step 3: 동작 확인 후 커밋**

```bash
npm run dev
```

`http://localhost:3000/list` → 배정 목록 표시, 특별실 사용 일수 통계 표시, 필터 동작 확인.

```bash
git add src/features/list-view/ src/app/\(list\)/
git commit -m "feat: add list view with usage statistics"
```

---

## Task 5: 엑셀 내보내기

**Files:**
- Create: `src/lib/excel/exporter.ts`
- Create: `src/app/api/export/route.ts`

- [ ] **Step 1: ExcelJS 내보내기 로직 작성**

```typescript
// src/lib/excel/exporter.ts
import ExcelJS from 'exceljs'
import { ScheduleEntry, SpecialRoom } from '@prisma/client'

type EntryWithRelations = ScheduleEntry & {
  room: SpecialRoom
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
  period: { number: number; startTime: string; endTime: string }
}

export async function buildExcelBuffer(entries: EntryWithRelations[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '특별실 시간표 시스템'
  workbook.created = new Date()

  // 시트 1: 전체 목록
  const listSheet = workbook.addWorksheet('전체 배정 목록')
  listSheet.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '요일', key: 'weekday', width: 6 },
    { header: '교시', key: 'period', width: 8 },
    { header: '시작', key: 'startTime', width: 8 },
    { header: '종료', key: 'endTime', width: 8 },
    { header: '특별실', key: 'room', width: 14 },
    { header: '학년', key: 'grade', width: 6 },
    { header: '반', key: 'classNum', width: 6 },
    { header: '과목', key: 'subject', width: 12 },
    { header: '교사', key: 'teacher', width: 10 },
    { header: '상태', key: 'status', width: 10 },
  ]

  const header = listSheet.getRow(1)
  header.font = { bold: true }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
  const STATUS_LABELS: Record<string, string> = {
    NORMAL: '정상', FORCE_ASSIGNED: '충돌', EXCEPTION_CANCELLED: '취소', EXCEPTION_ALLOWED: '예외허용',
  }

  for (const e of entries) {
    if (e.status === 'EXCEPTION_CANCELLED') continue
    const date = new Date(e.date)
    listSheet.addRow({
      date: date.toLocaleDateString('ko-KR'),
      weekday: WEEKDAYS[date.getDay()],
      period: `${e.period.number}교시`,
      startTime: e.period.startTime,
      endTime: e.period.endTime,
      room: e.room.name,
      grade: `${e.classGroup.grade.number}학년`,
      classNum: `${e.classGroup.number}반`,
      subject: e.subject?.name ?? '',
      teacher: e.teacher?.name ?? '',
      status: STATUS_LABELS[e.status] ?? e.status,
    })
  }

  // 시트 2: 특별실별 집계
  const statsSheet = workbook.addWorksheet('특별실별 사용 현황')
  statsSheet.columns = [
    { header: '특별실', key: 'room', width: 14 },
    { header: '사용 일수', key: 'days', width: 12 },
    { header: '총 교시 수', key: 'sessions', width: 12 },
  ]
  const statsHeader = statsSheet.getRow(1)
  statsHeader.font = { bold: true }
  statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }

  const roomMap = new Map<string, { name: string; days: Set<string>; sessions: number }>()
  for (const e of entries) {
    if (e.status === 'EXCEPTION_CANCELLED') continue
    if (!roomMap.has(e.roomId)) roomMap.set(e.roomId, { name: e.room.name, days: new Set(), sessions: 0 })
    const s = roomMap.get(e.roomId)!
    s.days.add(new Date(e.date).toISOString().slice(0, 10))
    s.sessions++
  }
  for (const [, s] of roomMap) {
    statsSheet.addRow({ room: s.name, days: s.days.size, sessions: s.sessions })
  }

  // 시트 3: 특별실별 주간 시간표 (첫 번째 특별실)
  const rooms = [...new Set(entries.map(e => e.room.name))]
  for (const roomName of rooms.slice(0, 5)) { // 최대 5개 특별실
    const roomEntries = entries.filter(e => e.room.name === roomName && e.status !== 'EXCEPTION_CANCELLED')
    if (roomEntries.length === 0) continue

    const roomSheet = workbook.addWorksheet(roomName.slice(0, 30))
    roomSheet.addRow(['날짜', '요일', '교시', '학년', '반', '과목', '교사'])
    const rHeader = roomSheet.getRow(1)
    rHeader.font = { bold: true }
    rHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }

    for (const e of roomEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const date = new Date(e.date)
      roomSheet.addRow([
        date.toLocaleDateString('ko-KR'),
        WEEKDAYS[date.getDay()],
        `${e.period.number}교시`,
        `${e.classGroup.grade.number}학년`,
        `${e.classGroup.number}반`,
        e.subject?.name ?? '',
        e.teacher?.name ?? '',
      ])
    }

    roomSheet.columns.forEach(col => { col.width = Math.max(col.width ?? 10, 10) })
  }

  return workbook.xlsx.writeBuffer() as Promise<Buffer>
}
```

- [ ] **Step 2: API Route 작성**

```typescript
// src/app/api/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { buildExcelBuffer } from '@/lib/excel/exporter'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const termId = searchParams.get('termId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const roomId = searchParams.get('room')

  if (!termId) {
    return NextResponse.json({ error: 'termId required' }, { status: 400 })
  }

  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined

  const entries = await prisma.scheduleEntry.findMany({
    where: {
      termId,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(roomId ? { roomId } : {}),
    },
    include: {
      room: true,
      classGroup: { include: { grade: true } },
      subject: true,
      teacher: true,
      period: true,
    },
    orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
  })

  const buffer = await buildExcelBuffer(entries as any)
  const filename = `timetable_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 3: 동작 확인**

```bash
npm run dev
```

`http://localhost:3000/list` → "엑셀 내보내기" 버튼 클릭 → `.xlsx` 파일 다운로드 확인.  
파일 열어서 "전체 배정 목록", "특별실별 사용 현황", 특별실별 시트 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/lib/excel/ src/app/api/
git commit -m "feat: add Excel export with room stats sheets"
```

---

## Task 6: 전체 통합 확인 + 최종 커밋

- [ ] **Step 1: 전체 테스트 실행**

```bash
npm test
```

Expected: 모든 테스트 통과.

- [ ] **Step 2: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 오류 없음.

- [ ] **Step 3: 주요 시나리오 수동 확인**

1. 학기 등록 → 특별실·과목·교사·학급·교시 등록
2. 학사일정 등록 (여름방학식 등)
3. 배정 규칙 추가 (격주 반복, 월·수 요일, 종료 조건 설정)
4. 주간 그리드에서 드래그앤드롭으로 배정 이동
5. 충돌 발생 시 경고 표시 확인
6. 달력형 보기에서 배정 및 학사일정 확인
7. 목록형 보기에서 사용 일수 통계 확인
8. 단발 예약 추가 → 달력·목록에 표시 확인
9. 엑셀 내보내기 파일 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: MVP complete — Plan C views and export"
```

---

## 완료 기준

- [ ] `npm test` 전체 통과
- [ ] `npm run build` 오류 없음
- [ ] 달력형 보기 동작 (월 이동, 학사일정 오버레이)
- [ ] 목록형 보기 + 사용 일수 통계 동작
- [ ] 단발 예약 등록·삭제 + 충돌 검사 동작
- [ ] 엑셀 내보내기 (3개 시트) 동작
- [ ] 모든 변경사항 커밋 완료

**MVP 완료.** 이후 확장: 자동 배정 엔진, 멀티유저 권한 체계, 인쇄 최적화.
