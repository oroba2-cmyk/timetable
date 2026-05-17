import type { PrismaClient } from '@/generated/prisma'
import { parseDateKey, termContainsDate } from '@/lib/dates/date-key'
import { syncHolidaysAcrossTenantTerms } from '@/lib/academic-calendar/sync-holidays'

const KASI_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

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

export async function importPublicHolidaysCore(
  prisma: PrismaClient,
  termId: string,
  startYM: string,
  endYM: string
): Promise<{ count: number }> {
  const serviceKey = process.env.KASI_API_KEY
  if (!serviceKey) throw new Error('API 키가 설정되지 않았습니다.')

  const [sy, sm] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  const allItems: KasiItem[] = []
  let cy = sy
  let cm = sm
  while (cy < ey || (cy === ey && cm <= em)) {
    const items = await fetchKasiMonth(cy, cm, serviceKey)
    allItems.push(...items)
    if (cm === 12) {
      cy++
      cm = 1
    } else cm++
  }

  let count = 0
  const tenant = await prisma.schoolTerm.findUniqueOrThrow({
    where: { id: termId },
    select: { tenantId: true },
  })
  const terms = await prisma.schoolTerm.findMany({ where: { tenantId: tenant.tenantId } })

  for (const item of allItems) {
    const dateStr = locdateToIso(item.locdate)
    const date = parseDateKey(dateStr)
    for (const t of terms) {
      if (!termContainsDate(t, dateStr)) continue
      const existing = await prisma.academicEvent.findFirst({
        where: { termId: t.id, eventType: '공휴일', date },
      })
      if (!existing) {
        await prisma.academicEvent.create({
          data: {
            termId: t.id,
            eventType: '공휴일',
            date,
            allowException: false,
            note: item.dateName,
          },
        })
        count++
      }
    }
  }

  await syncHolidaysAcrossTenantTerms(prisma, termId)
  return { count }
}
