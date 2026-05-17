import { PrismaClient, Subject } from '../../src/generated/prisma'
import { expandRule } from '../../src/engine/expander'
import type { ParsedSlot, SubjectCode } from './waseok-schedule-parser'
import {
  TEACHER_NAME_BY_KEY,
  ROOM_NAME_BY_KEY,
  defaultSubjectCodeForRoom,
} from './waseok-schedule-parser'

export interface ImportContext {
  termId: string
  termStart: Date
  termEnd: Date
  classByKey: Map<string, string>
  /** 학년·교시 → periodId (gradeNumber 0이 있으면 공통 교시 우선) */
  periodByGradeAndNumber: Map<string, string>
  roomByName: Map<string, string>
  teacherByName: Map<string, string>
  subjects: Subject[]
}

export function classKey(grade: number, classNum: number): string {
  return `${grade}-${classNum}`
}

export function buildImportContext(
  prisma: PrismaClient,
  termId: string
): Promise<ImportContext> {
  return (async () => {
    const term = await prisma.schoolTerm.findUniqueOrThrow({ where: { id: termId } })
    const grades = await prisma.grade.findMany({
      where: { termId },
      include: { classGroups: true },
    })
    const classByKey = new Map<string, string>()
    for (const g of grades) {
      for (const c of g.classGroups) {
        classByKey.set(classKey(g.number, c.number), c.id)
      }
    }

    const periods = await prisma.period.findMany({
      where: { termId },
      orderBy: [{ gradeNumber: 'asc' }, { number: 'asc' }],
    })
    const periodByGradeAndNumber = new Map<string, string>()
    for (const p of periods) {
      periodByGradeAndNumber.set(`${p.gradeNumber}-${p.number}`, p.id)
    }

    const rooms = await prisma.specialRoom.findMany({ where: { termId } })
    const roomByName = new Map(rooms.map((r) => [r.name, r.id]))

    const teachers = await prisma.teacher.findMany({ where: { termId } })
    const teacherByName = new Map(teachers.map((t) => [t.name, t.id]))

    const subjects = await prisma.subject.findMany({ where: { termId } })

    return {
      termId,
      termStart: term.startDate,
      termEnd: term.endDate,
      classByKey,
      periodByGradeAndNumber,
      roomByName,
      teacherByName,
      subjects,
    }
  })()
}

/** PDF c/d·담당 학급 기준 A/B 분반 선택 */
export function resolveSubjectId(
  ctx: ImportContext,
  slot: ParsedSlot,
  teacherName?: string,
  roomKey?: string
): string | undefined {
  let code: SubjectCode | undefined = slot.subjectCode
  if (!code && roomKey) {
    code = defaultSubjectCodeForRoom(roomKey)
  }
  if (!code) return undefined

  const { grade, classNum } = slot
  const subs = ctx.subjects.filter((s) => {
    if (code === '과') return s.name.includes('과학') && s.name.startsWith(String(grade))
    if (code === '영') return s.name.includes('영어') && s.name.startsWith(String(grade))
    if (code === '즐') return s.name.includes('놀이') && s.name.startsWith(String(grade))
    return false
  })

  if (subs.length === 0) return undefined
  if (subs.length === 1) return subs[0].id

  const pickAb = (aName: string, bName: string, useA: boolean) => {
    const pick = subs.find((s) => s.name === (useA ? aName : bName))
    return pick?.id ?? subs[0].id
  }

  if (code === '과' && grade === 5) {
    if (teacherName === '김현진') return pickAb('5과학A', '5과학B', classNum <= 7)
    return pickAb('5과학A', '5과학B', classNum <= 5)
  }
  if (code === '과' && grade === 6) {
    if (teacherName === '김자영') return pickAb('6과학A', '6과학B', classNum <= 4)
    return pickAb('6과학A', '6과학B', classNum <= 5)
  }
  if (code === '영' && grade === 5) {
    return pickAb('5영어A', '5영어B', classNum <= 5)
  }
  if (code === '영' && grade === 6) {
    return pickAb('6영어A', '6영어B', classNum <= 4)
  }
  if (code === '즐' && grade === 1) {
    if (teacherName === '한송화') return pickAb('1놀이A', '1놀이B', true)
    if (teacherName === '이호연') return pickAb('1놀이A', '1놀이B', false)
    return pickAb('1놀이A', '1놀이B', classNum <= 4)
  }
  if (code === '즐' && grade === 2) {
    if (teacherName === '신갑천') return pickAb('2놀이A', '2놀이B', true)
    if (teacherName === '우주희') return pickAb('2놀이A', '2놀이B', false)
    return pickAb('2놀이A', '2놀이B', classNum <= 4)
  }

  const withA = subs.find((s) => s.name.endsWith('A'))
  const withB = subs.find((s) => s.name.endsWith('B'))
  if (withA && withB) {
    const maxClass = Math.max(
      ...[...ctx.classByKey.keys()]
        .filter((k) => k.startsWith(`${grade}-`))
        .map((k) => parseInt(k.split('-')[1], 10))
    )
    return (classNum <= maxClass / 2 ? withA : withB).id
  }
  return subs[0].id
}

