import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { buildExcelBuffer } from '@/lib/excel/exporter'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const termId = searchParams.get('termId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const roomId = searchParams.get('room')

  if (!termId) {
    return NextResponse.json({ error: 'termId required' }, { status: 400 })
  }

  const fromDate = from ? new Date(from) : undefined
  const toDate = to ? new Date(to) : undefined

  const entries = await prisma.scheduleEntry.findMany({
    where: {
      termId,
      ...(fromDate || toDate ? { date: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
      ...(roomId ? { roomId } : {}),
    },
    include: {
      room: true,
      classGroup: { include: { grade: true } },
      subject: true,
      teacher: true,
      period: true,
    },
    orderBy: [{ date: 'asc' }, { period: { number: 'asc' } }],
  })

  const buffer = await buildExcelBuffer(entries as any)
  const filename = `timetable_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
