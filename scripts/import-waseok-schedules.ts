/**
 * 와석초 PDF 기초자료 → nam(또는 지정) 테넌트 시간표 import
 *
 * 사용: npx tsx scripts/import-waseok-schedules.ts [pdf경로] [loginId]
 * 기본 pdf: ~/Downloads/2026 와석초 ... 이ong수.pdf
 */
import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import { homedir } from 'os'
import { join } from 'path'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { expectedGradeForRoomKey, parseWaseokPdfText } from './lib/waseok-schedule-parser'
import {
  buildImportContext,
  classKey,
  createWeeklyRule,
  resolveSubjectId,
  resolveTeacherId,
  resolveRoomId,
} from './lib/waseok-import-core'

const DEFAULT_PDF = join(
  homedir(),
  'Downloads',
  '2026 와석초 교사교육과정 작성을 위한 기초자료(최종)_이동수.pdf'
)

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

function loadPdfText(pdfPath: string): string {
  const tmp = '/tmp/waseok-import.txt'
  execSync(`pdftotext "${pdfPath}" "${tmp}"`, { stdio: 'pipe' })
  return readFileSync(tmp, 'utf-8')
}

async function main() {
  const pdfPath = process.argv[2] || DEFAULT_PDF
  const loginId = process.argv[3] || 'nam'

  if (!existsSync(pdfPath)) {
    console.error('PDF 없음:', pdfPath)
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { loginId },
    include: { tenant: true },
  })
  if (!user) {
    console.error('계정 없음:', loginId)
    process.exit(1)
  }

  const term = await prisma.schoolTerm.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })
  if (!term) {
    console.error('학기 없음')
    process.exit(1)
  }

  console.log(`Import: ${user.tenant.schoolName} (${loginId}) — ${term.year}년 ${term.semester}학기`)

  const existing = await prisma.scheduleRule.count({ where: { termId: term.id } })
  if (existing > 0) {
    console.log(`기존 규칙 ${existing}건 삭제 후 재import…`)
    await prisma.scheduleEntry.deleteMany({ where: { termId: term.id } })
    await prisma.scheduleRule.deleteMany({ where: { termId: term.id } })
  }

  const text = loadPdfText(pdfPath)
  const grids = parseWaseokPdfText(text)
  console.log(`파싱된 그리드: ${grids.length}개`)

  const ctx = await buildImportContext(prisma, term.id)
  let ok = 0
  let skip = 0
  let err = 0

  for (const grid of grids) {
    if (grid.kind === 'specialist') {
      const teacherId = resolveTeacherId(ctx, grid.teacherKey)
      const teacherName = grid.teacherKey === 'c' ? '김현진' : grid.teacherKey === 'd' ? '김자영' : grid.teacherKey
      if (!teacherId) {
        console.warn(`  [전담] 교사 없음: ${grid.teacherKey}`)
        skip += grid.slots.length
        continue
      }
      for (const slot of grid.slots) {
        const classId = ctx.classByKey.get(classKey(slot.grade, slot.classNum))
        if (!classId) {
          skip++
          continue
        }
        const subjectId = resolveSubjectId(ctx, slot, teacherName)
        const r = await createWeeklyRule(prisma, ctx, {
          classId,
          subjectId,
          teacherId,
          grade: slot.grade,
          periodNum: slot.period,
          dayIndex: slot.dayIndex,
        })
        if (r === 'ok') ok++
        else if (r === 'skip') skip++
        else err++
      }
      console.log(`  전담 ${grid.teacherKey}: ${grid.slots.length}칸`)
    } else {
      const roomId = resolveRoomId(ctx, grid.roomKey)
      if (!roomId) {
        console.warn(`  [특별실] 매핑 없음: ${grid.roomKey}`)
        skip += grid.slots.length
        continue
      }
      const expectedGrade = expectedGradeForRoomKey(grid.roomKey)
      for (const slot of grid.slots) {
        if (expectedGrade != null && slot.grade !== expectedGrade) {
          skip++
          continue
        }
        const classId = ctx.classByKey.get(classKey(slot.grade, slot.classNum))
        if (!classId) {
          skip++
          continue
        }
        const subjectId = resolveSubjectId(ctx, slot, undefined, grid.roomKey)
        const r = await createWeeklyRule(prisma, ctx, {
          roomId,
          classId,
          subjectId,
          grade: slot.grade,
          periodNum: slot.period,
          dayIndex: slot.dayIndex,
        })
        if (r === 'ok') ok++
        else if (r === 'skip') skip++
        else err++
      }
      console.log(`  특별실 ${grid.roomKey}: ${grid.slots.length}칸`)
    }
  }

  const rules = await prisma.scheduleRule.count({ where: { termId: term.id } })
  const entries = await prisma.scheduleEntry.count({ where: { termId: term.id } })
  console.log(`완료 — 규칙 ${rules}, 엔트리 ${entries} (성공 ${ok}, 스킵 ${skip}, 오류 ${err})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
