#!/usr/bin/env bash
# Vercel 빌드: Prisma 클라이언트 생성 → 마이그레이션 → Next.js 빌드
# Supabase 사용 시 DIRECT_URL(직접 연결)로 migrate, 앱 런타임은 DATABASE_URL(풀러) 사용
set -euo pipefail
cd "$(dirname "$0")/.."

npx prisma generate

if [[ -z "${DATABASE_URL:-}" && -z "${DIRECT_URL:-}" ]]; then
  echo "ERROR: Vercel 환경 변수 DATABASE_URL, DIRECT_URL, AUTH_SECRET 을 설정한 뒤 다시 배포하세요."
  echo "       (DEPLOY.md 참고)"
  exit 1
fi

if [[ -n "${DIRECT_URL:-}" ]]; then
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
else
  npx prisma migrate deploy
fi

npm run build
