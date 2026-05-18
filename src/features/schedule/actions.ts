'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { expandRule } from '@/engine/expander'
import { checkConflict } from '@/engine/conflict'
import { ScheduleEntry, ScheduleRule } from '@/generated/prisma'
import { ActionResult } from '@/types'
import { EntryLike } from '@/engine/conflict'

const INCLUDE_RULE = {
  room: true,
  classGroup: { include: { grade: true } },
  subject: true,
  teacher: true,
  period: true,
} as const

// ─────────────────────────────────────────────
// 1. listScheduleRules
// ─────────────────────────────────────────────
export async function listScheduleRules(
  termId: string,
  entryType?: 'ROOM' | 'SPECIALIST'
) {
  try {
    const allRules = await prisma.scheduleRule.findMany({
      where: { termId },
      include: INCLUDE_RULE,
      orderBy: { createdAt: 'asc' },
    })
    const rules = entryType === 'ROOM'       ? allRules.filter(r => r.roomId !== null)
                : entryType === 'SPECIALIST' ? allRules.filter(r => r.teacherId !== null)
                : allRules
    return { success: true as const, data: rules }
  } catch (err) {
    console.error('[listScheduleRules]', err)
    return { success: false as const, error: '일정 규칙 목록을 불러오는데 실패했습니다.' }
  }
}

// ─────────────────────────────────────────────
// 2. listEntriesForWeek
// ─────────────────────────────────────────────
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

    const allEntries = await prisma.scheduleEntry.findMany({
      where: {
        termId,
        date: { gte: start, lt: end },
        status: { not: 'EXCEPTION_CANCELLED' },
      },
      include: INCLUDE_RULE,
      orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
    })
    const entries = entryType === 'ROOM'       ? allEntries.filter(e => e.roomId !== null)
                 : entryType === 'SPECIALIST' ? allEntries.filter(e => e.teacherId !== null)
                 : allEntries
    return { success: true as const, data: entries }
  } catch (err) {
    console.error('[listEntriesForWeek]', err)
    return { success: false as const, error: '주간 일정을 불러오는데 실패했습니다.' }
  }
}

// ─────────────────────────────────────────────
// 3. createScheduleRule
// ─────────────────────────────────────────────
interface CreateScheduleRuleInput {
  termId: string
  roomId?: string
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

// ─────────────────────────────────────────────
// 4. moveScheduleEntry
// ─────────────────────────────────────────────
export async function moveScheduleEntry(
  entryId: string,
  newDate: string,
  newPeriodId: string,
  force = false
): Promise<ActionResult<{ entry: ScheduleEntry; conflicts: { type: string; message: string }[] }>> {
  try {
    // 1. Find the entry
    const existing = await prisma.scheduleEntry.findUnique({
      where: { id: entryId },
      include: { room: true },
    })
    if (!existing) {
      return { success: false, error: '일정을 찾을 수 없습니다.' }
    }

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

    // 4. If conflict and not force → return error
    if (conflictResult.hasConflict && !force) {
      return {
        success: false,
        error: '충돌이 있습니다. 강제 배정하려면 force=true로 호출하세요.',
      }
    }

    // 5. Update entry
    const updated = await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: {
        date: new Date(newDate),
        periodId: newPeriodId,
        source: 'MANUAL',
        status: conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL',
      },
    })

    // 6. Revalidate
    revalidatePath('/schedule')

    // 7. Return
    return { success: true, data: { entry: updated, conflicts: conflictResult.conflicts } }
  } catch (err) {
    console.error('[moveScheduleEntry]', err)
    return { success: false, error: '일정 이동에 실패했습니다.' }
  }
}

// ─────────────────────────────────────────────
// 5. deleteScheduleRule
// ─────────────────────────────────────────────
export async function deleteScheduleRule(ruleId: string): Promise<ActionResult> {
  try {
    // 1 & 2. Delete entries then rule atomically
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { sourceRuleId: ruleId } })
      await tx.scheduleRule.delete({ where: { id: ruleId } })
    })

    // 3. Revalidate
    revalidatePath('/schedule')
    revalidatePath('/specialist')

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[deleteScheduleRule]', err)
    return { success: false, error: '일정 규칙 삭제에 실패했습니다.' }
  }
}

// ─────────────────────────────────────────────
// 5b. bulkDeleteScheduleRules
// ─────────────────────────────────────────────
export async function bulkDeleteScheduleRules(ruleIds: string[]): Promise<ActionResult> {
  if (ruleIds.length === 0) return { success: true, data: undefined }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.scheduleEntry.deleteMany({ where: { sourceRuleId: { in: ruleIds } } })
      await tx.scheduleRule.deleteMany({ where: { id: { in: ruleIds } } })
    })
    revalidatePath('/schedule')
    revalidatePath('/specialist')
    return { success: true, data: undefined }
  } catch (err) {
    console.error('[bulkDeleteScheduleRules]', err)
    return { success: false, error: '배정 규칙 일괄 삭제에 실패했습니다.' }
  }
}

