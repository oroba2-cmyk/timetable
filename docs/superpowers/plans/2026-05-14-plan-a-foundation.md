# Plan A: 프로젝트 셋업 + DB 스키마 + 기준정보 CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + PostgreSQL + Prisma 기반 프로젝트를 초기화하고, 모든 기준정보(특별실·학년·학급·과목·교사·교시·학사일정)의 CRUD 화면을 완성한다.

**Architecture:** Next.js 15 App Router 풀스택 앱. Server Actions으로 DB 직접 호출. shadcn/ui 컴포넌트로 설정 화면 구현. 학기(SchoolTerm)를 최상위 컨텍스트로 사용하며, 모든 기준정보는 학기에 속한다.

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS, shadcn/ui, PostgreSQL 16, Prisma 6, Vitest

---

## File Map

| 파일 | 역할 |
|------|------|
| `prisma/schema.prisma` | 전체 DB 스키마 |
| `src/lib/db/client.ts` | Prisma 클라이언트 싱글톤 |
| `src/types/index.ts` | 공유 타입 |
| `src/features/terms/actions.ts` | 학기 Server Actions |
| `src/features/rooms/actions.ts` | 특별실 Server Actions |
| `src/features/rooms/RoomList.tsx` | 특별실 목록 |
| `src/features/rooms/RoomForm.tsx` | 특별실 등록·수정 다이얼로그 |
| `src/features/classes/actions.ts` | 학년·학급 Server Actions |
| `src/features/classes/GradeList.tsx` | 학년·학급 목록 |
| `src/features/classes/ClassForm.tsx` | 학급 등록·수정 다이얼로그 |
| `src/features/subjects/actions.ts` | 과목 Server Actions |
| `src/features/subjects/SubjectList.tsx` | 과목 목록 |
| `src/features/subjects/SubjectForm.tsx` | 과목 등록·수정 다이얼로그 |
| `src/features/teachers/actions.ts` | 교사 Server Actions |
| `src/features/teachers/TeacherList.tsx` | 교사 목록 |
| `src/features/teachers/TeacherForm.tsx` | 교사 등록·수정 다이얼로그 (과목 다중 연결) |
| `src/features/periods/actions.ts` | 교시 Server Actions |
| `src/features/periods/PeriodList.tsx` | 교시 목록 |
| `src/features/periods/PeriodForm.tsx` | 교시 등록·수정 다이얼로그 |
| `src/features/academic-calendar/actions.ts` | 학사일정 Server Actions |
| `src/features/academic-calendar/EventList.tsx` | 학사일정 목록 |
| `src/features/academic-calendar/EventForm.tsx` | 학사일정 등록·수정 다이얼로그 |
| `src/app/layout.tsx` | 루트 레이아웃 (사이드바 네비게이션) |
| `src/app/page.tsx` | 홈 (학기 선택) |
| `src/app/(setup)/layout.tsx` | 설정 섹션 레이아웃 |
| `src/app/(setup)/rooms/page.tsx` | 특별실 설정 페이지 |
| `src/app/(setup)/classes/page.tsx` | 학년·학급 설정 페이지 |
| `src/app/(setup)/subjects/page.tsx` | 과목 설정 페이지 |
| `src/app/(setup)/teachers/page.tsx` | 교사 설정 페이지 |
| `src/app/(setup)/periods/page.tsx` | 교시 설정 페이지 |
| `src/app/(setup)/academic-calendar/page.tsx` | 학사일정 설정 페이지 |
| `vitest.config.ts` | Vitest 설정 |

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json` (자동 생성)
- Create: `vitest.config.ts`

- [ ] **Step 1: Next.js 프로젝트 생성**

작업 디렉터리 `/Users/khami/Documents/timetable`에서 실행한다.
기존 `README.md`, `docs/` 는 보존해야 하므로 임시 디렉터리에 생성 후 파일을 이동한다.

```bash
cd /tmp && npx create-next-app@latest timetable-app \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-git
cp -r /tmp/timetable-app/. /Users/khami/Documents/timetable/
rm -rf /tmp/timetable-app
```

- [ ] **Step 2: 의존성 추가 설치**

```bash
cd /Users/khami/Documents/timetable
npm install @prisma/client prisma
npm install --save-dev vitest @vitejs/plugin-react
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 3: shadcn/ui 초기화 및 컴포넌트 설치**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button input label select dialog table form badge textarea checkbox
```

- [ ] **Step 4: vitest.config.ts 작성**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: package.json에 test 스크립트 추가**

`package.json`의 `scripts` 에 아래 항목을 추가한다.

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 서버 기동 확인**

```bash
npm run dev
```

Expected: `http://localhost:3000` 에서 Next.js 기본 페이지 표시.

- [ ] **Step 7: 커밋**

```bash
git init
git add -A
git commit -m "chore: initialize Next.js project with Prisma, shadcn/ui, Vitest"
```

---

## Task 2: Prisma 스키마 정의

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: `.env` 파일에 DB URL 설정**

```bash
# .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/timetable"
```

실제 PostgreSQL 사용자명과 비밀번호로 교체한다.

- [ ] **Step 2: schema.prisma 작성**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model SchoolTerm {
  id        String   @id @default(cuid())
  year      Int
  semester  Int      // 1 or 2
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  createdAt DateTime @default(now())

  grades          Grade[]
  specialRooms    SpecialRoom[]
  periods         Period[]
  academicEvents  AcademicEvent[]
  scheduleRules   ScheduleRule[]
  scheduleEntries ScheduleEntry[]
  reservations    Reservation[]

  @@unique([year, semester])
}

model Grade {
  id      String     @id @default(cuid())
  termId  String
  term    SchoolTerm @relation(fields: [termId], references: [id], onDelete: Cascade)
  number  Int        // 1~6학년

  classGroups ClassGroup[]

  @@unique([termId, number])
}

model ClassGroup {
  id                String   @id @default(cuid())
  gradeId           String
  grade             Grade    @relation(fields: [gradeId], references: [id], onDelete: Cascade)
  number            Int      // 반 번호
  homeroomTeacherId String?
  homeroomTeacher   Teacher? @relation("HomeroomClass", fields: [homeroomTeacherId], references: [id])

  scheduleRules   ScheduleRule[]
  scheduleEntries ScheduleEntry[]
  reservations    Reservation[]

  @@unique([gradeId, number])
}

