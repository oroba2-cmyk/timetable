import type { PrismaClient } from '../../src/generated/prisma'
import type { RoomPeriodSlot, RoomScheduleSlot } from '../data/room-schedule-types'
import { buildImportContext, classKey, createWeeklyRule } from './waseok-import-core'

const CLASS_RE = /^(\d)-(\d+)$/

function parseGradeTokens(cell: string): number[] {
  const m = cell.match(/^([\d,]+)학년$/)
  if (!m) return []
  return m[1].split(',').map((x) => parseInt(x.trim(), 10))
}

function resolveClassIds(
  cell: string,
  classByKey: Map<string, string>,
  classesByGrade: Map<number, string[]>
): string[] {
  const cm = CLASS_RE.exec(cell)
  if (cm) {
    const id = classByKey.get(classKey(parseInt(cm[1], 10), parseInt(cm[2], 10)))
    return id ? [id] : []
  }
  const grades = parseGradeTokens(cell)
  if (grades.length > 0) {
    return grades.flatMap((g) => classesByGrade.get(g) ?? [])
  }
  return []
}

function periodNumberForSlot(period: RoomPeriodSlot, grade: number): number {
  if (period === '5A') return grade <= 4 ? 5 : -1
  if (period === '5B') return grade >= 5 ? 5 : -1
  if (typeof period === 'number') return period
  return -1
}

export async function importRoomSchedule(
  prisma: PrismaClient,
  termId: string,
  schedule: RoomScheduleSlot[],
  roomName: string
): Promise<{ rules: number; skipped: number }> {
  const ctx = await buildImportContext(prisma, termId)
  const roomId = ctx.roomByName.get(roomName)
  if (!roomId) throw new Error(`특별실 없음: ${roomName}`)

  const grades = await prisma.grade.findMany({
    where: { termId },
    include: { classGroups: { orderBy: { number: 'asc' } } },
  })
  const classesByGrade = new Map<number, string[]>()
  for (const g of grades) {
    classesByGrade.set(
      g.number,
      g.classGroups.map((c) => c.id)
    )
  }

  await prisma.scheduleEntry.deleteMany({ where: { termId, roomId } })
  await prisma.scheduleRule.deleteMany({ where: { termId, roomId } })

  let rules = 0
  let skipped = 0

  for (const slot of schedule) {
    for (const cell of slot.cells) {
      const classIds = resolveClassIds(cell, ctx.classByKey, classesByGrade)
      if (classIds.length === 0) {
        skipped++
        continue
      }

      for (const classId of classIds) {
        const gradeNum = grades.find((g) => g.classGroups.some((c) => c.id === classId))?.number
        if (gradeNum == null) {
          skipped++
          continue
        }
        const periodNum = periodNumberForSlot(slot.period, gradeNum)
        if (periodNum < 0) {
          skipped++
          continue
        }

        const r = await createWeeklyRule(prisma, ctx, {
          roomId,
          classId,
          grade: gradeNum,
          periodNum,
          dayIndex: slot.dayIndex,
        })
        if (r === 'ok') rules++
        else skipped++
      }
    }
  }

  return { rules, skipped }
}
