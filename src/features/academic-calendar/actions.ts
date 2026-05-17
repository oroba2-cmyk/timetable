'use server'

import { prisma } from '@/lib/db/client'
import { termContainsDate, parseDateKey, HOLIDAY_EVENT_TYPES } from '@/lib/dates/date-key'
import { syncHolidaysAcrossTenantTerms as syncHolidays } from '@/lib/academic-calendar/sync-holidays'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { AcademicEvent } from '@/generated/prisma'

const CALENDAR_PATHS = ['/academic-calendar', '/view', '/calendar', '/list'] as const

function revalidateCalendarPaths() {
  for (const p of CALENDAR_PATHS) revalidatePath(p)
}

export async function syncHolidaysAcrossTenantTerms(termId: string): Promise<number> {
  const n = await syncHolidays(prisma, termId)
  revalidateCalendarPaths()
  return n
}

export async function listAcademicEvents(termId: string): Promise<AcademicEvent[]> {
  return prisma.academicEvent.findMany({ where: { termId }, orderBy: { date: 'asc' } })
}

export async function createAcademicEvent(data: {
  termId: string
  eventType: string
  date: string
  endDate?: string
  allowException: boolean
  note?: string
}): Promise<ActionResult<AcademicEvent>> {
  try {
    const event = await prisma.academicEvent.create({
      data: {
        ...data,
        date: parseDateKey(data.date),
        endDate: data.endDate ? parseDateKey(data.endDate) : null,
      },
    })
    revalidateCalendarPaths()
    if ((HOLIDAY_EVENT_TYPES as readonly string[]).includes(data.eventType)) {
      await syncHolidaysAcrossTenantTerms(data.termId)
    }
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateAcademicEvent(
  id: string,
  data: { eventType: string; date: string; endDate?: string; allowException: boolean; note?: string }
): Promise<ActionResult<AcademicEvent>> {
  try {
    const event = await prisma.academicEvent.update({
      where: { id },
      data: {
        ...data,
        date: parseDateKey(data.date),
        endDate: data.endDate ? parseDateKey(data.endDate) : null,
      },
    })
    revalidateCalendarPaths()
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteAcademicEvent(id: string): Promise<ActionResult> {
  try {
    await prisma.academicEvent.delete({ where: { id } })
    revalidateCalendarPaths()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학사일정 삭제 중 오류가 발생했습니다.' }
  }
}

// ---- Key dates (기본 학사일정) ----

export type KeyDateType =
  | '시업식'
  | '여름방학식'
  | '여름방학'
  | '개학식'
  | '겨울방학식'
  | '겨울방학'

export type KeyDates = Partial<Record<KeyDateType, { date: string; endDate?: string }>>

export async function getKeyDates(termId: string): Promise<KeyDates> {
  const types: KeyDateType[] = ['시업식', '여름방학식', '여름방학', '개학식', '겨울방학식', '겨울방학']
  const events = await prisma.academicEvent.findMany({
    where: { termId, eventType: { in: types } },
  })
  const result: KeyDates = {}
  for (const e of events) {
    const t = e.eventType as KeyDateType
    result[t] = {
      date: new Date(e.date).toISOString().slice(0, 10),
      endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 10) : undefined,
    }
  }
  return result
}

export async function upsertKeyDates(termId: string, dates: KeyDates): Promise<ActionResult> {
  try {
    for (const [type, val] of Object.entries(dates) as [KeyDateType, { date: string; endDate?: string }][]) {
      if (!val?.date) continue
      const existing = await prisma.academicEvent.findFirst({ where: { termId, eventType: type } })
      const data = {
        date: new Date(val.date),
        endDate: val.endDate ? new Date(val.endDate) : null,
        allowException: false,
      }
      if (existing) {
        await prisma.academicEvent.update({ where: { id: existing.id }, data })
      } else {
        await prisma.academicEvent.create({ data: { termId, eventType: type, ...data } })
      }
    }
    revalidateCalendarPaths()
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '기본 학사일정 저장 중 오류가 발생했습니다.' }
  }
}

import { importPublicHolidaysCore } from '@/lib/academic-calendar/import-holidays'

export async function importPublicHolidays(
  termId: string,
  startYM: string,
  endYM: string
): Promise<ActionResult<{ count: number }>> {
  try {
    const { count } = await importPublicHolidaysCore(prisma, termId, startYM, endYM)
    revalidateCalendarPaths()
    return { success: true, data: { count } }
  } catch (e) {
    return {
      success: false,
      error: `공휴일 정보를 불러오는 중 오류가 발생했습니다. (${e instanceof Error ? e.message : '알 수 없는 오류'})`,
    }
  }
}

export async function importSpecificDates(
  termId: string,
  dates: string[],
  label: string
): Promise<ActionResult<{ count: number }>> {
  try {
    let count = 0
    const tenant = await prisma.schoolTerm.findUniqueOrThrow({
      where: { id: termId },
      select: { tenantId: true },
    })
    const terms = await prisma.schoolTerm.findMany({ where: { tenantId: tenant.tenantId } })

    for (const dateStr of dates) {
      const date = parseDateKey(dateStr)
      for (const t of terms) {
        if (!termContainsDate(t, dateStr)) continue
        const existing = await prisma.academicEvent.findFirst({
          where: { termId: t.id, eventType: label, date },
        })
        if (!existing) {
          await prisma.academicEvent.create({
            data: { termId: t.id, eventType: label, date, allowException: false },
          })
          count++
        }
      }
    }
    await syncHolidaysAcrossTenantTerms(termId)
    revalidateCalendarPaths()
    return { success: true, data: { count } }
  } catch {
    return { success: false, error: '일정 등록 중 오류가 발생했습니다.' }
  }
}

const KEY_EVENT_TYPES = ['시업식', '여름방학식', '여름방학', '개학식', '겨울방학식', '겨울방학']

export async function deleteOtherAcademicEvents(termId: string): Promise<ActionResult> {
  try {
    await prisma.academicEvent.deleteMany({
      where: { termId, eventType: { notIn: KEY_EVENT_TYPES } },
    })
    revalidatePath('/academic-calendar')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '삭제 중 오류가 발생했습니다.' }
  }
}

export async function importHolidaysFromText(
  termId: string,
  text: string,
  label: string
): Promise<ActionResult<{ count: number }>> {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    let count = 0
    for (const line of lines) {
      const dateStr = line.slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue
      const existing = await prisma.academicEvent.findFirst({ where: { termId, date: new Date(dateStr) } })
      if (!existing) {
        await prisma.academicEvent.create({
          data: { termId, eventType: label || '공휴일', date: new Date(dateStr), allowException: false },
        })
        count++
      }
    }
    revalidatePath('/academic-calendar')
    return { success: true, data: { count } }
  } catch {
    return { success: false, error: '일정 등록 중 오류가 발생했습니다.' }
  }
}
