'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { expandRule } from '@/engine/expander'
import { checkConflict } from '@/engine/conflict'
import { ScheduleEntry, ScheduleRule } from '@/generated/prisma'
import { ActionResult } from '@/types'

const INCLUDE_RULE = {
  room: true,
  classGroup: { include: { grade: true } },
  subject: true,
  teacher: true,
  period: true,
} as const

const INCLUDE_ENTRY = {
  room: true,
  classGroup: { include: { grade: true } },
  subject: true,
  teacher: true,
  period: true,
} as const

// ─────────────────────────────────────────────
// 1. listScheduleRules
// ─────────────────────────────────────────────
export async function listScheduleRules(termId: string) {
  try {
    const rules = await prisma.scheduleRule.findMany({
      where: { termId },
      include: INCLUDE_RULE,
      orderBy: { createdAt: 'asc' },
    })
    return { success: true as const, data: rules }
  } catch (err) {
    console.error('[listScheduleRules]', err)
    return { success: false as const, error: '일정 규칙 목록을 불러오는데 실패했습니다.' }
  }
}

// ─────────────────────────────────────────────
// 2. listEntriesForWeek
// ─────────────────────────────────────────────
export async function listEntriesForWeek(termId: string, weekStart: string) {
  try {
    const start = new Date(weekStart)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)

    const entries = await prisma.scheduleEntry.findMany({
      where: {
        termId,
        date: { gte: start, lt: end },
      },
      include: INCLUDE_ENTRY,
      orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
    })
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
}

export async function createScheduleRule(
  data: CreateScheduleRuleInput
): Promise<ActionResult<{ rule: ScheduleRule; created: number; conflicts: number }>> {
  try {
    // 1. Find the term
    const term = await prisma.schoolTerm.findUnique({ where: { id: data.termId } })
    if (!term) {
      return { success: false, error: '학기를 찾을 수 없습니다.' }
    }

    // 2. Create the ScheduleRule
    const rule = await prisma.scheduleRule.create({
      data: {
        termId: data.termId,
        roomId: data.roomId,
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

    // 3. Load academic events for the term
    const academicEvents = await prisma.academicEvent.findMany({
      where: { termId: data.termId },
    })

    // 4. Expand the rule to get dates
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
      academicEvents.map((e) => ({ date: e.date, allowException: e.allowException })),
      term.endDate
    )

    // 5. Load room, existing entries, and room unavailabilities in parallel
    const [room, existingEntries, roomUnavailabilities] = await Promise.all([
      prisma.specialRoom.findUnique({ where: { id: data.roomId } }),
      prisma.scheduleEntry.findMany({ where: { termId: data.termId } }),
      prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } }),
    ])

    if (!room) {
      return { success: false, error: '특별실을 찾을 수 없습니다.' }
    }

    // 6–8. For each date, check conflict and upsert entry
    let created = 0
    let conflictCount = 0

    for (const date of dates) {
      const conflictResult = checkConflict({
        entry: {
          date,
          periodId: data.periodId,
          roomId: data.roomId,
          classId: data.classId,
          teacherId: data.teacherId ?? null,
        },
        existing: existingEntries,
        room: { id: room.id, capacity: room.capacity },
        roomUnavailabilities: roomUnavailabilities.map((u) => ({
          dayOfWeek: u.dayOfWeek,
          periodId: u.periodId,
        })),
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
          subjectId: data.subjectId ?? null,
          teacherId: data.teacherId ?? null,
          source: 'RULE',
          sourceRuleId: rule.id,
          status,
        },
        update: { status },
      })

      if (conflictResult.hasConflict) {
        conflictCount++
      } else {
        created++
      }
    }

    // 9. Revalidate
    revalidatePath('/schedule')

    // 10. Return result
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

    // 2. Load existing entries, room unavailabilities, and teacher unavailabilities in parallel
    const [allEntries, roomUnavailabilities, teacherUnavailabilities] = await Promise.all([
      prisma.scheduleEntry.findMany({ where: { termId: existing.termId } }),
      prisma.roomUnavailability.findMany({ where: { roomId: existing.roomId } }),
      existing.teacherId
        ? prisma.teacherUnavailability.findMany({ where: { teacherId: existing.teacherId } })
        : Promise.resolve([]),
    ])

    // 3. Check conflict
    const conflictResult = checkConflict({
      entry: {
        date: new Date(newDate),
        periodId: newPeriodId,
        roomId: existing.roomId,
        classId: existing.classId,
        teacherId: existing.teacherId,
      },
      existing: allEntries,
      room: { id: existing.room.id, capacity: existing.room.capacity },
      roomUnavailabilities: roomUnavailabilities.map((u) => ({
        dayOfWeek: u.dayOfWeek,
        periodId: u.periodId,
      })),
      teacherUnavailabilities: teacherUnavailabilities.map((u) => ({
        dayOfWeek: u.dayOfWeek,
        periodId: u.periodId,
      })),
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
    // 1. Delete all entries from this rule
    await prisma.scheduleEntry.deleteMany({ where: { sourceRuleId: ruleId } })

    // 2. Delete the rule
    await prisma.scheduleRule.delete({ where: { id: ruleId } })

    // 3. Revalidate
    revalidatePath('/schedule')

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[deleteScheduleRule]', err)
    return { success: false, error: '일정 규칙 삭제에 실패했습니다.' }
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

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[cancelScheduleEntry]', err)
    return { success: false, error: '일정 취소에 실패했습니다.' }
  }
}
