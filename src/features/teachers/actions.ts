'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { Teacher, TeacherType, Subject } from '@/generated/prisma'

type TeacherWithSubjects = Teacher & { teacherSubjects: { subjectId: string; subject: Subject }[] }

export async function listTeachers(termId: string): Promise<TeacherWithSubjects[]> {
  return prisma.teacher.findMany({
    where: { termId },
    include: { teacherSubjects: { include: { subject: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function createTeacher(data: {
  termId: string
  name: string
  type: TeacherType
  subjectIds: string[]
}): Promise<ActionResult<Teacher>> {
  try {
    const teacher = await prisma.teacher.create({
      data: {
        termId: data.termId,
        name: data.name,
        type: data.type,
        teacherSubjects: {
          create: data.subjectIds.map((subjectId) => ({ subjectId })),
        },
      },
    })
    revalidatePath('/teachers')
    return { success: true, data: teacher }
  } catch {
    return { success: false, error: '교사 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateTeacher(
  id: string,
  data: { name: string; type: TeacherType; subjectIds: string[] }
): Promise<ActionResult<Teacher>> {
  try {
    await prisma.teacherSubject.deleteMany({ where: { teacherId: id } })
    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        teacherSubjects: {
          create: data.subjectIds.map((subjectId) => ({ subjectId })),
        },
      },
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
