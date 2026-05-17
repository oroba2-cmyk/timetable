import {
  buildClassCountByGrade,
  formatClassLabel,
  type ClassCountByGrade,
} from './format-class-label'

export interface CellEntryLike {
  id: string
  roomId: string | null
  sourceRuleId: string | null
  classGroup: { number: number; grade: { number: number } }
  status: string
  subjectId: string | null
  teacherId: string | null
  subjectName: string | null
  teacherName: string | null
}

export interface CellEntryDisplayGroup {
  key: string
  entryIds: string[]
  sourceRuleIds: string[]
  classLabel: string
  status: string
  subjectName: string | null
  teacherName: string | null
  roomId: string | null
}

function bucketKey(e: CellEntryLike): string {
  return [
    e.roomId ?? '',
    e.subjectId ?? '',
    e.teacherId ?? '',
    e.status,
    e.subjectName ?? '',
    e.teacherName ?? '',
  ].join('|')
}

/** 같은 칸·같은 배정 메타데이터끼리 묶어 학년 단위 라벨로 표시 */
export function groupCellEntriesForDisplay(
  entries: CellEntryLike[],
  classCountByGrade: ClassCountByGrade
): CellEntryDisplayGroup[] {
  const buckets = new Map<string, CellEntryLike[]>()
  for (const e of entries) {
    const key = bucketKey(e)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(e)
  }

  const groups: CellEntryDisplayGroup[] = []
  for (const [bucket, list] of buckets) {
    const classLabel = formatClassLabel(
      list.map((e) => ({
        gradeNumber: e.classGroup.grade.number,
        classNumber: e.classGroup.number,
      })),
      classCountByGrade
    )
    const sourceRuleIds = [
      ...new Set(list.map((e) => e.sourceRuleId).filter((id): id is string => id != null)),
    ]
    const entryIds = list.map((e) => e.id)
    groups.push({
      key: entryIds.join('|'),
      entryIds,
      sourceRuleIds,
      classLabel,
      status: list[0].status,
      subjectName: list[0].subjectName,
      teacherName: list[0].teacherName,
      roomId: list[0].roomId,
    })
  }

  return groups.sort((a, b) => a.classLabel.localeCompare(b.classLabel, 'ko'))
}

export { buildClassCountByGrade }