model Subject {
  id           String      @id @default(cuid())
  termId       String
  name         String
  type         SubjectType @default(GENERAL)
  requiresRoom Boolean     @default(false)

  teacherSubjects TeacherSubject[]
  scheduleRules   ScheduleRule[]
  scheduleEntries ScheduleEntry[]
  reservations    Reservation[]
}

enum SubjectType {
  SPECIALIZED
  GENERAL
}

model Teacher {
  id   String      @id @default(cuid())
  termId String
  name String
  type TeacherType @default(HOMEROOM)

  teacherSubjects       TeacherSubject[]
  unavailabilities      TeacherUnavailability[]
  homeroomClass         ClassGroup[]            @relation("HomeroomClass")
  scheduleRules         ScheduleRule[]
  scheduleEntries       ScheduleEntry[]
  reservations          Reservation[]
}

enum TeacherType {
  HOMEROOM
  SPECIALIZED
  CONCURRENT
}

model TeacherSubject {
  id        String  @id @default(cuid())
  teacherId String
  teacher   Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([teacherId, subjectId])
}

model TeacherUnavailability {
  id        String  @id @default(cuid())
  teacherId String
  teacher   Teacher @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  dayOfWeek Int     // 0=월, 1=화, 2=수, 3=목, 4=금
  periodId  String
  period    Period  @relation(fields: [periodId], references: [id], onDelete: Cascade)

  @@unique([teacherId, dayOfWeek, periodId])
}

model SpecialRoom {
  id       String     @id @default(cuid())
  termId   String
  term     SchoolTerm @relation(fields: [termId], references: [id], onDelete: Cascade)
  name     String
  roomType String     // 과학실, 컴퓨터실, 음악실 등 자유 입력
  capacity Int        @default(1) // 동시 사용 가능 학급 수
  note     String?

  unavailabilities RoomUnavailability[]
  scheduleRules    ScheduleRule[]
  scheduleEntries  ScheduleEntry[]
  reservations     Reservation[]
}

model RoomUnavailability {
  id        String      @id @default(cuid())
  roomId    String
  room      SpecialRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  dayOfWeek Int         // 0=월, 1=화, 2=수, 3=목, 4=금
  periodId  String
  period    Period      @relation(fields: [periodId], references: [id], onDelete: Cascade)

  @@unique([roomId, dayOfWeek, periodId])
}

model Period {
  id        String     @id @default(cuid())
  termId    String
  term      SchoolTerm @relation(fields: [termId], references: [id], onDelete: Cascade)
  number    Int        // 교시 번호 (1, 2, 3...)
  startTime String     // "HH:MM"
  endTime   String     // "HH:MM"

  teacherUnavailabilities TeacherUnavailability[]
  roomUnavailabilities    RoomUnavailability[]
  scheduleRules           ScheduleRule[]
  scheduleEntries         ScheduleEntry[]
  reservations            Reservation[]

  @@unique([termId, number])
}

model AcademicEvent {
  id             String     @id @default(cuid())
  termId         String
  term           SchoolTerm @relation(fields: [termId], references: [id], onDelete: Cascade)
  eventType      String     // "시업식", "여름방학식", "겨울방학식", "종업식", "공휴일" 등
  date           DateTime   @db.Date
  allowException Boolean    @default(false)
  note           String?
}

enum RepeatUnit {
  DAY
  WEEK
  MONTH
}

enum EndType {
  NONE
  DATE
  COUNT
}

model ScheduleRule {
  id         String      @id @default(cuid())
  termId     String
  term       SchoolTerm  @relation(fields: [termId], references: [id], onDelete: Cascade)
  roomId     String
  room       SpecialRoom @relation(fields: [roomId], references: [id])
  classId    String
  classGroup ClassGroup  @relation(fields: [classId], references: [id])
  subjectId  String?
  subject    Subject?    @relation(fields: [subjectId], references: [id])
  teacherId  String?
  teacher    Teacher?    @relation(fields: [teacherId], references: [id])
  periodId   String
  period     Period      @relation(fields: [periodId], references: [id])

  startDate      DateTime   @db.Date
  repeatInterval Int        @default(1)
  repeatUnit     RepeatUnit @default(WEEK)
  repeatDays     Int[]      // 0=월, 1=화, 2=수, 3=목, 4=금
  endType        EndType    @default(NONE)
  endDate        DateTime?  @db.Date
  endCount       Int?

  entries ScheduleEntry[]
  createdAt DateTime @default(now())
}

model ScheduleEntry {
  id         String      @id @default(cuid())
  termId     String
  term       SchoolTerm  @relation(fields: [termId], references: [id], onDelete: Cascade)
  date       DateTime    @db.Date
  periodId   String
  period     Period      @relation(fields: [periodId], references: [id])
  roomId     String
  room       SpecialRoom @relation(fields: [roomId], references: [id])
  classId    String
  classGroup ClassGroup  @relation(fields: [classId], references: [id])
  subjectId  String?
  subject    Subject?    @relation(fields: [subjectId], references: [id])
  teacherId  String?
  teacher    Teacher?    @relation(fields: [teacherId], references: [id])

  sourceRuleId   String?
  sourceRule     ScheduleRule? @relation(fields: [sourceRuleId], references: [id])
  source         EntrySource   @default(RULE)
  status         EntryStatus   @default(NORMAL)

  @@unique([date, periodId, roomId, classId])
}

enum EntrySource {
  RULE
  RESERVATION
  MANUAL
}

enum EntryStatus {
  NORMAL
  EXCEPTION_CANCELLED
  FORCE_ASSIGNED
  EXCEPTION_ALLOWED
}

model Reservation {
  id         String      @id @default(cuid())
  termId     String
  term       SchoolTerm  @relation(fields: [termId], references: [id], onDelete: Cascade)
  date       DateTime    @db.Date
  periodId   String
  period     Period      @relation(fields: [periodId], references: [id])
  roomId     String
  room       SpecialRoom @relation(fields: [roomId], references: [id])
  classId    String
  classGroup ClassGroup  @relation(fields: [classId], references: [id])
  subjectId  String?
  subject    Subject?    @relation(fields: [subjectId], references: [id])
  teacherId  String?
  teacher    Teacher?    @relation(fields: [teacherId], references: [id])
  reason     String?
  createdAt  DateTime    @default(now())
}
```

- [ ] **Step 3: DB 마이그레이션 실행**

```bash
npx prisma migrate dev --name init
```

Expected: `prisma/migrations/` 디렉터리 생성, DB 테이블 생성 완료.

- [ ] **Step 4: Prisma 클라이언트 생성 확인**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` 메시지 출력.

