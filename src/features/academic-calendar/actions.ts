'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { AcademicEvent } from '@/generated/prisma'

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
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })
    revalidatePath('/academic-calendar')
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
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })
    revalidatePath('/academic-calendar')
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteAcademicEvent(id: string): Promise<ActionResult> {
  try {
    await prisma.academicEvent.delete({ where: { id } })
    revalidatePath('/academic-calendar')
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
    revalidatePath('/academic-calendar')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '기본 학사일정 저장 중 오류가 발생했습니다.' }
  }
}

// ---- Public holiday import (한국천문연구원 특일 정보 API) ----

const KASI_BASE = 'http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

type KasiItem = { locdate: number | string; dateName: string; isHoliday: string }

async function fetchKasiMonth(year: number, month: number, serviceKey: string): Promise<KasiItem[]> {
  const url = `${KASI_BASE}/getRestDeInfo?solYear=${year}&solMonth=${String(month).padStart(2, '0')}&ServiceKey=${serviceKey}&_type=json&numOfRows=50`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const items = json?.response?.body?.items
  if (!items || items === '') return []
  const item = items.item
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

function locdateToIso(locdate: number | string): string {
  const s = String(locdate)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

export async function importPublicHolidays(
  termId: string,
  startYM: string,  // "YYYY-MM"
  endYM: string     // "YYYY-MM"
): Promise<ActionResult<{ count: number }>> {
  const serviceKey = process.env.KASI_API_KEY
  if (!serviceKey) return { success: false, error: 'API 키가 설정되지 않았습니다.' }

  try {
    const [sy, sm] = startYM.split('-').map(Number)
    const [ey, em] = endYM.split('-').map(Number)
    const allItems: KasiItem[] = []
    let cy = sy, cm = sm
    while (cy < ey || (cy === ey && cm <= em)) {
      const items = await fetchKasiMonth(cy, cm, serviceKey)
      allItems.push(...items)
      if (cm === 12) { cy++; cm = 1 } else cm++
    }

    let count = 0
    for (const item of allItems) {
      const dateStr = locdateToIso(item.locdate)
      const date = new Date(dateStr)
      const existing = await prisma.academicEvent.findFirst({ where: { termId, date } })
      if (!existing) {
        await prisma.academicEvent.create({
          data: { termId, eventType: '공휴일', date, allowException: false, note: item.dateName },
        })
        count++
      }
    }
    revalidatePath('/academic-calendar')
    return { success: true, data: { count } }
  } catch (e) {
    return { success: false, error: `공휴일 정보를 불러오는 중 오류가 발생했습니다. (${e instanceof Error ? e.message : '알 수 없는 오류'})` }
  }
}

export async function importSpecificDates(
  termId: string,
  dates: string[],
  label: string
): Promise<ActionResult<{ count: number }>> {
  try {
    let count = 0
    for (const dateStr of dates) {
      const date = new Date(dateStr)
      const existing = await prisma.academicEvent.findFirst({ where: { termId, date } })
      if (!existing) {
        await prisma.academicEvent.create({
          data: { termId, eventType: label, date, allowException: false },
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
