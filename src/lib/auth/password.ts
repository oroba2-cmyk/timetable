import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** 기본 비밀번호: {loginId}1234! */
export function defaultPasswordForLoginId(loginId: string): string {
  return `${loginId}1234!`
}
