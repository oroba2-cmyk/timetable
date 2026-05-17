'use server'

import { prisma } from '@/lib/db/client'
import { assertTermInTenant, requireTenantId } from '@/lib/auth/tenant-scope'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { SchoolTerm } from '@/generated/prisma'
import {
  resolveTermForDate,
  resolveTermForDateRange,
} from '@/lib/terms/resolve-active-term'

export async function listTerms(): Promise<SchoolTerm[]> {
  const tenantId = await requireTenantId()
  return prisma.schoolTerm.findMany({
    where: { tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })
}

export async function createTerm(data: {
  year: number
  semester: number
  startDate: string
  endDate: string
}): Promise<ActionResult<SchoolTerm>> {
  try {
    const tenantId = await requireTenantId()
    const term = await prisma.schoolTerm.create({
      data: {
        tenantId,
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

/** 조회 날짜·기간에 맞는 학기 (달력·목록·주간 편집기용) */
export async function resolveActiveTerm(options?: {
  date?: string | Date
  from?: string | Date
  to?: string | Date
}): Promise<SchoolTerm | null> {
  const terms = await listTerms()
  if (terms.length === 0) return null

  const toDate = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v)

  if (options?.from != null && options?.to != null) {
    return resolveTermForDateRange(terms, toDate(options.from), toDate(options.to))
  }
  if (options?.date != null) {
    return resolveTermForDate(terms, toDate(options.date))
  }
  return resolveTermForDate(terms, new Date())
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  try {
    await assertTermInTenant(id)
    await prisma.schoolTerm.delete({ where: { id } })
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학기 삭제 중 오류가 발생했습니다.' }
  }
}
