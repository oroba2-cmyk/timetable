/** 학급 표기용 (학년·반 번호) */
export type ClassRef = { gradeNumber: number; classNumber: number }

/** 학년별 전체 학급 수 (예: 3학년 8반 → 8) */
export type ClassCountByGrade = Map<number, number>

export function buildClassCountByGrade(
  classes: { grade: { number: number }; number: number }[]
): ClassCountByGrade {
  const byGrade = new Map<number, Set<number>>()
  for (const c of classes) {
    const g = c.grade.number
    if (!byGrade.has(g)) byGrade.set(g, new Set())
    byGrade.get(g)!.add(c.number)
  }
  return new Map([...byGrade.entries()].map(([g, set]) => [g, set.size]))
}

/**
 * 특별실 시간표 표기: 해당 학년 전 반이면 "3학년", 일부만이면 "3-2, 3-3", 여러 학년 전체는 "3,4학년"
 */
export function formatClassLabel(
  refs: ClassRef[],
  classCountByGrade: ClassCountByGrade
): string {
  if (refs.length === 0) return ''

  const byGrade = new Map<number, number[]>()
  for (const { gradeNumber, classNumber } of refs) {
    if (!byGrade.has(gradeNumber)) byGrade.set(gradeNumber, [])
    const nums = byGrade.get(gradeNumber)!
    if (!nums.includes(classNumber)) nums.push(classNumber)
  }

  const fullGrades: number[] = []
  const partialParts: string[] = []

  for (const grade of [...byGrade.keys()].sort((a, b) => a - b)) {
    const nums = [...byGrade.get(grade)!].sort((a, b) => a - b)
    const total = classCountByGrade.get(grade)
    if (total != null && total > 0 && nums.length === total) {
      fullGrades.push(grade)
    } else {
      partialParts.push(nums.map((n) => `${grade}-${n}`).join(', '))
    }
  }

  const parts: string[] = []
  if (fullGrades.length === 1) {
    parts.push(`${fullGrades[0]}학년`)
  } else if (fullGrades.length > 1) {
    parts.push(`${fullGrades.join(',')}학년`)
  }
  parts.push(...partialParts)

  return parts.filter(Boolean).join(', ')
}
