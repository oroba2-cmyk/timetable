import { formatClassLabel, type ClassCountByGrade } from './format-class-label'

export interface RuleGroupable {
  id: string
  roomName: string
  periodNumber: number
  classGradeNumber: number
  classNumber: number
  subjectName: string | null
  teacherName: string | null
  startDate: string
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  edit: {
    roomId: string | null
    repeatDays: number[]
    endType: 'NONE' | 'DATE' | 'COUNT'
    endDate: string | null
    endCount: number | null
    subjectId: string | null
    teacherId: string | null
  }
}

export interface GroupedScheduleRule<T extends RuleGroupable> {
  key: string
  rules: T[]
  ruleIds: string[]
  classLabel: string
  roomName: string
  periodNumber: number
  subjectName: string | null
  teacherName: string | null
  startDate: string
  repeatInterval: number
  repeatUnit: 'DAY' | 'WEEK' | 'MONTH'
  edit: T['edit']
}

function ruleSignature(r: RuleGroupable): string {
  const days = [...r.edit.repeatDays].sort((a, b) => a - b).join(',')
  return [
    r.edit.roomId ?? '',
    r.periodNumber,
    r.startDate,
    r.repeatInterval,
    r.repeatUnit,
    r.edit.endType,
    r.edit.endDate ?? '',
    r.edit.endCount ?? '',
    r.edit.subjectId ?? '',
    r.edit.teacherId ?? '',
    days,
  ].join('|')
}

/** 동일 반복·장소·교시 규칙을 학년 단위 라벨로 묶음 */
export function groupScheduleRules<T extends RuleGroupable>(
  rules: T[],
  classCountByGrade: ClassCountByGrade
): GroupedScheduleRule<T>[] {
  const buckets = new Map<string, T[]>()
  for (const r of rules) {
    const sig = ruleSignature(r)
    if (!buckets.has(sig)) buckets.set(sig, [])
    buckets.get(sig)!.push(r)
  }

  const grouped: GroupedScheduleRule<T>[] = []
  for (const [sig, list] of buckets) {
    const classLabel = formatClassLabel(
      list.map((r) => ({
        gradeNumber: r.classGradeNumber,
        classNumber: r.classNumber,
      })),
      classCountByGrade
    )
    const sorted = [...list].sort((a, b) => {
      if (a.classGradeNumber !== b.classGradeNumber) {
        return a.classGradeNumber - b.classGradeNumber
      }
      return a.classNumber - b.classNumber
    })
    const ruleIds = sorted.map((r) => r.id)
    grouped.push({
      key: ruleIds.join('|'),
      rules: sorted,
      ruleIds,
      classLabel,
      roomName: sorted[0].roomName,
      periodNumber: sorted[0].periodNumber,
      subjectName: sorted[0].subjectName,
      teacherName: sorted[0].teacherName,
      startDate: sorted[0].startDate,
      repeatInterval: sorted[0].repeatInterval,
      repeatUnit: sorted[0].repeatUnit,
      edit: sorted[0].edit,
    })
  }

  return grouped.sort((a, b) => {
    if (a.roomName !== b.roomName) return a.roomName.localeCompare(b.roomName, 'ko')
    if (a.periodNumber !== b.periodNumber) return a.periodNumber - b.periodNumber
    return a.classLabel.localeCompare(b.classLabel, 'ko')
  })
}
