import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const u = await prisma.user.findUnique({
    where: { loginId: 'nam' },
    include: { tenant: true },
  })
  if (!u) throw new Error('nam not found')
  const term = await prisma.schoolTerm.findFirst({
    where: { tenantId: u.tenantId },
    orderBy: [{ year: 'desc' }, { semester: 'desc' }],
  })
  if (!term) throw new Error('no term')
  console.log('term', term.year, term.semester, term.id)

  const teachers = await prisma.teacher.findMany({
    where: { termId: term.id },
    orderBy: { name: 'asc' },
  })
  console.log(
    'teachers',
    teachers.map((t) => `${t.name}(${t.type})`).join(', ')
  )

  const subjects = await prisma.subject.findMany({ where: { termId: term.id } })
  console.log('subjects', subjects.map((s) => s.name).join(', '))

  const rooms = await prisma.specialRoom.findMany({ where: { termId: term.id } })
  console.log('rooms', rooms.map((r) => r.name).join(', '))

  const grades = await prisma.grade.findMany({
    where: { termId: term.id },
    include: { classGroups: { orderBy: { number: 'asc' } } },
    orderBy: { number: 'asc' },
  })
  for (const g of grades) {
    console.log(
      `G${g.number}:`,
      g.classGroups.map((c) => c.number).join(',')
    )
  }

  const rules = await prisma.scheduleRule.count({ where: { termId: term.id } })
  const roomRules = await prisma.scheduleRule.count({
    where: { termId: term.id, roomId: { not: null } },
  })
  console.log('rules total', rules, 'room rules', roomRules)
}

main()
  .finally(() => prisma.$disconnect())
