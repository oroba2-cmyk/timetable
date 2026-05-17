/** 달력·목록 보기 일정 칩/라벨용 */
export type ViewEntryLabelInput = {
  roomId: string | null
  period: { number: number }
  room: { name: string } | null
  classGroup: { number: number; grade: { number: number } }
  subject: { name: string } | null
  teacher: { name: string } | null
}

export function formatViewEntryLabel(e: ViewEntryLabelInput): string {
  const cls = `${e.classGroup.grade.number}-${e.classGroup.number}`
  const period = e.period.number

  if (e.roomId === null) {
    const subject = e.subject?.name
    const teacher = e.teacher?.name
    let main: string
    if (subject && teacher) main = `${subject}-${teacher}`
    else if (subject) main = subject
    else if (teacher) main = teacher
    else main = '전담'
    return `[${period}]${main}(${cls})`
  }

  return `[${period}]${e.room?.name ?? '-'}(${cls})`
}

/** 목록 보기 전담 과목 열: 과목명과 교사명 */
export function formatSpecialistSubjectTeacher(e: ViewEntryLabelInput): string {
  const subject = e.subject?.name
  const teacher = e.teacher?.name
  if (subject && teacher) return `${subject} (${teacher})`
  return subject ?? teacher ?? '-'
}
