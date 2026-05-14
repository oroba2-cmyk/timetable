'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { Reservation } from '@/generated/prisma'
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
    const [room, existing, roomUnavailabilities, teacherUnavailabilities] = await Promise.all([
      prisma.specialRoom.findUnique({ where: { id: data.roomId } }),
      prisma.scheduleEntry.findMany({ where: { termId: data.termId } }),
      prisma.roomUnavailability.findMany({ where: { roomId: data.roomId } }),
      data.teacherId
        ? prisma.teacherUnavailability.findMany({ where: { teacherId: data.teacherId } })
        : Promise.resolve([]),
    ])

    if (!room) {
      return { success: false, error: '특별실을 찾을 수 없습니다.' }
    }

    const conflictResult = checkConflict({
      entry: {
        date: new Date(data.date),
        periodId: data.periodId,
        roomId: data.roomId,
        classId: data.classId,
        teacherId: data.teacherId || null,
      },
      existing,
      room,
      roomUnavailabilities,
      teacherUnavailabilities,
    })

    if (conflictResult.hasConflict && !data.force) {
      return {
        success: false,
        error: '충돌: ' + conflictResult.conflicts.map((c) => c.message).join(', '),
      }
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
        subjectId: data.subjectId || null,
        teacherId: data.teacherId || null,
      },
    })

    revalidatePath('/calendar')
    revalidatePath('/list')

    return {
      success: true,
      data: { reservation, conflicts: conflictResult.conflicts },
    }
  } catch {
    return { success: false, error: '예약 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteReservation(id: string): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } })

      if (reservation) {
        await tx.scheduleEntry.deleteMany({
          where: {
            date: reservation.date,
            periodId: reservation.periodId,
            roomId: reservation.roomId,
            classId: reservation.classId,
            source: 'RESERVATION',
          },
        })
      }

      await tx.reservation.delete({ where: { id } })
    })

    revalidatePath('/calendar')
    revalidatePath('/list')

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '예약 삭제 중 오류가 발생했습니다.' }
  }
}
