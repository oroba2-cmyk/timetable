'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { Period } from '@/generated/prisma'
import type { PeriodRow } from './constants'

export type { PeriodRow } from './constants'

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

export async function listAllPeriods(termId: string): Promise<PeriodRow[]> {
  const rows = await prisma.period.findMany({
    where: { termId },
    orderBy: [{ gradeNumber: 'asc' }, { number: 'asc' }],
    select: { number: true, gradeNumber: true, label: true, startTime: true, endTime: true },
  })
  return rows
}

export async function listAllPeriodsDetailed(termId: string): Promise<Period[]> {
  return prisma.period.findMany({
    where: { termId },
    orderBy: [{ gradeNumber: 'asc' }, { number: 'asc' }],
  })
}

export async function upsertPeriods(
  termId: string,
  gradeNumber: number,
  rows: { number: number; startTime: string; endTime: string; label?: string | null }[]
): Promise<ActionResult> {
  try {
    for (const row of rows) {
      await prisma.period.upsert({
        where: { termId_number_gradeNumber: { termId, number: row.number, gradeNumber } },
        create: { termId, number: row.number, gradeNumber, startTime: row.startTime, endTime: row.endTime, label: row.label ?? null },
        update: { startTime: row.startTime, endTime: row.endTime },
      })
    }
    revalidatePath('/periods')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '시정 저장 중 오류가 발생했습니다.' }
  }
}

export async function deletePeriodsForGrade(termId: string, gradeNumber: number): Promise<ActionResult> {
  try {
    await prisma.period.deleteMany({ where: { termId, gradeNumber } })
    revalidatePath('/periods')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '시정 삭제 중 오류가 발생했습니다.' }
  }
}

// Legacy actions kept for backward compatibility
export async function createPeriod(data: {
  termId: string; number: number; startTime: string; endTime: string
}): Promise<ActionResult<Period>> {
  try {
    const period = await prisma.period.create({ data: { ...data, gradeNumber: 0 } })
    revalidatePath('/periods')
    return { success: true, data: period }
  } catch {
    return { success: false, error: '교시 등록 중 오류가 발생했습니다.' }
  }
}

export async function updatePeriod(id: string, data: { startTime: string; endTime: string }): Promise<ActionResult<Period>> {
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
