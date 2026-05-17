import type { Prisma } from '@/generated/prisma'

export type ViewEntryFilters = {
  roomId?: string | null
  classId?: string | null
  periodNumber?: number | null
  type?: 'all' | 'room' | 'specialist'
}

/** 달력·목록 보기용 일정 조회 조건 (DB에서 먼저 걸러 응답 크기·쿼리 수 축소) */
export function buildViewEntryWhere(
  termId: string,
  fromStr: string,
  toStr: string,
  filters: ViewEntryFilters = {}
): Prisma.ScheduleEntryWhereInput {
  const where: Prisma.ScheduleEntryWhereInput = {
    termId,
    date: { gte: new Date(fromStr), lte: new Date(`${toStr}T23:59:59`) },
    status: { not: 'EXCEPTION_CANCELLED' },
  }

  if (filters.roomId) where.roomId = filters.roomId
  if (filters.classId) where.classId = filters.classId
  if (filters.periodNumber != null) {
    where.period = { termId, number: filters.periodNumber }
  }
  if (filters.type === 'room') where.roomId = { not: null }
  if (filters.type === 'specialist') where.roomId = null

  return where
}

export const viewEntrySelect = {
  id: true,
  date: true,
  status: true,
  roomId: true,
  periodId: true,
  classId: true,
  period: { select: { number: true, startTime: true, endTime: true } },
  room: { select: { name: true } },
  classGroup: { select: { number: true, grade: { select: { number: true } } } },
  subject: { select: { name: true } },
  teacher: { select: { name: true } },
} satisfies Prisma.ScheduleEntrySelect

export type ViewScheduleEntry = Prisma.ScheduleEntryGetPayload<{ select: typeof viewEntrySelect }>
