/**
 * 테넌트 학기별 공휴일·재량휴업일 동기화 (잘못 복제된 날짜 정리 포함)
 * 사용: npx tsx scripts/sync-holidays.ts [loginId]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { syncHolidaysAcrossTenantTerms } from '../src/lib/academic-calendar/sync-holidays'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const loginId = process.argv[2] || 'nam'
  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user) throw new Error(`계정 없음: ${loginId}`)

  const term = await prisma.schoolTerm.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })
  if (!term) throw new Error('학기 없음')

  const n = await syncHolidaysAcrossTenantTerms(prisma, term.id)
  console.log(`동기화 완료 — 추가·정리 ${n}건`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
