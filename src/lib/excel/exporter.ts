import ExcelJS from 'exceljs'
import { ScheduleEntry, SpecialRoom } from '@/generated/prisma'

type EntryWithRelations = ScheduleEntry & {
  room: SpecialRoom
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
  period: { number: number; startTime: string; endTime: string }
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_LABELS: Record<string, string> = {
  NORMAL: '정상',
  FORCE_ASSIGNED: '충돌',
  EXCEPTION_CANCELLED: '취소',
  EXCEPTION_ALLOWED: '예외허용',
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E1F2' },
}

const HEADER_FILL_GREEN: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2EFDA' },
}

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true }

function applyHeaderStyle(row: ExcelJS.Row, fill: ExcelJS.Fill): void {
  row.font = HEADER_FONT
  row.fill = fill
}

export async function buildExcelBuffer(entries: EntryWithRelations[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // Sheet 1: 전체 배정 목록
  const allSheet = workbook.addWorksheet('전체 배정 목록')
  allSheet.columns = [
    { header: '날짜', key: 'date', width: 14 },
    { header: '요일', key: 'weekday', width: 6 },
    { header: '교시', key: 'period', width: 8 },
    { header: '시작', key: 'startTime', width: 8 },
    { header: '종료', key: 'endTime', width: 8 },
    { header: '특별실', key: 'room', width: 14 },
    { header: '학년', key: 'grade', width: 6 },
    { header: '반', key: 'classNum', width: 6 },
    { header: '과목', key: 'subject', width: 12 },
    { header: '교사', key: 'teacher', width: 10 },
    { header: '상태', key: 'status', width: 10 },
  ]
  applyHeaderStyle(allSheet.getRow(1), HEADER_FILL)

  for (const e of entries) {
    if (e.status === 'EXCEPTION_CANCELLED') continue
    const date = new Date(e.date)
    allSheet.addRow({
      date: date.toLocaleDateString('ko-KR'),
      weekday: WEEKDAYS[date.getDay()],
      period: `${e.period.number}교시`,
      startTime: e.period.startTime,
      endTime: e.period.endTime,
      room: e.room.name,
      grade: `${e.classGroup.grade.number}학년`,
      classNum: `${e.classGroup.number}반`,
      subject: e.subject?.name ?? '',
      teacher: e.teacher?.name ?? '',
      status: STATUS_LABELS[e.status ?? ''] ?? (e.status ?? ''),
    })
  }

  // Sheet 2: 특별실별 사용 현황
  const statsSheet = workbook.addWorksheet('특별실별 사용 현황')
  statsSheet.columns = [
    { header: '특별실', key: 'room', width: 14 },
    { header: '사용 일수', key: 'days', width: 12 },
    { header: '총 교시 수', key: 'sessions', width: 12 },
  ]
  applyHeaderStyle(statsSheet.getRow(1), HEADER_FILL)

  const roomStats = new Map<string, { dates: Set<string>; sessions: number }>()
  for (const e of entries) {
    if (e.status === 'EXCEPTION_CANCELLED') continue
    const roomName = e.room.name
    if (!roomStats.has(roomName)) {
      roomStats.set(roomName, { dates: new Set(), sessions: 0 })
    }
    const stat = roomStats.get(roomName)!
    stat.dates.add(new Date(e.date).toISOString().slice(0, 10))
    stat.sessions += 1
  }

  for (const [roomName, stat] of roomStats.entries()) {
    statsSheet.addRow({
      room: roomName,
      days: stat.dates.size,
      sessions: stat.sessions,
    })
  }

  // Sheets 3+: Per-room sheets (up to 5 rooms)
  const roomNames = Array.from(roomStats.keys()).slice(0, 5)

  for (const roomName of roomNames) {
    const roomEntries = entries
      .filter(e => e.room.name === roomName && e.status !== 'EXCEPTION_CANCELLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const roomSheet = workbook.addWorksheet(roomName.slice(0, 30))
    roomSheet.columns = [
      { header: '날짜', key: 'date', width: 14 },
      { header: '요일', key: 'weekday', width: 8 },
      { header: '교시', key: 'period', width: 8 },
      { header: '학년', key: 'grade', width: 8 },
      { header: '반', key: 'classNum', width: 8 },
      { header: '과목', key: 'subject', width: 12 },
      { header: '교사', key: 'teacher', width: 10 },
    ]
    applyHeaderStyle(roomSheet.getRow(1), HEADER_FILL_GREEN)

    for (const e of roomEntries) {
      const date = new Date(e.date)
      roomSheet.addRow({
        date: date.toLocaleDateString('ko-KR'),
        weekday: WEEKDAYS[date.getDay()],
        period: `${e.period.number}교시`,
        grade: `${e.classGroup.grade.number}학년`,
        classNum: `${e.classGroup.number}반`,
        subject: e.subject?.name ?? '',
        teacher: e.teacher?.name ?? '',
      })
    }

    roomSheet.columns.forEach(col => {
      if ((col.width ?? 0) < 10) col.width = 10
    })
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer) as Buffer
}