// ─────────────────────────────────────────────
// 6. cancelScheduleEntry
// ─────────────────────────────────────────────
export async function cancelScheduleEntry(entryId: string): Promise<ActionResult> {
  try {
    // 1. Update status to EXCEPTION_CANCELLED
    await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: { status: 'EXCEPTION_CANCELLED' },
    })

    // 2. Revalidate
    revalidatePath('/schedule')
    revalidatePath('/specialist')

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[cancelScheduleEntry]', err)
    return { success: false, error: '일정 취소에 실패했습니다.' }
  }
}

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

export async function updateScheduleRule(
  ruleId: string,
  data: CreateScheduleRuleInput
): Promise<ActionResult<{ created: number; conflicts: number }>> {
  try {
    const existing = await prisma.scheduleRule.findUnique({
      where: { id: ruleId },
      include: { term: true, room: true },
    })
    if (!existing) return { success: false, error: '규칙을 찾을 수 없습니다.' }

    // Delete all entries derived from this rule
    await prisma.scheduleEntry.deleteMany({ where: { sourceRuleId: ruleId } })

    // Update the rule
    const rule = await prisma.scheduleRule.update({
      where: { id: ruleId },
      data: {
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

    const room = data.roomId
      ? await prisma.specialRoom.findUnique({ where: { id: data.roomId } })
      : null
    if (data.roomId && !room) return { success: false, error: '특별실을 찾을 수 없습니다.' }

    const academicEvents = await prisma.academicEvent.findMany({ where: { termId: existing.termId } })

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
      existing.term.endDate
    )

    const [existingEntriesRaw, roomUnavailabilities] = await Promise.all([
      prisma.scheduleEntry.findMany({ where: { termId: existing.termId } }),
      data.roomId
        ? prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } })
        : Promise.resolve([]),
    ])
    const existingEntries: EntryLike[] = existingEntriesRaw

    let created = 0
    let conflictCount = 0

    for (const date of dates) {
      const conflictResult = checkConflict({
        entry: { date, periodId: data.periodId, roomId: data.roomId ?? null, classId: data.classId, teacherId: data.teacherId ?? null },
        existing: existingEntries,
        room: room ? { id: room.id, capacity: room.capacity } : null,
        roomUnavailabilities: roomUnavailabilities.map((u) => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
        teacherUnavailabilities: [],
      })
      const status = conflictResult.hasConflict ? 'FORCE_ASSIGNED' : 'NORMAL'
      await prisma.scheduleEntry.upsert({
        where: { date_periodId_classId: { date, periodId: data.periodId, classId: data.classId } },
        create: { termId: existing.termId, date, periodId: data.periodId, roomId: data.roomId ?? null, classId: data.classId, subjectId: data.subjectId ?? null, teacherId: data.teacherId ?? null, source: 'RULE', sourceRuleId: rule.id, status },
        update: { status },
      })
      existingEntries.push({ id: `upd-${date.toISOString()}`, date, periodId: data.periodId, roomId: data.roomId ?? null, classId: data.classId, teacherId: data.teacherId ?? null, status })
      conflictResult.hasConflict ? conflictCount++ : created++
    }

    revalidatePath('/schedule')
    revalidatePath('/specialist')
    return { success: true, data: { created, conflicts: conflictCount } }
  } catch (err) {
    console.error('[updateScheduleRule]', err)
    return { success: false, error: '규칙 수정에 실패했습니다.' }
  }
}

export async function createRotationRules(input: {
  termId: string
  roomId: string
  classIds: string[]       // in rotation order
  periodId: string
  dayOfWeek: number        // 0=월 … 4=금
  startDate: string        // YYYY-MM-DD, must fall on dayOfWeek
  rotationWeeks: number    // weeks each class holds the slot before the next class takes over
}): Promise<ActionResult<{ created: number; conflicts: number }>> {
  const { classIds, dayOfWeek, startDate, rotationWeeks } = input
  if (classIds.length === 0) return { success: false, error: '배정할 학급을 선택해 주세요.' }
  if (rotationWeeks < 1) return { success: false, error: '순환 주기는 1 이상이어야 합니다.' }

  const repeatInterval = classIds.length * rotationWeeks

  let totalCreated = 0
  let totalConflicts = 0

  for (let i = 0; i < classIds.length; i++) {
    // Each class starts i * rotationWeeks weeks after the base startDate
    const offsetMs = i * rotationWeeks * 7 * 24 * 60 * 60 * 1000
    const classStart = new Date(new Date(startDate).getTime() + offsetMs)
    const classStartStr = classStart.toISOString().slice(0, 10)

    const result = await createScheduleRule({
      termId: input.termId,
      roomId: input.roomId,
      classId: classIds[i],
      periodId: input.periodId,
      startDate: classStartStr,
      repeatInterval,
      repeatUnit: 'WEEK',
      repeatDays: [dayOfWeek],
      endType: 'NONE',
    })

    if (!result.success) return result
    totalCreated += result.data.created
    totalConflicts += result.data.conflicts
  }

  return { success: true, data: { created: totalCreated, conflicts: totalConflicts } }
}
