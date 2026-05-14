'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { Subject, SubjectType } from '@/generated/prisma'

export async function listSubjects(termId: string): Promise<Subject[]> {
  return prisma.subject.findMany({ where: { termId }, orderBy: { name: 'asc' } })
}

export async function createSubject(data: {
  termId: string
  name: string
  type: SubjectType
  requiresRoom: boolean
}): Promise<ActionResult<Subject>> {
  try {
    const subject = await prisma.subject.create({ data })
    revalidatePath('/subjects')
    return { success: true, data: subject }
  } catch {
    return { success: false, error: '과목 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateSubject(
  id: string,
  data: { name: string; type: SubjectType; requiresRoom: boolean }
): Promise<ActionResult<Subject>> {
  try {
    const subject = await prisma.subject.update({ where: { id }, data })
    revalidatePath('/subjects')
    return { success: true, data: subject }
  } catch {
    return { success: false, error: '과목 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  try {
    await prisma.subject.delete({ where: { id } })
    revalidatePath('/subjects')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '과목 삭제 중 오류가 발생했습니다.' }
  }
}
