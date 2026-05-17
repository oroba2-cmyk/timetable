'use server'

import { prisma } from '@/lib/db/client'
import { defaultPasswordForLoginId, hashPassword, verifyPassword } from '@/lib/auth/password'
import { normalizeLoginId, suggestLoginIdFromSchoolName } from '@/lib/auth/login-id'
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  type SessionPayload,
} from '@/lib/auth/session'
import { requireAdmin } from '@/lib/auth/tenant-scope'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/types'

async function sessionFromUser(userId: string): Promise<SessionPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { tenant: true },
  })
  if (!user) return null
  return {
    userId: user.id,
    loginId: user.loginId,
    role: user.role,
    tenantId: user.tenantId,
    schoolName: user.tenant.schoolName,
  }
}

export async function loginWithFormAction(
  _prev: { error?: string } | null,
  fd: FormData
): Promise<{ error?: string } | null> {
  const loginId = normalizeLoginId(String(fd.get('loginId') ?? ''))
  const password = String(fd.get('password') ?? '')

  if (!loginId || !password) {
    return { error: '아이디와 비밀번호를 입력해 주세요.' }
  }

  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  const session = await sessionFromUser(user.id)
  if (!session) return { error: '로그인 처리 중 오류가 발생했습니다.' }

  const token = await createSessionToken(session)
  await setSessionCookie(token)
  redirect('/view')
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect('/login')
}

export async function createAccountAction(fd: FormData): Promise<ActionResult> {
  await requireAdmin()

  const schoolName = String(fd.get('schoolName') ?? '').trim()
  let loginId = normalizeLoginId(String(fd.get('loginId') ?? ''))
  const passwordRaw = String(fd.get('password') ?? '').trim()

  if (!schoolName) {
    return { success: false, error: '학교명을 입력해 주세요.' }
  }

  if (!loginId) {
    loginId = suggestLoginIdFromSchoolName(schoolName)
  }
  if (!loginId) {
    return { success: false, error: '로그인 아이디를 직접 입력해 주세요. (학교명만으로는 자동 생성되지 않습니다)' }
  }

  const password = passwordRaw || defaultPasswordForLoginId(loginId)

  const existing = await prisma.user.findUnique({ where: { loginId } })
  if (existing) {
    return { success: false, error: '이미 사용 중인 아이디입니다.' }
  }

  try {
    const passwordHash = await hashPassword(password)
    await prisma.tenant.create({
      data: {
        schoolName,
        users: {
          create: {
            loginId,
            passwordHash,
            role: 'USER',
          },
        },
      },
    })
    revalidatePath('/admin/accounts')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '계정 생성 중 오류가 발생했습니다.' }
  }
}

export async function listAccountsForAdmin() {
  await requireAdmin()
  return prisma.user.findMany({
    include: { tenant: true },
    orderBy: { createdAt: 'asc' },
  })
}
