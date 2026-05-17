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

export async function updateClassGroup(
  id: string,
  data: { displayName: string; teacherNameInput: string; termId: string }
): Promise<ActionResult> {
  try {
    let homeroomTeacherId: string | null = null
    const name = data.teacherNameInput.trim()
    if (name) {
      const existing = await prisma.teacher.findFirst({ where: { termId: data.termId, name } })
      if (existing) {
        homeroomTeacherId = existing.id
      } else {
        const created = await prisma.teacher.create({
          data: { termId: data.termId, name, type: 'HOMEROOM' },
        })
        homeroomTeacherId = created.id
      }
    }
    await prisma.classGroup.update({
      where: { id },
      data: {
        displayName: data.displayName.trim() || null,
        homeroomTeacherId,
      },
    })
    revalidatePath('/classes')
    revalidatePath('/teachers')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학급 수정 중 오류가 발생했습니다.' }
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

export async function addClassToGrade(gradeId: string): Promise<ActionResult<ClassGroup>> {
  try {
    const existing = await prisma.classGroup.findMany({
      where: { gradeId },
      orderBy: { number: 'desc' },
    })
    const nextNumber = (existing[0]?.number ?? 0) + 1
    const cls = await prisma.classGroup.create({ data: { gradeId, number: nextNumber } })
    revalidatePath('/classes')
    return { success: true, data: cls }
  } catch {
    return { success: false, error: '학급 추가 중 오류가 발생했습니다.' }
  }
}

export async function deleteGrade(gradeId: string): Promise<ActionResult> {
  try {
    await prisma.grade.delete({ where: { id: gradeId } })
    revalidatePath('/classes')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학년 삭제 중 오류가 발생했습니다.' }
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

export async function bulkRenameClasses(
  termId: string,
  rows: { gradeNumber: number; classNumber: number; displayName: string }[]
): Promise<ActionResult<{ renamed: number; notFound: string[] }>> {
  try {
    let renamed = 0
    const notFound: string[] = []
    for (const row of rows) {
      const grade = await prisma.grade.findUnique({
        where: { termId_number: { termId, number: row.gradeNumber } },
      })
      if (!grade) { notFound.push(`${row.gradeNumber}학년 ${row.classNumber}반`); continue }
      const cls = await prisma.classGroup.findUnique({
        where: { gradeId_number: { gradeId: grade.id, number: row.classNumber } },
      })
      if (!cls) { notFound.push(`${row.gradeNumber}학년 ${row.classNumber}반`); continue }
      await prisma.classGroup.update({
        where: { id: cls.id },
        data: { displayName: row.displayName.trim() || null },
      })
      renamed++
    }
    revalidatePath('/classes')
    return { success: true, data: { renamed, notFound } }
  } catch {
    return { success: false, error: '반 이름 일괄 변경 중 오류가 발생했습니다.' }
  }
}

export async function assignHomeroomTeachers(
  termId: string,
  rows: { gradeNumber: number; classNumber: number; teacherName: string }[]
): Promise<ActionResult<{ assigned: number; notFound: string[] }>> {
  try {
    let assigned = 0
    const notFound: string[] = []
    for (const row of rows) {
      const grade = await prisma.grade.findUnique({
        where: { termId_number: { termId, number: row.gradeNumber } },
      })
      if (!grade) { notFound.push(`${row.gradeNumber}-${row.classNumber}반`); continue }
      const cls = await prisma.classGroup.findUnique({
        where: { gradeId_number: { gradeId: grade.id, number: row.classNumber } },
      })
      if (!cls) { notFound.push(`${row.gradeNumber}-${row.classNumber}반`); continue }
      const teacher = await prisma.teacher.findFirst({
        where: { termId, name: row.teacherName.trim() },
      })
      if (!teacher) { notFound.push(`교사 "${row.teacherName}" 없음`); continue }
      await prisma.classGroup.update({
        where: { id: cls.id },
        data: { homeroomTeacherId: teacher.id },
      })
      assigned++
    }
    revalidatePath('/classes')
    return { success: true, data: { assigned, notFound } }
  } catch {
    return { success: false, error: '담임 배정 중 오류가 발생했습니다.' }
  }
}
