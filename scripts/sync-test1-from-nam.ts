/**
 * nam(연습초등학교) → test1(검토초등학교) 시간표 동기화 (교사명 익명)
 * npm run sync:test1
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { syncTenantFromSource } from './lib/tenant-clone'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL 필요')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function main() {
  const nam = await prisma.user.findUnique({ where: { loginId: 'nam' }, include: { tenant: true } })
  const test1 = await prisma.user.findUnique({ where: { loginId: 'test1' }, include: { tenant: true } })
  if (!nam) throw new Error('nam 계정이 없습니다. npm run db:seed 먼저 실행하세요.')
  if (!test1) throw new Error('test1 계정이 없습니다.')

  const namTerms = await prisma.schoolTerm.count({ where: { tenantId: nam.tenantId } })
  if (namTerms === 0) throw new Error('nam 테넌트에 학기 데이터가 없습니다.')

  await prisma.tenant.update({
    where: { id: test1.tenantId },
    data: { schoolName: '검토초등학교' },
  })

  console.log(`동기화: ${nam.tenant.schoolName} → 검토초등학교 (test1, 교사명 익명)`)
  await syncTenantFromSource(prisma, nam.tenantId, test1.tenantId, true)

  const terms = await prisma.schoolTerm.findMany({
    where: { tenantId: test1.tenantId },
    orderBy: [{ year: 'asc' }, { semester: 'asc' }],
  })
  for (const t of terms) {
    const rules = await prisma.scheduleRule.count({ where: { termId: t.id } })
    const entries = await prisma.scheduleEntry.count({ where: { termId: t.id } })
    console.log(`  ${t.year}년 ${t.semester}학기 — 규칙 ${rules}건, 일정 ${entries}건`)
  }
  console.log('완료')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
