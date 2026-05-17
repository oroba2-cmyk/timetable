/**
 * 전담교사 주간 시간표 import (1·2학기 동일 적용, 기존 전담 규칙 덮어쓰기)
 * 사용: npx tsx scripts/import-specialist-schedules.ts [loginId]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { deleteSpecialistRules, importSpecialistSchedule } from './lib/specialist-import'

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
    console.log(`\n=== ${term.year}년 ${term.semester}학기 ===`)
    const deleted = await deleteSpecialistRules(prisma, term.id)
    console.log(`기존 전담 규칙 ${deleted}건 삭제`)

    const { rules, skipped, teachers } = await importSpecialistSchedule(prisma, term.id)
    const entries = await prisma.scheduleEntry.count({
      where: { termId: term.id, roomId: null },
    })
    console.log(
      `전담 ${teachers.length}명 · 규칙 ${rules}건 · 스킵 ${skipped} · 일정 ${entries}건`
    )
    console.log(`  교사: ${teachers.join(', ')}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
