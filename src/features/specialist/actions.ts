'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
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

    const [existingEntries, roomUnavailabilities, teacherUnavailabilities] = await Promise.all([
      prisma.scheduleEntry.findMany({ where: { termId: data.termId } }),
      data.roomId
        ? prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } })
        : Promise.resolve([]),
      prisma.teacherUnavailability.findMany({ where: { teacherId: data.teacherId } }),
    ])

    const conflictResult = checkConflict({
      entry: { date: entryDate, periodId: data.periodId, roomId: data.roomId ?? null, classId: data.classId, teacherId: data.teacherId },
      existing: existingEntries as EntryLike[],
      room: room ? { id: room.id, capacity: room.capacity } : null,
      roomUnavailabilities: roomUnavailabilities.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
      teacherUnavailabilities: teacherUnavailabilities.map(u => ({ dayOfWeek: u.dayOfWeek, periodId: u.periodId })),
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
      update: {
        teacherId: data.teacherId,
        roomId: data.roomId ?? null,
        sourceRuleId: rule.id,
        source: 'RULE',
        status,
      },
    })

    revalidatePath('/specialist')
    revalidatePath('/calendar')

    return { success: true, data: { created: 1, conflicts: conflictResult.hasConflict ? 1 : 0 } }
  } catch (err) {
    console.error('[quickAssignSpecialist]', err)
    return { success: false, error: '전담 배정에 실패했습니다.' }
  }
}
