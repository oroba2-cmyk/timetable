/**
 * nam 계정: 2학기 데이터를 1학기(빈 학기)로 복제
 * 사용: npx tsx scripts/fill-nam-semesters.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { cloneTermWithinTenant } from './lib/tenant-clone'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const user = await prisma.user.findUnique({ where: { loginId: 'nam' } })
  if (!user) throw new Error('nam 계정 없음')

  const terms = await prisma.schoolTerm.findMany({
    where: { tenantId: user.tenantId, year: 2026 },
    orderBy: { semester: 'asc' },
  })

  const sem1 = terms.find((t) => t.semester === 1)
  const sem2 = terms.find((t) => t.semester === 2)
  if (!sem1 || !sem2) throw new Error('2026년 1·2학기가 모두 필요합니다.')

  const sem2Grades = await prisma.grade.count({ where: { termId: sem2.id } })
  if (sem2Grades === 0) throw new Error('2학기에 복제할 데이터가 없습니다.')

  const sem1Grades = await prisma.grade.count({ where: { termId: sem1.id } })
  if (sem1Grades > 0) {
    console.log('1학기에 데이터가 있어 건너뜁니다. 비우려면 데이터 관리에서 초기화하세요.')
    return
  }

  console.log(`복제: ${sem2.year}년 ${sem2.semester}학기 → ${sem1.semester}학기`)
  console.log(`  기간 ${sem1.startDate.toISOString().slice(0, 10)} ~ ${sem1.endDate.toISOString().slice(0, 10)}`)

  await cloneTermWithinTenant(prisma, sem2.id, sem1.id)

  const rules = await prisma.scheduleRule.count({ where: { termId: sem1.id } })
  const entries = await prisma.scheduleEntry.count({ where: { termId: sem1.id } })
  console.log(`완료 — 1학기 규칙 ${rules}건, 일정 ${entries}건`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
