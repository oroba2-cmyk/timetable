/**
 * 계정·테넌트 시드 — npm run db:seed
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../src/lib/auth/password'
import { syncTenantFromSource } from './lib/tenant-clone'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL 필요')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) })

async function upsertUser(
  loginId: string,
  password: string,
  role: 'ADMIN' | 'USER',
  schoolName: string
) {
  const existing = await prisma.user.findUnique({ where: { loginId } })
  if (existing) {
    await prisma.tenant.update({
      where: { id: existing.tenantId },
      data: { schoolName },
    })
    console.log(`  • ${loginId} (이미 있음, 학교명 갱신: ${schoolName})`)
    return { tenantId: existing.tenantId }
  }
  const passwordHash = await hashPassword(password)
  const tenant = await prisma.tenant.create({
    data: {
      schoolName,
      users: { create: { loginId, passwordHash, role } },
    },
  })
  console.log(`  • ${loginId} / ${password} (${schoolName})`)
  return { tenantId: tenant.id }
}

async function main() {
  console.log('=== 계정 시드 ===\n')

  await upsertUser('admin', 'admin1234!', 'ADMIN', '시스템 관리')

  const nam = await upsertUser('nam', 'nam1234!', 'USER', '연습초등학교')
  const legacy = await prisma.schoolTerm.updateMany({
    where: { tenantId: '__legacy__' },
    data: { tenantId: nam.tenantId },
  })
  if (legacy.count > 0) console.log(`  → 기존 학기 ${legacy.count}개를 nam 계정에 연결`)

  const test1 = await upsertUser('test1', 'test1234', 'USER', '검토초등학교')
  const namTermCount = await prisma.schoolTerm.count({ where: { tenantId: nam.tenantId } })
  if (namTermCount > 0) {
    console.log('  → test1 검토용 데이터 동기화(교사명 익명)…')
    await syncTenantFromSource(prisma, nam.tenantId, test1.tenantId, true)
  }

  await upsertUser('test2', 'test1234', 'USER', '빈학교(샘플)')

  await prisma.tenant.delete({ where: { id: '__legacy__' } }).catch(() => {})

  console.log('\n로그인: admin/admin1234!, nam/nam1234!, test1·test2/test1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