- [ ] **Step 5: 커밋**

```bash
git add prisma/ .env
git commit -m "feat: add Prisma schema with all entities"
```

---

## Task 3: Prisma 클라이언트 + 공유 타입

**Files:**
- Create: `src/lib/db/client.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: Prisma 클라이언트 싱글톤 작성**

```typescript
// src/lib/db/client.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: 공유 타입 작성**

```typescript
// src/types/index.ts
export type {
  SchoolTerm,
  Grade,
  ClassGroup,
  Subject,
  Teacher,
  TeacherSubject,
  SpecialRoom,
  Period,
  AcademicEvent,
  ScheduleRule,
  ScheduleEntry,
  Reservation,
  SubjectType,
  TeacherType,
  RepeatUnit,
  EndType,
  EntrySource,
  EntryStatus,
} from '@prisma/client'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 // 0=월, 4=금
export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '월', 1: '화', 2: '수', 3: '목', 4: '금',
}

export const TEACHER_TYPE_LABELS: Record<string, string> = {
  HOMEROOM: '담임',
  SPECIALIZED: '전담',
  CONCURRENT: '겸임',
}

export const SUBJECT_TYPE_LABELS: Record<string, string> = {
  SPECIALIZED: '전담',
  GENERAL: '일반',
}

export const REPEAT_UNIT_LABELS: Record<string, string> = {
  DAY: '일',
  WEEK: '주',
  MONTH: '개월',
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/ src/types/
git commit -m "feat: add Prisma client singleton and shared types"
```

---

## Task 4: 학기(SchoolTerm) CRUD + 홈 화면

**Files:**
- Create: `src/features/terms/actions.ts`
- Create: `src/app/page.tsx`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: 학기 Server Actions 작성**

