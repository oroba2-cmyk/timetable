/**
 * 체육관 시간표 import (1·2학기 동일 적용)
 * 사용: npx tsx scripts/import-gym-schedule.ts [loginId]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { importGymSchedule } from './lib/gym-import'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const loginId = process.argv[2] || 'nam'
  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user) throw new Error(`계정 없음: ${loginId}`)

  const terms = await prisma.schoolTerm.findMany({
    where: { tenantId: user.tenantId, year: 2026 },
    orderBy: { semester: 'asc' },
  })

  for (const term of terms) {
    const { rules, skipped } = await importGymSchedule(prisma, term.id)
    const room = await prisma.specialRoom.findFirst({
      where: { termId: term.id, name: '체육관' },
    })
    const entries = room
      ? await prisma.scheduleEntry.count({ where: { termId: term.id, roomId: room.id } })
      : 0
    console.log(
      `${term.year}년 ${term.semester}학기: 규칙 ${rules}건, 스킵 ${skipped}, 엔트리 ${entries}건`
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
