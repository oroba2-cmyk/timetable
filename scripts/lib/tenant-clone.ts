import type { PrismaClient, Teacher } from '../../src/generated/prisma'
import { expandRule } from '../../src/engine/expander'

const KO = ['', '일', '이', '삼', '사', '오', '육'] as const

export function anonymizeName(
  teacher: Teacher,
  homeroom: { gradeNumber: number; classNumber: number } | undefined,
  subjectNames: string[]
): string {
  if (homeroom) {
    return `${KO[homeroom.gradeNumber] ?? homeroom.gradeNumber}${KO[homeroom.classNumber] ?? homeroom.classNumber}샘`
  }
  if (teacher.type === 'SPECIALIZED' && subjectNames[0]) {
    const s = subjectNames[0]
    const g = subjectNames.find((n) => /(\d)학년/.test(n))
    const gn = g ? Number(g.match(/(\d)/)?.[1] ?? 0) : 0
    const prefix = gn ? (KO[gn] ?? String(gn)) : ''
    if (s.includes('과학')) return `${prefix}과학`
    return `${prefix}${s.slice(0, 3)}`
  }
  return `샘${teacher.id.slice(-4)}`
}

function utcDayDiff(a: Date, b: Date): number {
  const au = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const bu = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((bu - au) / 86400000)
}

function shiftUtcDays(date: Date, days: number): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

