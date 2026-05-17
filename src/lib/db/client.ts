// src/lib/db/client.ts
import { PrismaClient } from '../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL이 설정되지 않았습니다. .env 예: postgresql://USER@localhost:5432/timetable'
    )
  }

  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })
}

/** HMR/재시작 전에 캐시된 구버전 클라이언트(User 모델 없음)를 걸러냄 */
function isPrismaClientReady(client: PrismaClient): boolean {
  return typeof (client as PrismaClient & { user?: unknown }).user?.findUnique === 'function'
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma
  if (cached && isPrismaClientReady(cached)) {
    return cached
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()
