'use server'

import { prisma } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types'
import type { SpecialRoom } from '@/generated/prisma'

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