/** 같은 테넌트 안에서 학기 데이터를 통째로 복제 (대상 학기는 비어 있어야 함) */
export async function cloneTermWithinTenant(
  prisma: PrismaClient,
  sourceTermId: string,
  targetTermId: string,
  options: { anonymizeTeachers?: boolean } = {}
) {
  const source = await prisma.schoolTerm.findUniqueOrThrow({ where: { id: sourceTermId } })
  const target = await prisma.schoolTerm.findUniqueOrThrow({ where: { id: targetTermId } })

  const existing = await prisma.grade.count({ where: { termId: targetTermId } })
  if (existing > 0) {
    throw new Error('대상 학기에 이미 데이터가 있습니다. 비운 뒤 다시 실행하세요.')
  }

  const dayOffset = utcDayDiff(source.startDate, target.startDate)
  const map = new Map<string, string>()
  const termId = targetTermId
  const oldTermId = sourceTermId
  const anonymizeTeachers = options.anonymizeTeachers ?? false

  for (const g of await prisma.grade.findMany({ where: { termId: oldTermId } })) {
    const ng = await prisma.grade.create({ data: { termId, number: g.number } })
    map.set(g.id, ng.id)
  }

  const oldGrades = await prisma.grade.findMany({ where: { termId: oldTermId } })
  const oldClassList = await prisma.classGroup.findMany({
    where: { gradeId: { in: oldGrades.map((g) => g.id) } },
  })

  for (const t of await prisma.teacher.findMany({ where: { termId: oldTermId } })) {
    const homeroom = oldClassList.find((c) => c.homeroomTeacherId === t.id)
    const grade = homeroom ? oldGrades.find((g) => g.id === homeroom.gradeId) : undefined
    const subs = await prisma.teacherSubject.findMany({
      where: { teacherId: t.id },
      include: { subject: true },
    })
    const name = anonymizeTeachers
      ? anonymizeName(
          t,
          homeroom && grade
            ? { gradeNumber: grade.number, classNumber: homeroom.number }
            : undefined,
          subs.map((s) => s.subject.name)
        )
      : t.name
    const nt = await prisma.teacher.create({ data: { termId, name, type: t.type } })
    map.set(t.id, nt.id)
  }

  for (const c of oldClassList) {
    const nc = await prisma.classGroup.create({
      data: {
        gradeId: map.get(c.gradeId)!,
        number: c.number,
        displayName: c.displayName,
        homeroomTeacherId: c.homeroomTeacherId ? map.get(c.homeroomTeacherId) ?? null : null,
      },
    })
    map.set(c.id, nc.id)
  }

  const oldSubjects = await prisma.subject.findMany({ where: { termId: oldTermId } })
  for (const s of oldSubjects) {
    const ns = await prisma.subject.create({
      data: {
        termId,
        name: s.name,
        isSpecialized: s.isSpecialized,
        requiresRoom: s.requiresRoom,
        weeklyHours: s.weeklyHours,
      },
    })
    map.set(s.id, ns.id)
  }

  for (const scg of await prisma.subjectClassGroup.findMany({
    where: { subjectId: { in: oldSubjects.map((s) => s.id) } },
  })) {
    await prisma.subjectClassGroup.create({
      data: {
        subjectId: map.get(scg.subjectId)!,
        classGroupId: map.get(scg.classGroupId)!,
      },
    })
  }

  const oldTeachers = await prisma.teacher.findMany({ where: { termId: oldTermId } })
  for (const ts of await prisma.teacherSubject.findMany({
    where: { teacherId: { in: oldTeachers.map((t) => t.id) } },
  })) {
    await prisma.teacherSubject.create({
      data: { teacherId: map.get(ts.teacherId)!, subjectId: map.get(ts.subjectId)! },
    })
  }

  for (const r of await prisma.specialRoom.findMany({ where: { termId: oldTermId } })) {
    const nr = await prisma.specialRoom.create({
      data: {
        termId,
        name: r.name,
        roomType: r.roomType,
        location: r.location,
        grades: r.grades,
        otherGradeNote: r.otherGradeNote,
        capacity: r.capacity,
        note: r.note,
      },
    })
    map.set(r.id, nr.id)
  }

  for (const p of await prisma.period.findMany({ where: { termId: oldTermId } })) {
    const np = await prisma.period.create({
      data: {
        termId,
        number: p.number,
        gradeNumber: p.gradeNumber,
        label: p.label,
        startTime: p.startTime,
        endTime: p.endTime,
      },
    })
    map.set(p.id, np.id)
  }

  for (const e of await prisma.academicEvent.findMany({ where: { termId: oldTermId } })) {
    await prisma.academicEvent.create({
      data: {
        termId,
        eventType: e.eventType,
        date: shiftUtcDays(e.date, dayOffset),
        endDate: e.endDate ? shiftUtcDays(e.endDate, dayOffset) : null,
        allowException: e.allowException,
        note: e.note,
      },
    })
  }

  for (const u of await prisma.teacherUnavailability.findMany({
    where: { teacherId: { in: oldTeachers.map((t) => t.id) } },
  })) {
    await prisma.teacherUnavailability.create({
      data: {
        teacherId: map.get(u.teacherId)!,
        dayOfWeek: u.dayOfWeek,
        periodId: map.get(u.periodId)!,
      },
    })
  }

  const oldRooms = await prisma.specialRoom.findMany({ where: { termId: oldTermId } })
  for (const u of await prisma.roomUnavailability.findMany({
    where: { roomId: { in: oldRooms.map((r) => r.id) } },
  })) {
    await prisma.roomUnavailability.create({
      data: {
        roomId: map.get(u.roomId)!,
        dayOfWeek: u.dayOfWeek,
        periodId: map.get(u.periodId)!,
      },
    })
  }

  const oldRules = await prisma.scheduleRule.findMany({ where: { termId: oldTermId } })
  const newRules: { id: string; oldId: string }[] = []

  for (const rule of oldRules) {
    const nr = await prisma.scheduleRule.create({
      data: {
        termId,
        roomId: rule.roomId ? map.get(rule.roomId) ?? null : null,
        classId: map.get(rule.classId)!,
        subjectId: rule.subjectId ? map.get(rule.subjectId) ?? null : null,
        teacherId: rule.teacherId ? map.get(rule.teacherId) ?? null : null,
        periodId: map.get(rule.periodId)!,
        startDate: target.startDate,
        repeatInterval: rule.repeatInterval,
        repeatUnit: rule.repeatUnit,
        repeatDays: rule.repeatDays,
        endType: rule.endType,
        endDate: rule.endDate ? shiftUtcDays(rule.endDate, dayOffset) : null,
        endCount: rule.endCount,
      },
    })
    newRules.push({ id: nr.id, oldId: rule.id })
    map.set(rule.id, nr.id)
  }

  const academicEvents = await prisma.academicEvent.findMany({ where: { termId } })
  const eventInputs = academicEvents.map((e) => ({
    date: e.date,
    endDate: e.endDate,
    allowException: e.allowException,
  }))

  for (const { id: ruleId } of newRules) {
    const rule = await prisma.scheduleRule.findUniqueOrThrow({ where: { id: ruleId } })
    const dates = expandRule(
      {
        startDate: rule.startDate,
        repeatInterval: rule.repeatInterval,
        repeatUnit: rule.repeatUnit,
        repeatDays: rule.repeatDays,
        endType: rule.endType,
        endDate: rule.endDate,
        endCount: rule.endCount,
      },
      eventInputs,
      target.endDate
    )

    for (const date of dates) {
      await prisma.scheduleEntry.upsert({
        where: {
          date_periodId_classId: {
            date,
            periodId: rule.periodId,
            classId: rule.classId,
          },
        },
        create: {
          termId,
          date,
          periodId: rule.periodId,
          roomId: rule.roomId,
          classId: rule.classId,
          subjectId: rule.subjectId,
          teacherId: rule.teacherId,
          source: 'RULE',
          sourceRuleId: rule.id,
          status: 'NORMAL',
        },
        update: {
          roomId: rule.roomId,
          subjectId: rule.subjectId,
          teacherId: rule.teacherId,
          sourceRuleId: rule.id,
          status: 'NORMAL',
        },
      })
    }
  }

  for (const res of await prisma.reservation.findMany({ where: { termId: oldTermId } })) {
    await prisma.reservation.create({
      data: {
        termId,
        date: shiftUtcDays(res.date, dayOffset),
        periodId: map.get(res.periodId)!,
        roomId: map.get(res.roomId)!,
        classId: map.get(res.classId)!,
        subjectId: res.subjectId ? map.get(res.subjectId) ?? null : null,
        teacherId: res.teacherId ? map.get(res.teacherId) ?? null : null,
        reason: res.reason,
      },
    })
  }
}

