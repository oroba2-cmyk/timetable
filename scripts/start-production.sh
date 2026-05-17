#!/usr/bin/env bash
# Render·Docker 등 프로덕션 실행 (Next.js standalone)
set -euo pipefail
cd "$(dirname "$0")/.."

# Render·Docker: 모든 인터페이스에 바인딩 (기존 HOSTNAME 환경변수는 무시)
export HOSTNAME="0.0.0.0"
export PORT="${PORT:-3000}"

if [[ -f .next/standalone/server.js ]]; then
  mkdir -p .next/standalone/.next
  cp -r public .next/standalone/public 2>/dev/null || true
  cp -r .next/static .next/standalone/.next/static
  cd .next/standalone
  exec node server.js
fi

exec npm start
