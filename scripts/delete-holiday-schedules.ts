/**
 * 공휴일·재량휴업일(학사일정)에 걸린 특별실·전담 일정(ScheduleEntry) 삭제
 * 사용: npx tsx scripts/delete-holiday-schedules.ts [loginId] [공휴일|재량휴업일|all]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseDateKey, toDateKey } from '../src/lib/dates/date-key'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

function expandHolidayDates(
  events: { date: Date; endDate: Date | null }[]
): Date[] {
  const keys = new Set<string>()
  for (const e of events) {
    const start = parseDateKey(toDateKey(e.date))
    const end = e.endDate ? parseDateKey(toDateKey(e.endDate)) : start
    const cur = new Date(start)
    while (cur.getTime() <= end.getTime()) {
      keys.add(toDateKey(cur))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }
  return [...keys].map(parseDateKey)
}

async function main() {
  const loginId = process.argv[2] || 'nam'
  const mode = process.argv[3] || 'all'
  const types =
    mode === 'all'
      ? ['공휴일', '재량휴업일']
      : mode === '재량휴업일' || mode === '재량'
        ? ['재량휴업일']
        : ['공휴일']

  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user) throw new Error(`계정 없음: ${loginId}`)

  const terms = await prisma.schoolTerm.findMany({
    where: { tenantId: user.tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })

  let totalDeleted = 0

  for (const term of terms) {
    const events = await prisma.academicEvent.findMany({
      where: {
        termId: term.id,
        eventType: { in: types },
        allowException: false,
      },
    })

    if (events.length === 0) {
      console.log(`${term.year}년 ${term.semester}학기: ${types.join('/')} 없음`)
      continue
    }

    const blockedDates = expandHolidayDates(events)
    const result = await prisma.scheduleEntry.deleteMany({
      where: {
        termId: term.id,
        date: { in: blockedDates },
      },
    })

    totalDeleted += result.count
    console.log(
      `${term.year}년 ${term.semester}학기: ${types.join('/')} ${blockedDates.length}일 · 일정 ${result.count}건 삭제`
    )
  }

  console.log(`\n합계 ${totalDeleted}건 삭제 완료`)
  console.log('(반복 규칙은 유지됩니다. 휴업일에는 새 일정이 자동 생성되지 않습니다.)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