function resolvePeriodId(ctx: ImportContext, grade: number, periodNum: number): string | undefined {
  return (
    ctx.periodByGradeAndNumber.get(`${grade}-${periodNum}`) ??
    ctx.periodByGradeAndNumber.get(`0-${periodNum}`)
  )
}

export async function createWeeklyRule(
  prisma: PrismaClient,
  ctx: ImportContext,
  opts: {
    roomId?: string
    classId: string
    subjectId?: string
    teacherId?: string
    grade: number
    periodNum: number
    dayIndex: number
  }
): Promise<'ok' | 'skip' | 'error'> {
  const periodId = resolvePeriodId(ctx, opts.grade, opts.periodNum)
  if (!periodId) return 'skip'

  const startDate = ctx.termStart.toISOString().slice(0, 10)
  const academicEvents = await prisma.academicEvent.findMany({ where: { termId: ctx.termId } })
  const dates = expandRule(
    {
      startDate: ctx.termStart,
      repeatInterval: 1,
      repeatUnit: 'WEEK',
      repeatDays: [opts.dayIndex],
      endType: 'NONE',
      endDate: null,
      endCount: null,
    },
    academicEvents.map((e) => ({
      date: e.date,
      endDate: e.endDate,
      allowException: e.allowException,
    })),
    ctx.termEnd
  )

  try {
    const rule = await prisma.scheduleRule.create({
      data: {
        termId: ctx.termId,
        roomId: opts.roomId ?? null,
        classId: opts.classId,
        subjectId: opts.subjectId ?? null,
        teacherId: opts.teacherId ?? null,
        periodId,
        startDate: ctx.termStart,
        repeatInterval: 1,
        repeatUnit: 'WEEK',
        repeatDays: [opts.dayIndex],
        endType: 'NONE',
      },
    })

    for (const date of dates) {
      await prisma.scheduleEntry.upsert({
        where: {
          date_periodId_classId: {
            date,
            periodId,
            classId: opts.classId,
          },
        },
        create: {
          termId: ctx.termId,
          date,
          periodId,
          roomId: opts.roomId ?? null,
          classId: opts.classId,
          subjectId: opts.subjectId ?? null,
          teacherId: opts.teacherId ?? null,
          source: 'RULE',
          sourceRuleId: rule.id,
          status: 'NORMAL',
        },
        update: {
          roomId: opts.roomId ?? null,
          subjectId: opts.subjectId ?? null,
          teacherId: opts.teacherId ?? null,
          sourceRuleId: rule.id,
          status: 'NORMAL',
        },
      })
    }
    return 'ok'
  } catch (e) {
    console.error('[createWeeklyRule]', e)
    return 'error'
  }
}

export function resolveTeacherId(ctx: ImportContext, teacherKey: string): string | undefined {
  const name = TEACHER_NAME_BY_KEY[teacherKey] ?? teacherKey
  return ctx.teacherByName.get(name)
}

export function resolveRoomId(ctx: ImportContext, roomKey: string): string | undefined {
  const dbName = ROOM_NAME_BY_KEY[roomKey]
  if (!dbName) return undefined
  return ctx.roomByName.get(dbName)
}
