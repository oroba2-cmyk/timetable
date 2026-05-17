# Windows 배포 (현재 중단)

이 프로젝트는 **PostgreSQL** 을 기본 데이터베이스로 사용합니다.

Windows용 「압축 해제 후 더블클릭」 ZIP 배포는 SQLite 전용 스키마가 필요해, PostgreSQL 복원과 함께 **일시 중단**했습니다.

## 로컬 개발

```bash
cp .env.example .env
# DATABASE_URL을 본인 PostgreSQL에 맞게 수정

npm install
npx prisma migrate deploy   # 최초 1회
npm run dev
```

기존 PostgreSQL DB(`timetable`)에 들어 있던 데이터는 그대로 사용할 수 있습니다. SQLite로 바꿨을 때 만든 `data/timetable.db` 는 별도 파일이며, PostgreSQL 데이터와는 연결되지 않습니다.

## 나중에 Windows ZIP이 필요할 때

- PostgreSQL 유지 + Windows: Docker Compose 또는 포터블 PostgreSQL 번들 등 별도 설계가 필요합니다.
- SQLite ZIP만 다시 쓰려면: `prisma/migrations-sqlite-backup/`(있는 경우) 및 이전 SQLite 브랜치를 참고해 스키마를 분리해야 합니다.
