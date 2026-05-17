'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { assertTermInTenant, requireSession } from '@/lib/auth/tenant-scope'
import { ActionResult } from '@/types'

export type DataResetCategory =
  | 'schedule'
  | 'reservations'
  | 'academicEvents'
  | 'periods'
  | 'rooms'
  | 'teachers'
  | 'classes'
  | 'subjects'

const CATEGORY_LABELS: Record<DataResetCategory, string> = {
  schedule: '시간표(규칙·주간 일정)',
  reservations: '특별실 예약',
  academicEvents: '학사일정',
  periods: '시정표(교시)',
  rooms: '특별실',
  teachers: '교사',
  classes: '학년·학급',
  subjects: '과목',
}

export async function resetTermData(
  termId: string,
  category: DataResetCategory
): Promise<ActionResult<{ label: string }>> {
  try {
    await requireSession()
    await assertTermInTenant(termId)

    switch (category) {
      case 'schedule':
        await prisma.scheduleEntry.deleteMany({ where: { termId } })
        await prisma.scheduleRule.deleteMany({ where: { termId } })
        break
      case 'reservations':
        await prisma.reservation.deleteMany({ where: { termId } })
        break
      case 'academicEvents':
        await prisma.academicEvent.deleteMany({ where: { termId } })
        break
      case 'periods':
        await prisma.scheduleEntry.deleteMany({ where: { termId } })
        await prisma.scheduleRule.deleteMany({ where: { termId } })
        await prisma.reservation.deleteMany({ where: { termId } })
        await prisma.teacherUnavailability.deleteMany({
          where: { period: { termId } },
        })
        await prisma.roomUnavailability.deleteMany({
          where: { period: { termId } },
        })
        await prisma.period.deleteMany({ where: { termId } })
        break
      case 'rooms':
        await prisma.scheduleEntry.deleteMany({
          where: { termId, roomId: { not: null } },
        })
        await prisma.scheduleRule.deleteMany({
          where: { termId, roomId: { not: null } },
        })
        await prisma.reservation.deleteMany({ where: { termId } })
        await prisma.roomUnavailability.deleteMany({
          where: { room: { termId } },
        })
        await prisma.specialRoom.deleteMany({ where: { termId } })
        break
      case 'teachers':
        await prisma.classGroup.updateMany({
          where: { grade: { termId } },
          data: { homeroomTeacherId: null },
        })
        await prisma.scheduleEntry.deleteMany({
          where: { termId, teacherId: { not: null } },
        })
        await prisma.scheduleRule.deleteMany({
          where: { termId, teacherId: { not: null } },
        })
        await prisma.reservation.deleteMany({
          where: { termId, teacherId: { not: null } },
        })
        await prisma.teacherUnavailability.deleteMany({
          where: { teacher: { termId } },
        })
        await prisma.teacherSubject.deleteMany({
          where: { teacher: { termId } },
        })
        await prisma.teacher.deleteMany({ where: { termId } })
        break
      case 'classes':
        await prisma.scheduleEntry.deleteMany({ where: { termId } })
        await prisma.scheduleRule.deleteMany({ where: { termId } })
        await prisma.reservation.deleteMany({ where: { termId } })
        await prisma.subjectClassGroup.deleteMany({
          where: { classGroup: { grade: { termId } } },
        })
        await prisma.classGroup.deleteMany({
          where: { grade: { termId } },
        })
        await prisma.grade.deleteMany({ where: { termId } })
        break
      case 'subjects':
        await prisma.scheduleEntry.deleteMany({
          where: { termId, subjectId: { not: null } },
        })
        await prisma.scheduleRule.deleteMany({
          where: { termId, subjectId: { not: null } },
        })
        await prisma.reservation.deleteMany({
          where: { termId, subjectId: { not: null } },
        })
        await prisma.teacherSubject.deleteMany({
          where: { subject: { termId } },
        })
        await prisma.subjectClassGroup.deleteMany({
          where: { subject: { termId } },
        })
        await prisma.subject.deleteMany({ where: { termId } })
        break
      default:
        return { success: false, error: '알 수 없는 항목입니다.' }
    }

    revalidatePath('/')
    revalidatePath('/schedule')
    revalidatePath('/specialist')
    revalidatePath('/data-management')
    revalidatePath('/rooms')
    revalidatePath('/teachers')
    revalidatePath('/classes')
    revalidatePath('/subjects')
    revalidatePath('/periods')
    revalidatePath('/academic-calendar')

    return { success: true, data: { label: CATEGORY_LABELS[category] } }
  } catch (err) {
    console.error('[resetTermData]', err)
    const msg = err instanceof Error ? err.message : '초기화에 실패했습니다.'
    return { success: false, error: msg }
  }
}

export async function listTermsForCurrentTenant() {
  try {
    const session = await requireSession()
    const terms = await prisma.schoolTerm.findMany({
      where: { tenantId: session.tenantId },
      orderBy: [{ year: 'desc' }, { semester: 'desc' }],
    })
    return { success: true as const, data: terms }
  } catch (err) {
    console.error('[listTermsForCurrentTenant]', err)
    return { success: false as const, error: '학기 목록을 불러오지 못했습니다.' }
  }
}
