import { prisma } from '@/lib/db/client'
import { getSession, type SessionPayload } from './session'

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('로그인이 필요합니다.')
  }
  return session
}

export async function requireTenantId(): Promise<string> {
  const session = await requireSession()
  return session.tenantId
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession()
  if (session.role !== 'ADMIN') {
    throw new Error('관리자 권한이 필요합니다.')
  }
  return session
}

/** 학기가 현재 테넌트 소유인지 확인 */
export async function assertTermInTenant(termId: string, tenantId?: string) {
  const tid = tenantId ?? (await requireTenantId())
  const term = await prisma.schoolTerm.findFirst({
    where: { id: termId, tenantId: tid },
  })
  if (!term) {
    throw new Error('접근할 수 없는 학기입니다.')
  }
  return term
}