/** 테넌트의 모든 학기·시간표 데이터 삭제 (학기 삭제 시 하위 cascade) */
export async function wipeTenantTerms(prisma: PrismaClient, tenantId: string): Promise<number> {
  const { count } = await prisma.schoolTerm.deleteMany({ where: { tenantId } })
  return count
}

/** 대상 테넌트를 비운 뒤 소스 테넌트 데이터를 통째로 복제 */
export async function syncTenantFromSource(
  prisma: PrismaClient,
  sourceTenantId: string,
  targetTenantId: string,
  anonymizeTeachers: boolean
) {
  await wipeTenantTerms(prisma, targetTenantId)
  await cloneTenant(prisma, sourceTenantId, targetTenantId, anonymizeTeachers)
}

/** 소스 테넌트의 모든 학기·데이터를 대상 테넌트로 복제 */
export async function cloneTenant(
  prisma: PrismaClient,
  sourceTenantId: string,
  targetTenantId: string,
  anonymizeTeachers: boolean
) {
  const terms = await prisma.schoolTerm.findMany({ where: { tenantId: sourceTenantId } })

  for (const term of terms) {
    const nt = await prisma.schoolTerm.create({
      data: {
        tenantId: targetTenantId,
        year: term.year,
        semester: term.semester,
        startDate: term.startDate,
        endDate: term.endDate,
      },
    })
    await cloneTermWithinTenant(prisma, term.id, nt.id, { anonymizeTeachers })
  }
}
