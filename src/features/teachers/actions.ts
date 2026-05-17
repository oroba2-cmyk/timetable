'use server'

import { prisma } from '@/lib/db/client'
import { assertTermInTenant } from '@/lib/auth/tenant-scope'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { Teacher, TeacherType } from '@/generated/prisma'

export async function listTeachers(termId: string): Promise<Teacher[]> {
  await assertTermInTenant(termId)
  return prisma.teacher.findMany({
    where: { termId },
    orderBy: { name: 'asc' },
  })
}

export async function createTeacher(data: {
  termId: string
  name: string
  type: TeacherType
}): Promise<ActionResult<Teacher>> {
  try {
    await assertTermInTenant(data.termId)
    const teacher = await prisma.teacher.create({
      data: { termId: data.termId, name: data.name, type: data.type },
    })
    revalidatePath('/teachers')
    return { success: true, data: teacher }
  } catch {
    return { success: false, error: '교사 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateTeacher(
  id: string,
  data: { name: string; type: TeacherType }
): Promise<ActionResult<Teacher>> {
  try {
    const teacher = await prisma.teacher.update({
      where: { id },
      data: { name: data.name, type: data.type },
    })
    revalidatePath('/teachers')
    return { success: true, data: teacher }
  } catch {
    return { success: false, error: '교사 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  try {
    await prisma.teacher.delete({ where: { id } })
    revalidatePath('/teachers')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '교사 삭제 중 오류가 발생했습니다.' }
  }
}

export async function bulkCreateTeachers(
  termId: string,
  names: string[],
  type: 'HOMEROOM' | 'SPECIALIZED' | 'TEMP_HOMEROOM' = 'HOMEROOM',
  duplicateAction: 'skip' | 'overwrite' | 'add' = 'skip'
): Promise<ActionResult<{ created: number; skipped: number; overwritten: number }>> {
  try {
    let created = 0, skipped = 0, overwritten = 0
    for (const name of names) {
      const trimmed = name.trim()
      if (!trimmed) continue
      const existing = await prisma.teacher.findFirst({ where: { termId, name: trimmed } })
      if (existing) {
        if (duplicateAction === 'skip') { skipped++; continue }
        if (duplicateAction === 'overwrite') {
          await prisma.teacher.update({ where: { id: existing.id }, data: { type } })
          overwritten++; continue
        }
        // 'add' falls through to create below
      }
      await prisma.teacher.create({ data: { termId, name: trimmed, type } })
      created++
    }
    revalidatePath('/teachers')
    return { success: true, data: { created, skipped, overwritten } }
  } catch {
    return { success: false, error: '교사 일괄 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteAllTeachers(termId: string): Promise<ActionResult> {
  try {
    await prisma.teacher.deleteMany({ where: { termId } })
    revalidatePath('/teachers')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '교사 전체 삭제 중 오류가 발생했습니다.' }
  }
}
