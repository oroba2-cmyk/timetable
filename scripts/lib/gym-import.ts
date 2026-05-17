import type { PrismaClient } from '../../src/generated/prisma'
import { GYM_SCHEDULE } from '../data/gym-schedule'
import { importRoomSchedule } from './room-schedule-import'

export async function importGymSchedule(
  prisma: PrismaClient,
  termId: string,
  roomName = '체육관'
) {
  return importRoomSchedule(prisma, termId, GYM_SCHEDULE, roomName)
}
