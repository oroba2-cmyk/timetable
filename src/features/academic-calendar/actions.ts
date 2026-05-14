'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { AcademicEvent } from '@/generated/prisma'

export async function listAcademicEvents(termId: string): Promise<AcademicEvent[]> {
  return prisma.academicEvent.findMany({ where: { termId }, orderBy: { date: 'asc' } })
}

export async function createAcademicEvent(data: {
  termId: string
  eventType: string
  date: string
  allowException: boolean
  note?: string
}): Promise<ActionResult<AcademicEvent>> {
  try {
    const event = await prisma.academicEvent.create({
      data: { ...data, date: new Date(data.date) },
    })
    revalidatePath('/academic-calendar')
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateAcademicEvent(
  id: string,
  data: { eventType: string; date: string; allowException: boolean; note?: string }
): Promise<ActionResult<AcademicEvent>> {
  try {
    const event = await prisma.academicEvent.update({
      where: { id },
      data: { ...data, date: new Date(data.date) },
    })
    revalidatePath('/academic-calendar')
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteAcademicEvent(id: string): Promise<ActionResult> {
  try {
    await prisma.academicEvent.delete({ where: { id } })
    revalidatePath('/academic-calendar')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학사일정 삭제 중 오류가 발생했습니다.' }
  }
}
