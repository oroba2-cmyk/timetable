# Supabase DB 이전 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 PostgreSQL DB(스키마 + 데이터)를 Supabase로 이전하고 코드를 Supabase 연결로 전환한다.

**Architecture:** pg_dump로 로컬 전체 덤프 → Supabase Direct URL로 pg_restore → Prisma 설정에 directUrl 추가 및 .env 교체. 이후 로컬 개발도 Supabase에 직접 연결해 단일화한다.

**Tech Stack:** PostgreSQL 15+, Prisma 6, Supabase (hosted PostgreSQL + PgBouncer)

---

## 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | `datasource db`에 `directUrl` 추가 |
| `prisma.config.ts` | `datasource` 객체에 `directUrl` 추가 |
| `.env` | `DATABASE_URL` 교체, `DIRECT_URL` 추가 |

---

### Task 1: Supabase 연결 정보 확인

**Files:** 없음 (정보 수집 단계)

- [ ] **Step 1: Supabase 대시보드에서 연결 정보 복사**

  Supabase 대시보드 → Project Settings → Database → Connection string 탭에서:

  - **Transaction pooler** (포트 6543): `DATABASE_URL`로 사용
    ```
    postgres://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
    ```
  - **Direct connection** (포트 5432): `DIRECT_URL`로 사용
    ```
    postgres://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
    ```

  > Mode가 "Transaction" / "Session" / "Direct"로 구분된 경우:  
  > Transaction pooler → `DATABASE_URL`, Direct → `DIRECT_URL`

- [ ] **Step 2: 연결 가능 여부 확인**

  ```bash
  psql "postgres://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" -c "\conninfo"
  ```

  Expected: 연결 정보 출력 (connection to server ... accepted)

---

### Task 2: 로컬 DB 덤프

**Files:** `timetable_backup.dump` (프로젝트 루트에 임시 생성, .gitignore 확인 필요)

- [ ] **Step 1: 덤프 파일이 git에 포함되지 않도록 확인**

  ```bash
  grep "*.dump" /Users/khami/Documents/timetable/.gitignore
  ```

  출력이 없으면 `.gitignore`에 추가:

  ```bash
  echo "*.dump" >> /Users/khami/Documents/timetable/.gitignore
  ```

- [ ] **Step 2: pg_dump 실행**

  ```bash
  cd /Users/khami/Documents/timetable
  pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --schema=public \
    postgresql://khami@localhost:5432/timetable \
    -f timetable_backup.dump
  ```

  Expected: 오류 없이 종료, `timetable_backup.dump` 파일 생성

- [ ] **Step 3: 덤프 파일 내용 검증**

  ```bash
  pg_restore --list timetable_backup.dump | head -40
  ```

  Expected: 테이블 목록(`TABLE DATA public Tenant`, `TABLE DATA public User` 등)이 출력됨

---

### Task 3: Supabase에 복원

**Files:** 없음 (DB 작업)

- [ ] **Step 1: pg_restore 실행**

  `DIRECT_URL`을 실제 값으로 교체해서 실행:

  ```bash
  pg_restore \
    --no-owner \
    --no-acl \
    --schema=public \
    -d "postgres://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
    timetable_backup.dump
  ```

  Expected: 오류 없이 종료. 일부 `already exists` 경고는 무시 가능 (Supabase built-in 객체)

  > 만약 `relation "..." already exists` 에러로 실패하면:  
  > `--clean` 플래그를 추가해 재시도:
  > ```bash
  > pg_restore \
  >   --no-owner \
  >   --no-acl \
  >   --clean \
  >   --if-exists \
  >   --schema=public \
  >   -d "postgres://..." \
  >   timetable_backup.dump
  > ```

- [ ] **Step 2: 복원된 데이터 확인**

  ```bash
  psql "postgres://postgres.[ref]:[password]@...5432/postgres" \
    -c "SELECT COUNT(*) FROM \"Tenant\"; SELECT COUNT(*) FROM \"User\"; SELECT COUNT(*) FROM \"SchoolTerm\";"
  ```

  Expected: 로컬 DB와 동일한 행 수 출력

---

### Task 4: Prisma 스키마에 directUrl 추가

**Files:**
- Modify: `prisma/schema.prisma:6-8`
- Modify: `prisma.config.ts:11-13`

- [ ] **Step 1: `prisma/schema.prisma` 수정**

  현재:
  ```prisma
  datasource db {
    provider = "postgresql"
  }
  ```

  변경 후:
  ```prisma
  datasource db {
    provider  = "postgresql"
    directUrl = env("DIRECT_URL")
  }
  ```

- [ ] **Step 2: `prisma.config.ts` 수정**

  현재:
  ```ts
  datasource: {
    url: process.env["DATABASE_URL"],
  },
  ```

  변경 후:
  ```ts
  datasource: {
    url: process.env["DATABASE_URL"],
    directUrl: process.env["DIRECT_URL"],
  },
  ```

- [ ] **Step 3: 변경 커밋**

  ```bash
  git add prisma/schema.prisma prisma.config.ts
  git commit -m "feat: add Prisma directUrl for Supabase PgBouncer"
  ```

---

### Task 5: .env를 Supabase URL로 교체

**Files:**
- Modify: `.env`

- [ ] **Step 1: `.env` 교체**

  `.env` 파일을 열어 아래 값으로 교체 (실제 Supabase 값으로):

  ```bash
  # 기존 DATABASE_URL 줄을 아래로 교체
  DATABASE_URL="postgres://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgres://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
  ```

  `KASI_API_KEY`와 `AUTH_SECRET`은 그대로 유지.

  > `.env`는 `.gitignore`에 포함되어 있으므로 커밋하지 않음.

---

### Task 6: Prisma 클라이언트 재생성 및 검증

**Files:**
- 자동 생성: `src/generated/prisma/`

- [ ] **Step 1: prisma generate 실행**

  ```bash
  npx prisma generate
  ```

  Expected: `Generated Prisma Client` 메시지 출력

- [ ] **Step 2: 마이그레이션 상태 확인**

  ```bash
  npx prisma migrate status
  ```

  Expected: 모든 마이그레이션이 `Applied` 상태로 표시됨. `pending` 항목이 없어야 함.

- [ ] **Step 3: 앱 기동 확인**

  ```bash
  npm run dev
  ```

  브라우저에서 `http://localhost:3000` 접속 후:
  - 로그인 동작 확인
  - 시간표 조회 동작 확인

- [ ] **Step 4: 덤프 파일 삭제**

  ```bash
  rm /Users/khami/Documents/timetable/timetable_backup.dump
  ```

- [ ] **Step 5: 최종 커밋**

  ```bash
  git add .gitignore
  git commit -m "chore: ignore .dump files"
  ```

---

### Task 7: Vercel 환경변수 등록

**Files:** 없음 (Vercel 대시보드 작업)

- [ ] **Step 1: Vercel 대시보드에서 환경변수 추가**

  Vercel 대시보드 → 프로젝트 → Settings → Environment Variables:

  | Key | Value | Environment |
  |-----|-------|-------------|
  | `DATABASE_URL` | `postgres://...6543/postgres?pgbouncer=true` | Production, Preview |
  | `DIRECT_URL` | `postgres://...5432/postgres` | Production, Preview |

  기존 `DATABASE_URL`이 있으면 값 업데이트, 없으면 신규 추가.

- [ ] **Step 2: Vercel 재배포 확인**

  Vercel 대시보드 → Deployments에서 최신 배포가 성공(`Ready`) 상태인지 확인.  
  실패 시 빌드 로그에서 DB 연결 오류 여부 확인.
