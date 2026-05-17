#!/usr/bin/env bash
# pg_restore로 백업 복원 (로컬·Render Shell 공통)
set -euo pipefail
cd "$(dirname "$0")/.."

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "사용법: bash scripts/restore-database.sh backups/timetable-YYYYMMDD-HHMMSS.dump" >&2
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL이 없습니다." >&2
  exit 1
fi

PGRESTORE="${PGRESTORE:-pg_restore}"
if ! command -v "$PGRESTORE" >/dev/null 2>&1; then
  for candidate in \
    "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_restore" \
    "/opt/homebrew/bin/pg_restore"
  do
    if [[ -x "$candidate" ]]; then
      PGRESTORE="$candidate"
      break
    fi
  done
fi

echo "복원 중: $DUMP"
echo "대상: ${DATABASE_URL%%\?*}"
read -r -p "기존 데이터를 덮어씁니다. 계속할까요? [y/N] " ans
if [[ "${ans,,}" != "y" ]]; then
  echo "취소"
  exit 0
fi

"$PGRESTORE" --clean --if-exists --no-owner --no-acl -d "$DATABASE_URL" "$DUMP"
echo "복원 완료"
