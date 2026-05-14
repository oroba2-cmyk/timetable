'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { Period } from '@/generated/prisma'

export async function listPeriods(termId: string): Promise<Period[]> {
  return prisma.period.findMany({ where: { termId }, orderBy: { number: 'asc' } })
}

export async function createPeriod(data: {
  termId: string
  number: number
  startTime: string
  endTime: string
}): Promise<ActionResult<Period>> {
  try {
    const period = await prisma.period.create({ data })
    revalidatePath('/periods')
    return { success: true, data: period }
  } catch {
    return { success: false, error: '교시 등록 중 오류가 발생했습니다.' }
  }
}

export async function updatePeriod(
  id: string,
  data: { startTime: string; endTime: string }
): Promise<ActionResult<Period>> {
  try {
    const period = await prisma.period.update({ where: { id }, data })
    revalidatePath('/periods')
    return { success: true, data: period }
  } catch {
    return { success: false, error: '교시 수정 중 오류가 발생했습니다.' }
  }
}

export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    await prisma.period.delete({ where: { id } })
    revalidatePath('/periods')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '교시 삭제 중 오류가 발생했습니다.' }
  }
}
