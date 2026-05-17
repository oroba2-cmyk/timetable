'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { Subject, Teacher, ClassGroup, Grade } from '@/generated/prisma'

export type SubjectWithDetails = Subject & {
  teacherSubjects: { teacher: Teacher }[]
  subjectClassGroups: {
    classGroup: ClassGroup & { grade: Grade }
  }[]
}

export async function listSubjects(termId: string): Promise<SubjectWithDetails[]> {
  return prisma.subject.findMany({
    where: { termId },
    include: {
      teacherSubjects: { include: { teacher: true } },
      subjectClassGroups: {
        include: { classGroup: { include: { grade: true } } },
        orderBy: [
          { classGroup: { grade: { number: 'asc' } } },
          { classGroup: { number: 'asc' } },
        ],
      },
    },
    orderBy: { name: 'asc' },
  })
}

async function findOrCreateTeacher(termId: string, teacherId: string | undefined, teacherName: string | undefined): Promise<string | undefined> {
  if (teacherId) return teacherId
  if (!teacherName?.trim()) return undefined
  const existing = await prisma.teacher.findFirst({ where: { termId, name: teacherName.trim() } })
  if (existing) return existing.id
  const created = await prisma.teacher.create({
    data: { termId, name: teacherName.trim(), type: 'SPECIALIZED' },
  })
  revalidatePath('/teachers')
  return created.id
}

export async function createSubject(data: {
  termId: string
  name: string
  isSpecialized: boolean
  requiresRoom: boolean
  weeklyHours: number
  teacherId?: string
  teacherName?: string
  classGroupIds: string[]
}): Promise<ActionResult<Subject>> {
  try {
    const resolvedTeacherId = await findOrCreateTeacher(data.termId, data.teacherId, data.teacherName)
    const subject = await prisma.subject.create({
      data: {
        termId: data.termId,
        name: data.name,
        isSpecialized: data.isSpecialized,
        requiresRoom: data.requiresRoom,
        weeklyHours: data.weeklyHours,
        ...(resolvedTeacherId && {
          teacherSubjects: { create: { teacherId: resolvedTeacherId } },
        }),
        subjectClassGroups: {
          create: data.classGroupIds.map(classGroupId => ({ classGroupId })),
        },
      },
    })
    revalidatePath('/subjects')
    return { success: true, data: subject }
  } catch {
    return { success: false, error: '과목 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateSubject(
  id: string,
  data: {
    name: string
    isSpecialized: boolean
    requiresRoom: boolean
    weeklyHours: number
    teacherId?: string
    teacherName?: string
    classGroupIds: string[]
    termId: string
  }
): Promise<ActionResult<Subject>> {
  try {
    const resolvedTeacherId = await findOrCreateTeacher(data.termId, data.teacherId, data.teacherName)
    await prisma.teacherSubject.deleteMany({ where: { subjectId: id } })
    await prisma.subjectClassGroup.deleteMany({ where: { subjectId: id } })
    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        isSpecialized: data.isSpecialized,
        requiresRoom: data.requiresRoom,
        weeklyHours: data.weeklyHours,
        ...(resolvedTeacherId && {
          teacherSubjects: { create: { teacherId: resolvedTeacherId } },
        }),
        subjectClassGroups: {
          create: data.classGroupIds.map(classGroupId => ({ classGroupId })),
        },
      },
    })
    revalidatePath('/subjects')
    return { success: true, data: subject }
  } catch {
    return { success: false, error: '과목 수정 중 오류가 발생했습니다.' }
  }
}

export async function duplicateSubject(id: string): Promise<ActionResult<Subject>> {
  try {
    const source = await prisma.subject.findUniqueOrThrow({
      where: { id },
      include: { teacherSubjects: true, subjectClassGroups: true },
    })
    const dup = await prisma.subject.create({
      data: {
        termId: source.termId,
        name: source.name + ' (복사본)',
        isSpecialized: source.isSpecialized,
        requiresRoom: source.requiresRoom,
        weeklyHours: source.weeklyHours,
        teacherSubjects: { create: source.teacherSubjects.map(ts => ({ teacherId: ts.teacherId })) },
        subjectClassGroups: { create: source.subjectClassGroups.map(sg => ({ classGroupId: sg.classGroupId })) },
      },
    })
    revalidatePath('/subjects')
    return { success: true, data: dup }
  } catch {
    return { success: false, error: '과목 복제 중 오류가 발생했습니다.' }
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
