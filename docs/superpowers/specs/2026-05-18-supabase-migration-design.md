# Supabase DB 이전 설계

**날짜:** 2026-05-18  
**방법:** pg_dump 전체 복원 (방법 A)

## 목표

로컬 PostgreSQL DB를 Supabase로 이전한다. 스키마와 데이터를 모두 이전하며, 이후 로컬 개발도 Supabase에 직접 연결해 단일화한다.

## 전체 흐름

1. Supabase 연결 정보 준비 (Transaction pooler URL + Direct URL)
2. 로컬 DB를 `pg_dump`로 덤프
3. Supabase에 `pg_restore`로 복원
4. Prisma 코드 업데이트 (`directUrl` 추가, `.env` 교체)
5. 검증 (`prisma migrate status`, 앱 동작 확인)

## 코드 변경

### `prisma/schema.prisma`

`datasource db` 블록에 `directUrl` 추가:

```prisma
datasource db {
  provider  = "postgresql"
  directUrl = env("DIRECT_URL")
}
```

### `prisma.config.ts`

`datasource` 객체에 `directUrl` 추가:

```ts
datasource: {
  url: process.env["DATABASE_URL"],
  directUrl: process.env["DIRECT_URL"],
},
```

### `.env`

두 변수를 Supabase URL로 교체:

```
DATABASE_URL="postgres://postgres.xxxx:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.xxxx:PASSWORD@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
```

`.env.example`은 이미 이 형식으로 주석 작성되어 있으므로 변경 없음.

## pg_dump / pg_restore 명령

```bash
# 덤프 (로컬)
pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --schema=public \
  postgresql://khami@localhost:5432/timetable \
  -f timetable_backup.dump

# 복원 (Supabase Direct URL)
pg_restore \
  --no-owner \
  --no-acl \
  --schema=public \
  -d "$DIRECT_URL" \
  timetable_backup.dump
```

## 주의 사항

- `--no-owner --no-acl`: 로컬 소유자(`khami`)가 Supabase에 없어 복원 실패 방지
- `--clean` 없이 복원: Supabase `public` 스키마 내 built-in 객체와 충돌 방지
- 복원 후 `prisma generate` 재실행: `directUrl` 추가로 클라이언트 재생성 필요
- Vercel 환경변수: `DATABASE_URL`과 `DIRECT_URL` 둘 다 등록 필요

## 검증

```bash
prisma migrate status   # 모든 마이그레이션이 Applied로 표시되어야 함
```

앱 실행 후 로그인, 시간표 조회 등 주요 기능 동작 확인.
