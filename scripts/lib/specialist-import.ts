import type { PrismaClient } from '../../src/generated/prisma'
import type { SpecialistAssignment } from '../data/specialist-schedules'
import { SPECIALIST_SCHEDULES } from '../data/specialist-schedules'
import {
  buildImportContext,
  classKey,
  createWeeklyRule,
  resolveSubjectId,
} from './waseok-import-core'
import type { ParsedSlot } from './waseok-schedule-parser'

export async function deleteSpecialistRules(prisma: PrismaClient, termId: string) {
  const rules = await prisma.scheduleRule.findMany({
    where: { termId, roomId: null },
    select: { id: true },
  })
  if (rules.length === 0) return 0
  const ids = rules.map((r) => r.id)
  await prisma.scheduleEntry.deleteMany({ where: { sourceRuleId: { in: ids } } })
  await prisma.scheduleRule.deleteMany({ where: { id: { in: ids } } })
  return ids.length
}

export async function importSpecialistSchedule(
  prisma: PrismaClient,
  termId: string,
  assignments: SpecialistAssignment[] = SPECIALIST_SCHEDULES
): Promise<{ rules: number; skipped: number; teachers: string[] }> {
  const ctx = await buildImportContext(prisma, termId)
  const teacherByName = new Map(ctx.teacherByName)

  let rules = 0
  let skipped = 0
  const teacherSet = new Set<string>()

  for (const a of assignments) {
    const teacherId = teacherByName.get(a.teacherName)
    if (!teacherId) {
      skipped++
      continue
    }

    const classId = ctx.classByKey.get(classKey(a.grade, a.classNum))
    if (!classId) {
      skipped++
      continue
    }

    const slot: ParsedSlot = {
      dayIndex: a.dayIndex,
      period: a.period,
      grade: a.grade,
      classNum: a.classNum,
      subjectCode: a.subjectCode,
    }

    const subjectId = resolveSubjectId(ctx, slot, a.teacherName)
    const r = await createWeeklyRule(prisma, ctx, {
      classId,
      subjectId,
      teacherId,
      grade: a.grade,
      periodNum: a.period,
      dayIndex: a.dayIndex,
    })

    if (r === 'ok') {
      rules++
      teacherSet.add(a.teacherName)
    } else {
      skipped++
    }
  }

  return { rules, skipped, teachers: [...teacherSet].sort() }
}
