export interface EntryLike {
  id: string
  date: Date
  periodId: string
  roomId: string | null
  classId: string
  teacherId: string | null
  status: string
}

export interface RoomInfo {
  id: string
  capacity: number
}

export interface UnavailabilityInput {
  dayOfWeek: number // 0=월, 4=금
  periodId: string
}

export type ConflictType =
  | 'ROOM_CAPACITY'
  | 'CLASS_DOUBLE_BOOKING'
  | 'TEACHER_DOUBLE_BOOKING'
  | 'ROOM_UNAVAILABLE'
  | 'TEACHER_UNAVAILABLE'

export interface ConflictInfo {
  type: ConflictType
  message: string
}

export interface ConflictResult {
  hasConflict: boolean
  conflicts: ConflictInfo[]
}

interface CheckParams {
  entry: {
    date: Date
    periodId: string
    roomId: string | null
    classId: string
    teacherId: string | null
  }
  existing: EntryLike[]
  room: RoomInfo | null                       // null for specialist (no room)
  roomUnavailabilities: UnavailabilityInput[] // empty for specialist
  teacherUnavailabilities: UnavailabilityInput[]
  excludeEntryId?: string
}

function isSameDayUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function toMondayBasedDayUTC(date: Date): number {
  const d = date.getUTCDay()
  return d === 0 ? 6 : d - 1
}

export function checkConflict(params: CheckParams): ConflictResult {
  const { entry, existing, room, roomUnavailabilities, teacherUnavailabilities, excludeEntryId } = params
  const conflicts: ConflictInfo[] = []

  const active = existing.filter(
    (e) => e.id !== excludeEntryId && e.status !== 'EXCEPTION_CANCELLED'
  )

  const sameSlot = active.filter(
    (e) => isSameDayUTC(e.date, entry.date) && e.periodId === entry.periodId
  )

  // 1. 특별실 용량 초과 (only when room is assigned)
  if (entry.roomId && room) {
    const roomUsage = sameSlot.filter((e) => e.roomId === entry.roomId).length
    if (roomUsage >= room.capacity) {
      conflicts.push({
        type: 'ROOM_CAPACITY',
        message: `특별실 수용 인원 초과 (최대 ${room.capacity}개 학급 동시 사용 가능)`,
      })
    }
  }

  // 2. 학급 중복 배정
  if (sameSlot.some((e) => e.classId === entry.classId)) {
    conflicts.push({
      type: 'CLASS_DOUBLE_BOOKING',
      message: '해당 학급이 같은 날짜·교시에 이미 배정되어 있습니다',
    })
  }

  // 3. 교사 중복 배정
  if (entry.teacherId && sameSlot.some((e) => e.teacherId === entry.teacherId)) {
    conflicts.push({
      type: 'TEACHER_DOUBLE_BOOKING',
      message: '해당 교사가 같은 날짜·교시에 이미 배정되어 있습니다',
    })
  }

  // 4. 특별실 비가용 시간 (only when room is assigned)
  if (entry.roomId) {
    const dayOfWeek = toMondayBasedDayUTC(entry.date)
    if (roomUnavailabilities.some((u) => u.dayOfWeek === dayOfWeek && u.periodId === entry.periodId)) {
      conflicts.push({
        type: 'ROOM_UNAVAILABLE',
        message: '특별실이 해당 요일·교시에 사용 불가로 설정되어 있습니다',
      })
    }
  }

  // 5. 교사 비가용 시간
  if (entry.teacherId) {
    const dayOfWeek = toMondayBasedDayUTC(entry.date)
    if (teacherUnavailabilities.some((u) => u.dayOfWeek === dayOfWeek && u.periodId === entry.periodId)) {
      conflicts.push({
        type: 'TEACHER_UNAVAILABLE',
        message: '교사가 해당 요일·교시에 비가용으로 설정되어 있습니다',
      })
    }
  }

  return { hasConflict: conflicts.length > 0, conflicts }
}
