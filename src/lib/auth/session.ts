import { cookies } from 'next/headers'
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from './session-token'

export type { SessionPayload }
export { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME }

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE_NAME)
}
