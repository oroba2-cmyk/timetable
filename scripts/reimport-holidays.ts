/**
 * 공휴일 API 재등록 (학기별 기간에 맞게 자동 분배)
 * 사용: npx tsx scripts/reimport-holidays.ts [loginId] [startYM] [endYM]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { importPublicHolidaysCore } from '../src/lib/academic-calendar/import-holidays'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const loginId = process.argv[2] || 'nam'
  const startYM = process.argv[3] || '2026-01'
  const endYM = process.argv[4] || '2026-12'

  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user) throw new Error(`계정 없음: ${loginId}`)

  const term = await prisma.schoolTerm.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })
  if (!term) throw new Error('학기 없음')

  const { count } = await importPublicHolidaysCore(prisma, term.id, startYM, endYM)
  console.log(`공휴일 ${count}건 등록 (${startYM} ~ ${endYM})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
