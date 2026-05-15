'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { ClassGroup, Grade } from '@/generated/prisma'

type GradeWithClasses = Grade & {
  classGroups: (ClassGroup & { homeroomTeacher: { name: string } | null })[]
}

export async function listGrades(termId: string): Promise<GradeWithClasses[]> {
  return prisma.grade.findMany({
    where: { termId },
    include: {
      classGroups: {
        include: { homeroomTeacher: true },
        orderBy: { number: 'asc' },
      },
    },
    orderBy: { number: 'asc' },
  })
}

export async function createClassGroup(data: {
  termId: string
  gradeNumber: number
  classNumber: number
  homeroomTeacherId?: string
}): Promise<ActionResult<ClassGroup>> {
  try {
    const grade = await prisma.grade.upsert({
      where: { termId_number: { termId: data.termId, number: data.gradeNumber } },
      create: { termId: data.termId, number: data.gradeNumber },
      update: {},
    })
    const classGroup = await prisma.classGroup.create({
      data: {
        gradeId: grade.id,
        number: data.classNumber,
        homeroomTeacherId: data.homeroomTeacherId || null,
      },
    })
    revalidatePath('/classes')
    return { success: true, data: classGroup }
  } catch {
    return { success: false, error: '학급 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteClassGroup(id: string): Promise<ActionResult> {
  try {
    await prisma.classGroup.delete({ where: { id } })
    revalidatePath('/classes')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학급 삭제 중 오류가 발생했습니다.' }
  }
}

export async function autoGenerateClasses(
  termId: string,
  gradeNumber: number,
  count: number
): Promise<ActionResult<{ created: number }>> {
  try {
    const grade = await prisma.grade.upsert({
      where: { termId_number: { termId, number: gradeNumber } },
      create: { termId, number: gradeNumber },
      update: {},
    })
    for (let classNumber = 1; classNumber <= count; classNumber++) {
      await prisma.classGroup.upsert({
        where: { gradeId_number: { gradeId: grade.id, number: classNumber } },
        create: { gradeId: grade.id, number: classNumber },
        update: {},
      })
    }
    revalidatePath('/classes')
    return { success: true, data: { created: count } }
  } catch {
    return { success: false, error: '학급 자동 생성 중 오류가 발생했습니다.' }
  }
}

export async function renameClassGroup(
  id: string,
  displayName: string
): Promise<ActionResult> {
  try {
    await prisma.classGroup.update({
      where: { id },
      data: { displayName: displayName.trim() || null },
    })
    revalidatePath('/classes')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학급 이름 변경 중 오류가 발생했습니다.' }
  }
}
