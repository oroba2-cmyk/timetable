#!/usr/bin/env bash
# PostgreSQL 전체 백업 (pg_dump custom format)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL이 없습니다. .env를 확인하세요." >&2
  exit 1
fi

PGDUMP="${PGDUMP:-pg_dump}"
if ! command -v "$PGDUMP" >/dev/null 2>&1; then
  for candidate in \
    "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump" \
    "/opt/homebrew/bin/pg_dump" \
    "/usr/local/bin/pg_dump"
  do
    if [[ -x "$candidate" ]]; then
      PGDUMP="$candidate"
      break
    fi
  done
fi

if ! command -v "$PGDUMP" >/dev/null 2>&1 && [[ ! -x "$PGDUMP" ]]; then
  echo "pg_dump을 찾을 수 없습니다. Postgres.app 또는 brew install postgresql@18" >&2
  exit 1
fi

mkdir -p backups
TS="$(date +%Y%m%d-%H%M%S)"
OUT="backups/timetable-${TS}.dump"

"$PGDUMP" "$DATABASE_URL" --no-owner --no-acl -F c -f "$OUT"
ls -lh "$OUT"
echo "백업 완료: $OUT"
