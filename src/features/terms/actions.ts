'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { SchoolTerm } from '@/generated/prisma'

export async function listTerms(): Promise<SchoolTerm[]> {
  return prisma.schoolTerm.findMany({ orderBy: [{ year: 'desc' }, { semester: 'desc' }] })
}

export async function createTerm(data: {
  year: number
  semester: number
  startDate: string
  endDate: string
}): Promise<ActionResult<SchoolTerm>> {
  try {
    const term = await prisma.schoolTerm.create({
      data: {
        year: data.year,
        semester: data.semester,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    })
    revalidatePath('/')
    return { success: true, data: term }
  } catch {
    return { success: false, error: '학기 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  try {
    await prisma.schoolTerm.delete({ where: { id } })
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학기 삭제 중 오류가 발생했습니다.' }
  }
}
