import type { PrismaClient } from '@/generated/prisma'
import {
  HOLIDAY_EVENT_TYPES,
  parseDateKey,
  termContainsDate,
  toDateKey,
} from '@/lib/dates/date-key'

/** 공휴일·재량휴업일을 같은 테넌트의 모든 학기에 맞는 날짜로 동기화 */
export async function syncHolidaysAcrossTenantTerms(
  prisma: PrismaClient,
  termId: string
): Promise<number> {
  const term = await prisma.schoolTerm.findUniqueOrThrow({
    where: { id: termId },
    select: { tenantId: true },
  })
  const terms = await prisma.schoolTerm.findMany({ where: { tenantId: term.tenantId } })
  const holidayTypes = [...HOLIDAY_EVENT_TYPES]

  const allEvents = await prisma.academicEvent.findMany({
    where: {
      termId: { in: terms.map((t) => t.id) },
      eventType: { in: holidayTypes },
    },
  })

  type Canonical = { eventType: string; dateKey: string; note: string | null }
  const canonical = new Map<string, Canonical>()

  for (const e of allEvents) {
    const owner = terms.find((t) => t.id === e.termId)!
    const dateKey = toDateKey(e.date)
    if (!termContainsDate(owner, dateKey)) continue
    const key = `${e.eventType}|${dateKey}|${e.note ?? ''}`
    canonical.set(key, { eventType: e.eventType, dateKey, note: e.note })
  }

  let upserted = 0
  for (const t of terms) {
    const misaligned = await prisma.academicEvent.findMany({
      where: { termId: t.id, eventType: { in: holidayTypes } },
    })
    for (const e of misaligned) {
      if (!termContainsDate(t, toDateKey(e.date))) {
        await prisma.academicEvent.delete({ where: { id: e.id } })
      }
    }

    for (const c of canonical.values()) {
      if (!termContainsDate(t, c.dateKey)) continue
      const date = parseDateKey(c.dateKey)
      const existing = await prisma.academicEvent.findFirst({
        where: { termId: t.id, eventType: c.eventType, date },
      })
      if (!existing) {
        await prisma.academicEvent.create({
          data: {
            termId: t.id,
            eventType: c.eventType,
            date,
            allowException: false,
            note: c.note,
          },
        })
        upserted++
      }
    }
  }

  return upserted
}
