/** 학교명 → 기본 로그인 아이디 제안 (영문·숫자만) */
export function suggestLoginIdFromSchoolName(schoolName: string): string {
  const stripped = schoolName
    .replace(/초등학교|중학교|고등학교|학교/g, '')
    .trim()
    .toLowerCase()
  const latin = stripped.replace(/[^a-z0-9]/g, '')
  if (latin.length >= 2) return latin.slice(0, 32)
  return ''
}

export function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}
