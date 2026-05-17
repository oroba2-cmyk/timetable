# 웹 배포 가이드 (Vercel + Supabase)

Next.js 시간표 앱을 [Vercel](https://vercel.com)에, PostgreSQL은 [Supabase](https://supabase.com)에 두는 방법입니다.

## 사전 준비

1. GitHub에 이 저장소 push
2. [Supabase](https://supabase.com) · [Vercel](https://vercel.com) 계정
3. (선택) 로컬 백업: `backups/*.dump`

## 1. Supabase 프로젝트

1. **New project** 생성 (리전은 가까운 곳 권장, 예: Northeast Asia)
2. **Project Settings → Database → Connection string**
3. 아래 두 URL을 복사해 둡니다.

| 용도 | Supabase UI | Vercel 변수 |
|------|-------------|-------------|
| 앱 런타임 (풀러) | **Transaction** pooler, 포트 **6543** | `DATABASE_URL` |
| 마이그레이션·시드 | **Direct** connection, 포트 **5432** | `DIRECT_URL` |

Transaction pooler URL에는 Prisma용으로 `?pgbouncer=true`를 붙입니다.

```
postgresql://postgres.[ref]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Direct URL 예:

```
postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres
```

비밀번호에 `@`, `#` 등 특수문자가 있으면 URL 인코딩이 필요합니다.

> 이 앱은 Prisma로 DB에 직접 연결합니다. Supabase Auth·RLS는 사용하지 않습니다.

## 2. Vercel 배포

1. Vercel → **Add New → Project** → GitHub 저장소 연결
2. Framework: **Next.js** (자동 감지)
3. **Environment Variables** (Production·Preview 동일 권장):

| 변수 | 값 |
|------|-----|
| `DATABASE_URL` | Transaction pooler URL (`?pgbouncer=true`) |
| `DIRECT_URL` | Direct connection URL |
| `AUTH_SECRET` | `openssl rand -base64 32` 로 생성 (16자 이상) |
| `KASI_API_KEY` | (선택) 공휴일 API |

4. **Deploy**

빌드 시 `scripts/vercel-build.sh`가 실행됩니다.

- `prisma generate`
- `DIRECT_URL`로 `prisma migrate deploy`
- `next build`

설정은 저장소 루트 `vercel.json`을 따릅니다 (리전 `icn1`).

## 3. 최초 데이터 넣기

배포 직후 DB는 스키마만 있고 계정·학기 데이터는 없습니다. **로컬에서 한 번** 넣는 것을 권장합니다.

```bash
# Supabase 비밀번호 등을 로컬 .env에 설정 (DIRECT_URL = Direct connection)
cp .env.example .env
# 편집 후:

npm ci
# 마이그레이션·시드는 Direct URL 사용 (풀러 URL이면 migrate/대량 작업이 실패할 수 있음)
export DATABASE_URL="$DIRECT_URL"
npx prisma migrate deploy
npm run db:seed

# 또는 로컬 백업 복원
npm run db:restore -- backups/timetable-YYYYMMDD-HHMMSS.dump
```

Vercel CLI로 환경 변수를 받아올 수도 있습니다.

```bash
npx vercel env pull .env.local
# .env.local의 DATABASE_URL을 Direct URL로 바꾸거나 DIRECT_URL 설정 후 db:seed
```

### 기본 로그인 (시드 후)

| 계정 | 비밀번호 | 용도 |
|------|----------|------|
| admin | admin1234! | 관리자 |
| nam | nam1234! | 연습초등학교 |
| test1 | test1234 | 검토초등학교(익명) |

배포 후 **반드시 비밀번호를 변경**하세요.

## 4. 로컬에서 프로덕션 빌드 확인

```bash
cp .env.example .env
# DATABASE_URL, AUTH_SECRET (로컬 DB면 DIRECT_URL 생략 가능)

npm ci
npx prisma migrate deploy
npm run build
npm start
# http://localhost:3000
```

## 5. 유지보수

```bash
# DB 백업 (로컬, .env의 DATABASE_URL 또는 DIRECT_URL)
npm run db:backup

# test1 검토 계정 동기화 (로컬 DB)
npm run sync:test1
```

스키마 변경 후: Git push → Vercel이 자동으로 `migrate deploy` 후 빌드합니다.

## 6. 문제 해결

| 증상 | 확인 |
|------|------|
| 빌드 중 migrate 실패 | `DIRECT_URL`이 Direct(5432)인지, IP 제한·비밀번호 오류 없는지 |
| 런타임 DB 연결 오류 | `DATABASE_URL`이 Transaction pooler(6543) + `?pgbouncer=true` 인지 |
| 로그인 안 됨 | `AUTH_SECRET`이 배포 환경에 설정됐는지, 시드/복원을 했는지 |

## 참고

- **Preview 배포**: PR마다 Preview URL 생성. Preview에도 동일 env를 두거나, 별도 Supabase 브랜치/프로젝트 사용
- Windows ZIP 배포: `docs/DISTRIBUTION.md` (현재 중단)

---

## 부록: Render로 배포 (선택)

`render.yaml` Blueprint로 Web + Postgres를 한 번에 올릴 수 있습니다. Vercel+Supabase를 쓰는 경우 **무시**해도 됩니다.

1. Render → **New → Blueprint** → `render.yaml`
2. 배포 후 Shell에서 `npm run db:seed`

자세한 Render 전용 단계는 Git 히스토리의 이전 `DEPLOY.md` 또는 `render.yaml` 주석을 참고하세요.
