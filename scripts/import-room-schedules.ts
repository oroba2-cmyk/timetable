/**
 * 특별실 주간 사용표 import
 * 사용: npx tsx scripts/import-room-schedules.ts [loginId] [특별실키|all]
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { AUDIOVISUAL_SCHEDULE } from './data/audiovisual-schedule'
import { COMPUTER1_SCHEDULE } from './data/computer1-schedule'
import { COMPUTER2_SCHEDULE } from './data/computer2-schedule'
import { GYM_SCHEDULE } from './data/gym-schedule'
import { MUSIC_SCHEDULE } from './data/music-schedule'
import { PLAYGROUND_SCHEDULE } from './data/playground-schedule'
import { SCIENCE1_SCHEDULE, SCIENCE2_SCHEDULE } from './data/science-schedule'
import type { RoomScheduleSlot } from './data/room-schedule-types'
import { importRoomSchedule } from './lib/room-schedule-import'
import { importGymSchedule } from './lib/gym-import'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

const ROOMS: Record<string, { name: string; schedule: RoomScheduleSlot[] }> = {
  체육관: { name: '체육관', schedule: GYM_SCHEDULE },
  음악실: { name: '음악실', schedule: MUSIC_SCHEDULE },
  운동장: { name: '운동장', schedule: PLAYGROUND_SCHEDULE },
  시청각실: { name: '시청각실', schedule: AUDIOVISUAL_SCHEDULE },
  컴퓨터실1: { name: '컴퓨터실1', schedule: COMPUTER1_SCHEDULE },
  컴퓨터실2: { name: '컴퓨터실2', schedule: COMPUTER2_SCHEDULE },
  과학실1: { name: '과학실1', schedule: SCIENCE1_SCHEDULE },
  과학실2: { name: '과학실2', schedule: SCIENCE2_SCHEDULE },
}

/** 동시 배정 허용을 위한 특별실 capacity (등록값 갱신) */
const ROOM_CAPACITY: Record<string, number> = {
  과학실1: 2,
  과학실2: 2,
  체육관: 10,
  음악실: 10,
  운동장: 4,
  시청각실: 4,
  다목적실: 4,
}

async function applyRoomCapacities(prisma: PrismaClient, termId: string) {
  for (const [name, capacity] of Object.entries(ROOM_CAPACITY)) {
    const updated = await prisma.specialRoom.updateMany({
      where: { termId, name },
      data: { capacity },
    })
    if (updated.count > 0) {
      console.log(`  ${name} 동시 사용 학급 수 → ${capacity}`)
    }
  }
}

async function main() {
  const loginId = process.argv[2] || 'nam'
  const target = process.argv[3] || 'all'

  const user = await prisma.user.findUnique({ where: { loginId } })
  if (!user) throw new Error(`계정 없음: ${loginId}`)

  const keys =
    target === 'all'
      ? Object.keys(ROOMS)
      : target in ROOMS
        ? [target]
        : null
  if (!keys) {
    throw new Error(
      `대상 없음: ${target} (${Object.keys(ROOMS).join('|')}|all)`
    )
  }

  const terms = await prisma.schoolTerm.findMany({
    where: { tenantId: user.tenantId, year: 2026 },
    orderBy: { semester: 'asc' },
  })

  for (const term of terms) {
    console.log(`\n=== ${term.year}년 ${term.semester}학기 ===`)
    console.log('특별실 capacity 갱신:')
    await applyRoomCapacities(prisma, term.id)
    for (const key of keys) {
      const { name, schedule } = ROOMS[key]
      const { rules, skipped } =
        key === '체육관'
          ? await importGymSchedule(prisma, term.id, name)
          : await importRoomSchedule(prisma, term.id, schedule, name)
      const room = await prisma.specialRoom.findFirst({
        where: { termId: term.id, name },
      })
      const entries = room
        ? await prisma.scheduleEntry.count({ where: { termId: term.id, roomId: room.id } })
        : 0
      console.log(`${name}: 규칙 ${rules}건, 스킵 ${skipped}, 엔트리 ${entries}건`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
