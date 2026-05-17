import { SignJWT, jwtVerify } from 'jose'
import type { UserRole } from '@/generated/prisma'

export type SessionPayload = {
  userId: string
  loginId: string
  role: UserRole
  tenantId: string
  schoolName: string
}

export const SESSION_COOKIE_NAME = 'timetable_session'

function secretKey() {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET 환경 변수를 16자 이상으로 설정해 주세요.')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    const p = payload as Record<string, unknown>
    if (
      typeof p.userId !== 'string' ||
      typeof p.loginId !== 'string' ||
      typeof p.role !== 'string' ||
      typeof p.tenantId !== 'string' ||
      typeof p.schoolName !== 'string'
    ) {
      return null
    }
    return {
      userId: p.userId,
      loginId: p.loginId,
      role: p.role as UserRole,
      tenantId: p.tenantId,
      schoolName: p.schoolName,
    }
  } catch {
    return null
  }
}
