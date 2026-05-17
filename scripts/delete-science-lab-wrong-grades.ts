/**
 * 와석 PDF import 시 과학실 그리드에 섞여 들어간 1·2학년 규칙·일정 삭제
 * (제공 표가 아닌 PDF 파서 오류 — 과학실4층5학년·과학실2층3학년 블록 등)
 *
 * 사용: npx tsx scripts/delete-science-lab-wrong-grades.ts [loginId]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const SCIENCE_ROOM_NAMES = ['과학실1', '과학실2'] as const
const WRONG_GRADES = [1, 2]

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const loginId = process.argv[2] || 'nam'
  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user) throw new Error(`계정 없음: ${loginId}`)

  const terms = await prisma.schoolTerm.findMany({
    where: { tenantId: user.tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })

  let totalRules = 0
  let totalEntries = 0

  for (const term of terms) {
    for (const roomName of SCIENCE_ROOM_NAMES) {
      const room = await prisma.specialRoom.findFirst({
        where: { termId: term.id, name: roomName },
      })
      if (!room) continue

      const wrongRules = await prisma.scheduleRule.findMany({
        where: {
          termId: term.id,
          roomId: room.id,
          classGroup: { grade: { number: { in: WRONG_GRADES } } },
        },
        select: { id: true },
      })
      if (wrongRules.length === 0) continue

      const ruleIds = wrongRules.map((r) => r.id)
      const entries = await prisma.scheduleEntry.deleteMany({
        where: { sourceRuleId: { in: ruleIds } },
      })
      const rules = await prisma.scheduleRule.deleteMany({
        where: { id: { in: ruleIds } },
      })

      totalRules += rules.count
      totalEntries += entries.count
      console.log(
        `${term.year}년 ${term.semester}학기 ${roomName} 1·2학년: 규칙 ${rules.count}건, 일정 ${entries.count}건 삭제`
      )
    }
  }

  console.log(`\n합계 규칙 ${totalRules}건, 일정 ${totalEntries}건 삭제`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