```typescript
// src/features/terms/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { SchoolTerm } from '@prisma/client'

export async function listTerms(): Promise<SchoolTerm[]> {
  return prisma.schoolTerm.findMany({ orderBy: [{ year: 'desc' }, { semester: 'desc' }] })
}

export async function createTerm(data: {
  year: number
  semester: number
  startDate: string
  endDate: string
}): Promise<ActionResult<SchoolTerm>> {
  try {
    const term = await prisma.schoolTerm.create({
      data: {
        year: data.year,
        semester: data.semester,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    })
    revalidatePath('/')
    return { success: true, data: term }
  } catch (e) {
    return { success: false, error: '학기 등록 중 오류가 발생했습니다.' }
  }
}

export async function deleteTerm(id: string): Promise<ActionResult> {
  try {
    await prisma.schoolTerm.delete({ where: { id } })
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학기 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: 루트 레이아웃 작성**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '특별실 시간표',
  description: '초등학교 특별실·전담수업 시간표 관리',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex h-screen">
          <nav className="w-56 bg-gray-900 text-white flex flex-col p-4 gap-2 shrink-0">
            <div className="text-lg font-bold mb-4">특별실 시간표</div>
            <Link href="/" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">🏠 홈</Link>
            <div className="text-xs text-gray-400 mt-2 mb-1 px-3">설정</div>
            <Link href="/rooms" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">특별실</Link>
            <Link href="/classes" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">학년·학급</Link>
            <Link href="/subjects" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">과목</Link>
            <Link href="/teachers" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">교사</Link>
            <Link href="/periods" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">교시</Link>
            <Link href="/academic-calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">학사일정</Link>
            <div className="text-xs text-gray-400 mt-2 mb-1 px-3">시간표</div>
            <Link href="/schedule" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">주간 편집기</Link>
            <Link href="/calendar" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">달력형 보기</Link>
            <Link href="/list" className="px-3 py-2 rounded hover:bg-gray-700 text-sm">목록형 보기</Link>
          </nav>
          <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: 홈 페이지 (학기 목록 + 생성) 작성**

```typescript
// src/app/page.tsx
import { listTerms, createTerm, deleteTerm } from '@/features/terms/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function HomePage() {
  const terms = await listTerms()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">학기 관리</h1>

      <form
        action={async (fd: FormData) => {
          'use server'
          await createTerm({
            year: Number(fd.get('year')),
            semester: Number(fd.get('semester')),
            startDate: fd.get('startDate') as string,
            endDate: fd.get('endDate') as string,
          })
        }}
        className="bg-white rounded-lg p-6 shadow mb-6 space-y-4"
      >
        <h2 className="font-semibold">새 학기 추가</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year">학년도</Label>
            <Input id="year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
          </div>
          <div>
            <Label htmlFor="semester">학기</Label>
            <Input id="semester" name="semester" type="number" min={1} max={2} defaultValue={1} required />
          </div>
          <div>
            <Label htmlFor="startDate">시작일</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="endDate">종료일</Label>
            <Input id="endDate" name="endDate" type="date" required />
          </div>
        </div>
        <Button type="submit">학기 추가</Button>
      </form>

      <div className="space-y-2">
        {terms.map((t) => (
          <div key={t.id} className="bg-white rounded-lg p-4 shadow flex items-center justify-between">
            <span className="font-medium">{t.year}학년도 {t.semester}학기</span>
            <span className="text-sm text-gray-500">
              {t.startDate.toLocaleDateString('ko-KR')} ~ {t.endDate.toLocaleDateString('ko-KR')}
            </span>
            <form action={async () => { 'use server'; await deleteTerm(t.id) }}>
              <Button variant="destructive" size="sm" type="submit">삭제</Button>
            </form>
          </div>
        ))}
        {terms.length === 0 && <p className="text-gray-500 text-sm">등록된 학기가 없습니다.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 동작 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → 학기 추가·삭제 동작 확인.

- [ ] **Step 5: 커밋**

```bash
git add src/features/terms/ src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add SchoolTerm CRUD and app layout"
```

---

## Task 5: 특별실(SpecialRoom) CRUD

**Files:**
- Create: `src/features/rooms/actions.ts`
- Create: `src/features/rooms/RoomForm.tsx`
- Create: `src/features/rooms/RoomList.tsx`
- Create: `src/app/(setup)/rooms/page.tsx`
- Create: `src/app/(setup)/layout.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/rooms/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { SpecialRoom } from '@prisma/client'

export async function listRooms(termId: string): Promise<SpecialRoom[]> {
  return prisma.specialRoom.findMany({
    where: { termId },
    orderBy: { name: 'asc' },
  })
}

export async function createRoom(data: {
  termId: string
  name: string
  roomType: string
  capacity: number
  note?: string
}): Promise<ActionResult<SpecialRoom>> {
  try {
    const room = await prisma.specialRoom.create({ data })
    revalidatePath('/rooms')
    return { success: true, data: room }
  } catch {
    return { success: false, error: '특별실 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateRoom(
  id: string,
  data: { name: string; roomType: string; capacity: number; note?: string }
): Promise<ActionResult<SpecialRoom>> {
  try {
    const room = await prisma.specialRoom.update({ where: { id }, data })
    revalidatePath('/rooms')
    return { success: true, data: room }
  } catch {
    return { success: false, error: '특별실 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteRoom(id: string): Promise<ActionResult> {
  try {
    await prisma.specialRoom.delete({ where: { id } })
    revalidatePath('/rooms')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '특별실 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: RoomForm 컴포넌트 작성**

```typescript
// src/features/rooms/RoomForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createRoom, updateRoom } from './actions'
import { SpecialRoom } from '@prisma/client'

const ROOM_TYPE_PRESETS = ['과학실', '컴퓨터실', '음악실', '미술실', '시청각실', '체육관', '운동장', '도서실']

interface Props {
  termId: string
  room?: SpecialRoom
  trigger: React.ReactNode
}

export function RoomForm({ termId, room, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      name: fd.get('name') as string,
      roomType: fd.get('roomType') as string,
      capacity: Number(fd.get('capacity')),
      note: (fd.get('note') as string) || undefined,
    }
    const result = room ? await updateRoom(room.id, data) : await createRoom(data)
    if (result.success) {
      setOpen(false)
      setError('')
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? '특별실 수정' : '특별실 추가'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" defaultValue={room?.name} required />
          </div>
          <div>
            <Label htmlFor="roomType">종류</Label>
            <Input id="roomType" name="roomType" defaultValue={room?.roomType}
              list="roomTypeList" required placeholder="직접 입력 또는 선택" />
            <datalist id="roomTypeList">
              {ROOM_TYPE_PRESETS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <Label htmlFor="capacity">동시 사용 가능 학급 수</Label>
            <Input id="capacity" name="capacity" type="number" min={1} defaultValue={room?.capacity ?? 1} required />
          </div>
          <div>
            <Label htmlFor="note">비고</Label>
            <Input id="note" name="note" defaultValue={room?.note ?? ''} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{room ? '수정' : '추가'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: RoomList 컴포넌트 작성**

```typescript
// src/features/rooms/RoomList.tsx
import { SpecialRoom } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { RoomForm } from './RoomForm'
import { deleteRoom } from './actions'
import { Badge } from '@/components/ui/badge'

interface Props {
  rooms: SpecialRoom[]
  termId: string
}

export function RoomList({ rooms, termId }: Props) {
  return (
    <div className="space-y-2">
      {rooms.map((room) => (
        <div key={room.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <div className="flex-1">
            <span className="font-medium">{room.name}</span>
            <Badge variant="outline" className="ml-2">{room.roomType}</Badge>
          </div>
          <span className="text-sm text-gray-500">동시 {room.capacity}학급</span>
          {room.note && <span className="text-sm text-gray-400">{room.note}</span>}
          <RoomForm termId={termId} room={room} trigger={<Button variant="outline" size="sm">수정</Button>} />
          <form action={async () => { 'use server'; await deleteRoom(room.id) }}>
            <Button variant="destructive" size="sm" type="submit">삭제</Button>
          </form>
        </div>
      ))}
      {rooms.length === 0 && <p className="text-gray-500 text-sm">등록된 특별실이 없습니다.</p>}
    </div>
  )
}
```

- [ ] **Step 4: 설정 레이아웃 작성**

```typescript
// src/app/(setup)/layout.tsx
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <div className="p-8 max-w-4xl">{children}</div>
}
```

- [ ] **Step 5: 특별실 페이지 작성**

```typescript
// src/app/(setup)/rooms/page.tsx
import { listRooms } from '@/features/rooms/actions'
import { listTerms } from '@/features/terms/actions'
import { RoomList } from '@/features/rooms/RoomList'
import { RoomForm } from '@/features/rooms/RoomForm'
import { Button } from '@/components/ui/button'

export default async function RoomsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]

  if (!activeTerm) {
    return <div className="p-8"><p className="text-gray-500">먼저 홈에서 학기를 등록해 주세요.</p></div>
  }

  const rooms = await listRooms(activeTerm.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">특별실 관리</h1>
        <RoomForm termId={activeTerm.id} trigger={<Button>+ 특별실 추가</Button>} />
      </div>
      <RoomList rooms={rooms} termId={activeTerm.id} />
    </div>
  )
}
```

- [ ] **Step 6: 동작 확인**

```bash
npm run dev
```

`http://localhost:3000/rooms` → 특별실 추가·수정·삭제 동작 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/features/rooms/ src/app/\(setup\)/
git commit -m "feat: add SpecialRoom CRUD"
```

---

## Task 6: 과목(Subject) CRUD

**Files:**
- Create: `src/features/subjects/actions.ts`
- Create: `src/features/subjects/SubjectForm.tsx`
- Create: `src/features/subjects/SubjectList.tsx`
- Create: `src/app/(setup)/subjects/page.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/subjects/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { Subject, SubjectType } from '@prisma/client'

export async function listSubjects(termId: string): Promise<Subject[]> {
  return prisma.subject.findMany({ where: { termId }, orderBy: { name: 'asc' } })
}

export async function createSubject(data: {
  termId: string
  name: string
  type: SubjectType
  requiresRoom: boolean
}): Promise<ActionResult<Subject>> {
  try {
    const subject = await prisma.subject.create({ data })
    revalidatePath('/subjects')
    return { success: true, data: subject }
  } catch {
    return { success: false, error: '과목 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateSubject(
  id: string,
  data: { name: string; type: SubjectType; requiresRoom: boolean }
): Promise<ActionResult<Subject>> {
  try {
    const subject = await prisma.subject.update({ where: { id }, data })
    revalidatePath('/subjects')
    return { success: true, data: subject }
  } catch {
    return { success: false, error: '과목 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  try {
    await prisma.subject.delete({ where: { id } })
    revalidatePath('/subjects')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '과목 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: SubjectForm 컴포넌트 작성**

```typescript
// src/features/subjects/SubjectForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createSubject, updateSubject } from './actions'
import { Subject, SubjectType } from '@prisma/client'

interface Props {
  termId: string
  subject?: Subject
  trigger: React.ReactNode
}

export function SubjectForm({ termId, subject, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<SubjectType>(subject?.type ?? 'GENERAL')
  const [requiresRoom, setRequiresRoom] = useState(subject?.requiresRoom ?? false)

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      name: fd.get('name') as string,
      type,
      requiresRoom,
    }
    const result = subject ? await updateSubject(subject.id, data) : await createSubject(data)
    if (result.success) { setOpen(false); setError('') }
    else setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{subject ? '과목 수정' : '과목 추가'}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">과목명</Label>
            <Input id="name" name="name" defaultValue={subject?.name} required />
          </div>
          <div>
            <Label>종류</Label>
            <Select value={type} onValueChange={(v) => setType(v as SubjectType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SPECIALIZED">전담</SelectItem>
                <SelectItem value="GENERAL">일반</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="requiresRoom" checked={requiresRoom} onCheckedChange={(v) => setRequiresRoom(!!v)} />
            <Label htmlFor="requiresRoom">특별실 필요</Label>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{subject ? '수정' : '추가'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: SubjectList + 페이지 작성**

```typescript
// src/features/subjects/SubjectList.tsx
import { Subject } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubjectForm } from './SubjectForm'
import { deleteSubject } from './actions'
import { SUBJECT_TYPE_LABELS } from '@/types'

export function SubjectList({ subjects, termId }: { subjects: Subject[]; termId: string }) {
  return (
    <div className="space-y-2">
      {subjects.map((s) => (
        <div key={s.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <span className="flex-1 font-medium">{s.name}</span>
          <Badge variant="outline">{SUBJECT_TYPE_LABELS[s.type]}</Badge>
          {s.requiresRoom && <Badge>특별실 필요</Badge>}
          <SubjectForm termId={termId} subject={s} trigger={<Button variant="outline" size="sm">수정</Button>} />
          <form action={async () => { 'use server'; await deleteSubject(s.id) }}>
            <Button variant="destructive" size="sm" type="submit">삭제</Button>
          </form>
        </div>
      ))}
      {subjects.length === 0 && <p className="text-gray-500 text-sm">등록된 과목이 없습니다.</p>}
    </div>
  )
}
```

```typescript
// src/app/(setup)/subjects/page.tsx
import { listSubjects } from '@/features/subjects/actions'
import { listTerms } from '@/features/terms/actions'
import { SubjectList } from '@/features/subjects/SubjectList'
import { SubjectForm } from '@/features/subjects/SubjectForm'
import { Button } from '@/components/ui/button'

export default async function SubjectsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 학기를 등록해 주세요.</p>
  const subjects = await listSubjects(activeTerm.id)
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">과목 관리</h1>
        <SubjectForm termId={activeTerm.id} trigger={<Button>+ 과목 추가</Button>} />
      </div>
      <SubjectList subjects={subjects} termId={activeTerm.id} />
    </div>
  )
}
```

- [ ] **Step 4: 동작 확인 후 커밋**

```bash
git add src/features/subjects/ src/app/\(setup\)/subjects/
git commit -m "feat: add Subject CRUD"
```

---

## Task 7: 교사(Teacher) CRUD (과목 다중 연결 포함)

**Files:**
- Create: `src/features/teachers/actions.ts`
- Create: `src/features/teachers/TeacherForm.tsx`
- Create: `src/features/teachers/TeacherList.tsx`
- Create: `src/app/(setup)/teachers/page.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/teachers/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { Teacher, TeacherType } from '@prisma/client'

type TeacherWithSubjects = Teacher & { teacherSubjects: { subjectId: string }[] }

export async function listTeachers(termId: string): Promise<TeacherWithSubjects[]> {
  return prisma.teacher.findMany({
    where: { termId },
    include: { teacherSubjects: true },
    orderBy: { name: 'asc' },
  })
}

export async function createTeacher(data: {
  termId: string
  name: string
  type: TeacherType
  subjectIds: string[]
}): Promise<ActionResult<Teacher>> {
  try {
    const teacher = await prisma.teacher.create({
      data: {
        termId: data.termId,
        name: data.name,
        type: data.type,
        teacherSubjects: {
          create: data.subjectIds.map((subjectId) => ({ subjectId })),
        },
      },
    })
    revalidatePath('/teachers')
    return { success: true, data: teacher }
  } catch {
    return { success: false, error: '교사 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateTeacher(
  id: string,
  data: { name: string; type: TeacherType; subjectIds: string[] }
): Promise<ActionResult<Teacher>> {
  try {
    await prisma.teacherSubject.deleteMany({ where: { teacherId: id } })
    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        teacherSubjects: {
          create: data.subjectIds.map((subjectId) => ({ subjectId })),
        },
      },
    })
    revalidatePath('/teachers')
    return { success: true, data: teacher }
  } catch {
    return { success: false, error: '교사 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteTeacher(id: string): Promise<ActionResult> {
  try {
    await prisma.teacher.delete({ where: { id } })
    revalidatePath('/teachers')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '교사 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: TeacherForm 컴포넌트 작성**

```typescript
// src/features/teachers/TeacherForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTeacher, updateTeacher } from './actions'
import { Subject, Teacher, TeacherType } from '@prisma/client'

type TeacherWithSubjects = Teacher & { teacherSubjects: { subjectId: string }[] }

interface Props {
  termId: string
  teacher?: TeacherWithSubjects
  subjects: Subject[]
  trigger: React.ReactNode
}

export function TeacherForm({ termId, teacher, subjects, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [type, setType] = useState<TeacherType>(teacher?.type ?? 'HOMEROOM')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    teacher?.teacherSubjects.map((ts) => ts.subjectId) ?? []
  )

  function toggleSubject(id: string) {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  async function handleSubmit(fd: FormData) {
    const data = { termId, name: fd.get('name') as string, type, subjectIds: selectedSubjectIds }
    const result = teacher ? await updateTeacher(teacher.id, data) : await createTeacher(data)
    if (result.success) { setOpen(false); setError('') }
    else setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{teacher ? '교사 수정' : '교사 추가'}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" defaultValue={teacher?.name} required />
          </div>
          <div>
            <Label>종류</Label>
            <Select value={type} onValueChange={(v) => setType(v as TeacherType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HOMEROOM">담임</SelectItem>
                <SelectItem value="SPECIALIZED">전담</SelectItem>
                <SelectItem value="CONCURRENT">겸임</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>담당 과목</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`subject-${s.id}`}
                    checked={selectedSubjectIds.includes(s.id)}
                    onCheckedChange={() => toggleSubject(s.id)}
                  />
                  <Label htmlFor={`subject-${s.id}`}>{s.name}</Label>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{teacher ? '수정' : '추가'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: TeacherList + 페이지 작성**

```typescript
// src/features/teachers/TeacherList.tsx
import { Subject, Teacher } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeacherForm } from './TeacherForm'
import { deleteTeacher } from './actions'
import { TEACHER_TYPE_LABELS } from '@/types'

type TeacherWithSubjects = Teacher & { teacherSubjects: { subjectId: string; subject: Subject }[] }

export function TeacherList({ teachers, subjects, termId }: {
  teachers: TeacherWithSubjects[]
  subjects: Subject[]
  termId: string
}) {
  return (
    <div className="space-y-2">
      {teachers.map((t) => (
        <div key={t.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
          <span className="flex-1 font-medium">{t.name}</span>
          <Badge variant="outline">{TEACHER_TYPE_LABELS[t.type]}</Badge>
          <div className="flex gap-1">
            {t.teacherSubjects.map((ts) => (
              <Badge key={ts.subjectId} variant="secondary">{ts.subject.name}</Badge>
            ))}
          </div>
          <TeacherForm termId={termId} teacher={t as any} subjects={subjects}
            trigger={<Button variant="outline" size="sm">수정</Button>} />
          <form action={async () => { 'use server'; await deleteTeacher(t.id) }}>
            <Button variant="destructive" size="sm" type="submit">삭제</Button>
          </form>
        </div>
      ))}
      {teachers.length === 0 && <p className="text-gray-500 text-sm">등록된 교사가 없습니다.</p>}
    </div>
  )
}
```

```typescript
// src/app/(setup)/teachers/page.tsx
import { listTeachers } from '@/features/teachers/actions'
import { listSubjects } from '@/features/subjects/actions'
import { listTerms } from '@/features/terms/actions'
import { TeacherList } from '@/features/teachers/TeacherList'
import { TeacherForm } from '@/features/teachers/TeacherForm'
import { Button } from '@/components/ui/button'

export default async function TeachersPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 학기를 등록해 주세요.</p>
  const [teachers, subjects] = await Promise.all([
    listTeachers(activeTerm.id),
    listSubjects(activeTerm.id),
  ])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">교사 관리</h1>
        <TeacherForm termId={activeTerm.id} subjects={subjects}
          trigger={<Button>+ 교사 추가</Button>} />
      </div>
      <TeacherList teachers={teachers as any} subjects={subjects} termId={activeTerm.id} />
    </div>
  )
}
```

- [ ] **Step 4: 동작 확인 후 커밋**

```bash
git add src/features/teachers/ src/app/\(setup\)/teachers/
git commit -m "feat: add Teacher CRUD with multi-subject assignment"
```

---

## Task 8: 학년·학급(Grade/ClassGroup) CRUD

**Files:**
- Create: `src/features/classes/actions.ts`
- Create: `src/features/classes/GradeList.tsx`
- Create: `src/features/classes/ClassForm.tsx`
- Create: `src/app/(setup)/classes/page.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/classes/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { ClassGroup, Grade } from '@prisma/client'

type GradeWithClasses = Grade & { classGroups: (ClassGroup & { homeroomTeacher: { name: string } | null })[] }

export async function listGrades(termId: string): Promise<GradeWithClasses[]> {
  return prisma.grade.findMany({
    where: { termId },
    include: { classGroups: { include: { homeroomTeacher: true }, orderBy: { number: 'asc' } } },
    orderBy: { number: 'asc' },
  })
}

export async function ensureGrade(termId: string, gradeNumber: number): Promise<Grade> {
  return prisma.grade.upsert({
    where: { termId_number: { termId, number: gradeNumber } },
    create: { termId, number: gradeNumber },
    update: {},
  })
}

export async function createClassGroup(data: {
  termId: string
  gradeNumber: number
  classNumber: number
  homeroomTeacherId?: string
}): Promise<ActionResult<ClassGroup>> {
  try {
    const grade = await ensureGrade(data.termId, data.gradeNumber)
    const classGroup = await prisma.classGroup.create({
      data: {
        gradeId: grade.id,
        number: data.classNumber,
        homeroomTeacherId: data.homeroomTeacherId || null,
      },
    })
    revalidatePath('/classes')
    return { success: true, data: classGroup }
  } catch {
    return { success: false, error: '학급 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateClassGroup(
  id: string,
  data: { homeroomTeacherId?: string }
): Promise<ActionResult<ClassGroup>> {
  try {
    const classGroup = await prisma.classGroup.update({
      where: { id },
      data: { homeroomTeacherId: data.homeroomTeacherId || null },
    })
    revalidatePath('/classes')
    return { success: true, data: classGroup }
  } catch {
    return { success: false, error: '학급 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteClassGroup(id: string): Promise<ActionResult> {
  try {
    await prisma.classGroup.delete({ where: { id } })
    revalidatePath('/classes')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학급 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: ClassForm + GradeList + 페이지 작성**

```typescript
// src/features/classes/ClassForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClassGroup } from './actions'
import { Teacher } from '@prisma/client'

interface Props {
  termId: string
  teachers: Teacher[]
  trigger: React.ReactNode
}

export function ClassForm({ termId, teachers, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [teacherId, setTeacherId] = useState('')

  async function handleSubmit(fd: FormData) {
    const result = await createClassGroup({
      termId,
      gradeNumber: Number(fd.get('gradeNumber')),
      classNumber: Number(fd.get('classNumber')),
      homeroomTeacherId: teacherId || undefined,
    })
    if (result.success) { setOpen(false); setError('') }
    else setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>학급 추가</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gradeNumber">학년</Label>
              <Input id="gradeNumber" name="gradeNumber" type="number" min={1} max={6} required />
            </div>
            <div>
              <Label htmlFor="classNumber">반</Label>
              <Input id="classNumber" name="classNumber" type="number" min={1} required />
            </div>
          </div>
          <div>
            <Label>담임교사 (선택)</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="선택 안함" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">선택 안함</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">추가</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

```typescript
// src/app/(setup)/classes/page.tsx
import { listGrades } from '@/features/classes/actions'
import { listTeachers } from '@/features/teachers/actions'
import { listTerms } from '@/features/terms/actions'
import { ClassForm } from '@/features/classes/ClassForm'
import { deleteClassGroup } from '@/features/classes/actions'
import { Button } from '@/components/ui/button'

export default async function ClassesPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 학기를 등록해 주세요.</p>
  const [grades, teachers] = await Promise.all([
    listGrades(activeTerm.id),
    listTeachers(activeTerm.id),
  ])
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">학년·학급 관리</h1>
        <ClassForm termId={activeTerm.id} teachers={teachers as any}
          trigger={<Button>+ 학급 추가</Button>} />
      </div>
      <div className="space-y-4">
        {grades.map((grade) => (
          <div key={grade.id} className="bg-white rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-2">{grade.number}학년</h2>
            <div className="space-y-1">
              {grade.classGroups.map((cls) => (
                <div key={cls.id} className="flex items-center gap-4 pl-4">
                  <span>{grade.number}학년 {cls.number}반</span>
                  {cls.homeroomTeacher && (
                    <span className="text-sm text-gray-500">담임: {cls.homeroomTeacher.name}</span>
                  )}
                  <form action={async () => { 'use server'; await deleteClassGroup(cls.id) }}>
                    <Button variant="destructive" size="sm" type="submit">삭제</Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
        {grades.length === 0 && <p className="text-gray-500 text-sm">등록된 학급이 없습니다.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 동작 확인 후 커밋**

```bash
git add src/features/classes/ src/app/\(setup\)/classes/
git commit -m "feat: add Grade/ClassGroup CRUD"
```

---

## Task 9: 교시(Period) CRUD

**Files:**
- Create: `src/features/periods/actions.ts`
- Create: `src/features/periods/PeriodList.tsx`
- Create: `src/features/periods/PeriodForm.tsx`
- Create: `src/app/(setup)/periods/page.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/periods/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { Period } from '@prisma/client'

export async function listPeriods(termId: string): Promise<Period[]> {
  return prisma.period.findMany({ where: { termId }, orderBy: { number: 'asc' } })
}

export async function createPeriod(data: {
  termId: string
  number: number
  startTime: string
  endTime: string
}): Promise<ActionResult<Period>> {
  try {
    const period = await prisma.period.create({ data })
    revalidatePath('/periods')
    return { success: true, data: period }
  } catch {
    return { success: false, error: '교시 등록 중 오류가 발생했습니다.' }
  }
}

export async function updatePeriod(
  id: string,
  data: { startTime: string; endTime: string }
): Promise<ActionResult<Period>> {
  try {
    const period = await prisma.period.update({ where: { id }, data })
    revalidatePath('/periods')
    return { success: true, data: period }
  } catch {
    return { success: false, error: '교시 수정 중 오류가 발생했습니다.' }
  }
}

export async function deletePeriod(id: string): Promise<ActionResult> {
  try {
    await prisma.period.delete({ where: { id } })
    revalidatePath('/periods')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '교시 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: PeriodForm + PeriodList + 페이지 작성**

```typescript
// src/features/periods/PeriodForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createPeriod, updatePeriod } from './actions'
import { Period } from '@prisma/client'

interface Props { termId: string; period?: Period; nextNumber?: number; trigger: React.ReactNode }

export function PeriodForm({ termId, period, nextNumber, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(fd: FormData) {
    const data = { termId, number: Number(fd.get('number')),
      startTime: fd.get('startTime') as string, endTime: fd.get('endTime') as string }
    const result = period ? await updatePeriod(period.id, data) : await createPeriod(data)
    if (result.success) { setOpen(false); setError('') } else setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{period ? '교시 수정' : '교시 추가'}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="number">교시 번호</Label>
            <Input id="number" name="number" type="number" min={1}
              defaultValue={period?.number ?? nextNumber} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">시작 시각</Label>
              <Input id="startTime" name="startTime" type="time" defaultValue={period?.startTime} required />
            </div>
            <div>
              <Label htmlFor="endTime">종료 시각</Label>
              <Input id="endTime" name="endTime" type="time" defaultValue={period?.endTime} required />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{period ? '수정' : '추가'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

```typescript
// src/app/(setup)/periods/page.tsx
import { listPeriods, deletePeriod } from '@/features/periods/actions'
import { listTerms } from '@/features/terms/actions'
import { PeriodForm } from '@/features/periods/PeriodForm'
import { Button } from '@/components/ui/button'

export default async function PeriodsPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 학기를 등록해 주세요.</p>
  const periods = await listPeriods(activeTerm.id)
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">교시 관리</h1>
        <PeriodForm termId={activeTerm.id} nextNumber={(periods.at(-1)?.number ?? 0) + 1}
          trigger={<Button>+ 교시 추가</Button>} />
      </div>
      <div className="space-y-2">
        {periods.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
            <span className="font-medium w-16">{p.number}교시</span>
            <span className="text-gray-600">{p.startTime} ~ {p.endTime}</span>
            <PeriodForm termId={activeTerm.id} period={p}
              trigger={<Button variant="outline" size="sm">수정</Button>} />
            <form action={async () => { 'use server'; await deletePeriod(p.id) }}>
              <Button variant="destructive" size="sm" type="submit">삭제</Button>
            </form>
          </div>
        ))}
        {periods.length === 0 && <p className="text-gray-500 text-sm">등록된 교시가 없습니다.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 동작 확인 후 커밋**

```bash
git add src/features/periods/ src/app/\(setup\)/periods/
git commit -m "feat: add Period CRUD"
```

---

## Task 10: 학사일정(AcademicEvent) CRUD

**Files:**
- Create: `src/features/academic-calendar/actions.ts`
- Create: `src/features/academic-calendar/EventForm.tsx`
- Create: `src/app/(setup)/academic-calendar/page.tsx`

- [ ] **Step 1: Server Actions 작성**

```typescript
// src/features/academic-calendar/actions.ts
'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types'
import { AcademicEvent } from '@prisma/client'

export async function listAcademicEvents(termId: string): Promise<AcademicEvent[]> {
  return prisma.academicEvent.findMany({ where: { termId }, orderBy: { date: 'asc' } })
}

export async function createAcademicEvent(data: {
  termId: string
  eventType: string
  date: string
  allowException: boolean
  note?: string
}): Promise<ActionResult<AcademicEvent>> {
  try {
    const event = await prisma.academicEvent.create({
      data: { ...data, date: new Date(data.date) },
    })
    revalidatePath('/academic-calendar')
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 등록 중 오류가 발생했습니다.' }
  }
}

export async function updateAcademicEvent(
  id: string,
  data: { eventType: string; date: string; allowException: boolean; note?: string }
): Promise<ActionResult<AcademicEvent>> {
  try {
    const event = await prisma.academicEvent.update({
      where: { id }, data: { ...data, date: new Date(data.date) },
    })
    revalidatePath('/academic-calendar')
    return { success: true, data: event }
  } catch {
    return { success: false, error: '학사일정 수정 중 오류가 발생했습니다.' }
  }
}

export async function deleteAcademicEvent(id: string): Promise<ActionResult> {
  try {
    await prisma.academicEvent.delete({ where: { id } })
    revalidatePath('/academic-calendar')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: '학사일정 삭제 중 오류가 발생했습니다.' }
  }
}
```

- [ ] **Step 2: EventForm + 페이지 작성**

```typescript
// src/features/academic-calendar/EventForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createAcademicEvent, updateAcademicEvent } from './actions'
import { AcademicEvent } from '@prisma/client'

const EVENT_TYPE_PRESETS = ['시업식', '여름방학식', '겨울방학식', '종업식', '공휴일', '재량휴업일', '행사']

interface Props { termId: string; event?: AcademicEvent; trigger: React.ReactNode }

export function EventForm({ termId, event, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [allowException, setAllowException] = useState(event?.allowException ?? false)

  async function handleSubmit(fd: FormData) {
    const data = {
      termId,
      eventType: fd.get('eventType') as string,
      date: fd.get('date') as string,
      allowException,
      note: (fd.get('note') as string) || undefined,
    }
    const result = event ? await updateAcademicEvent(event.id, data) : await createAcademicEvent(data)
    if (result.success) { setOpen(false); setError('') } else setError(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{event ? '학사일정 수정' : '학사일정 추가'}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="eventType">종류</Label>
            <Input id="eventType" name="eventType" list="eventTypeList"
              defaultValue={event?.eventType} required placeholder="직접 입력 또는 선택" />
            <datalist id="eventTypeList">
              {EVENT_TYPE_PRESETS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div>
            <Label htmlFor="date">날짜</Label>
            <Input id="date" name="date" type="date"
              defaultValue={event?.date.toISOString().slice(0, 10)} required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="allowException" checked={allowException}
              onCheckedChange={(v) => setAllowException(!!v)} />
            <Label htmlFor="allowException">이 날 예외 배정 허용</Label>
          </div>
          <div>
            <Label htmlFor="note">비고</Label>
            <Input id="note" name="note" defaultValue={event?.note ?? ''} />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">{event ? '수정' : '추가'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

```typescript
// src/app/(setup)/academic-calendar/page.tsx
import { listAcademicEvents, deleteAcademicEvent } from '@/features/academic-calendar/actions'
import { listTerms } from '@/features/terms/actions'
import { EventForm } from '@/features/academic-calendar/EventForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function AcademicCalendarPage() {
  const terms = await listTerms()
  const activeTerm = terms[0]
  if (!activeTerm) return <p className="text-gray-500">먼저 학기를 등록해 주세요.</p>
  const events = await listAcademicEvents(activeTerm.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">학사일정 관리</h1>
        <EventForm termId={activeTerm.id} trigger={<Button>+ 학사일정 추가</Button>} />
      </div>
      <div className="space-y-2">
        {events.map((e) => (
          <div key={e.id} className="bg-white rounded-lg p-4 shadow flex items-center gap-4">
            <span className="font-medium w-24">{e.eventType}</span>
            <span className="text-gray-600">{e.date.toLocaleDateString('ko-KR')}</span>
            {e.allowException && <Badge variant="outline">예외 허용</Badge>}
            {e.note && <span className="text-sm text-gray-400">{e.note}</span>}
            <div className="ml-auto flex gap-2">
              <EventForm termId={activeTerm.id} event={e}
                trigger={<Button variant="outline" size="sm">수정</Button>} />
              <form action={async () => { 'use server'; await deleteAcademicEvent(e.id) }}>
                <Button variant="destructive" size="sm" type="submit">삭제</Button>
              </form>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-gray-500 text-sm">등록된 학사일정이 없습니다.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 동작 확인 후 최종 커밋**

```bash
npm run dev
```

모든 설정 페이지 (`/rooms`, `/subjects`, `/teachers`, `/classes`, `/periods`, `/academic-calendar`) 동작 확인.

```bash
git add src/features/academic-calendar/ src/app/\(setup\)/academic-calendar/
git commit -m "feat: add AcademicEvent CRUD — Plan A complete"
```

---

## 완료 기준

- [ ] `npm run dev` 실행 후 모든 설정 화면에서 CRUD 동작
- [ ] 사이드바 네비게이션으로 모든 설정 페이지 이동 가능
- [ ] Prisma 스키마 마이그레이션 완료 (`prisma/migrations/` 존재)
- [ ] 모든 변경사항 커밋 완료

**다음 단계:** Plan B (배정 엔진 + 주간 그리드 편집기) 진행.
