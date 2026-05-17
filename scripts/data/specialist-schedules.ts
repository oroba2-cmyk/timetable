/**
 * 전담교사 주간 시간표 (제공 표 기준)
 * subjectCode: 과=과학, 영=영어, 즐=놀이(즐거운 생활)
 */
export type SpecialistSubjectCode = '과' | '영' | '즐'

export interface SpecialistAssignment {
  teacherName: string
  dayIndex: number // 0=월 … 4=금
  period: number
  grade: number
  classNum: number
  subjectCode: SpecialistSubjectCode
}

function slots(
  teacherName: string,
  dayIndex: number,
  items: { period: number | number[]; grade: number; classNum: number; subject: SpecialistSubjectCode }[]
): SpecialistAssignment[] {
  const out: SpecialistAssignment[] = []
  for (const item of items) {
    const periods = Array.isArray(item.period) ? item.period : [item.period]
    for (const period of periods) {
      out.push({
        teacherName,
        dayIndex,
        period,
        grade: item.grade,
        classNum: item.classNum,
        subjectCode: item.subject,
      })
    }
  }
  return out
}

const S = slots

export const SPECIALIST_SCHEDULES: SpecialistAssignment[] = [
  // ── 김현진 (5과학A) ──
  ...S('김현진', 0, [
    { period: [1, 2], grade: 5, classNum: 1, subject: '과' },
    { period: [3, 4], grade: 5, classNum: 2, subject: '과' },
  ]),
  ...S('김현진', 1, [
    { period: [1, 2], grade: 5, classNum: 3, subject: '과' },
    { period: [3, 4], grade: 5, classNum: 4, subject: '과' },
  ]),
  ...S('김현진', 2, [
    { period: [1, 2], grade: 5, classNum: 5, subject: '과' },
    { period: [3, 4], grade: 5, classNum: 6, subject: '과' },
  ]),
  ...S('김현진', 3, [
    { period: [1, 2], grade: 5, classNum: 7, subject: '과' },
    { period: 3, grade: 5, classNum: 1, subject: '과' },
    { period: 4, grade: 5, classNum: 2, subject: '과' },
    { period: 5, grade: 5, classNum: 5, subject: '과' },
  ]),
  ...S('김현진', 4, [
    { period: 1, grade: 5, classNum: 3, subject: '과' },
    { period: 2, grade: 5, classNum: 4, subject: '과' },
    { period: 3, grade: 5, classNum: 6, subject: '과' },
    { period: 4, grade: 5, classNum: 7, subject: '과' },
  ]),

  // ── 김자영 (5과학B, 6과학A) ──
  ...S('김자영', 0, [
    { period: [1, 2], grade: 6, classNum: 1, subject: '과' },
    { period: [3, 4], grade: 6, classNum: 2, subject: '과' },
  ]),
  ...S('김자영', 1, [
    { period: [1, 2], grade: 6, classNum: 3, subject: '과' },
    { period: [3, 4], grade: 6, classNum: 4, subject: '과' },
  ]),
  ...S('김자영', 2, [
    { period: 1, grade: 6, classNum: 1, subject: '과' },
    { period: 2, grade: 6, classNum: 2, subject: '과' },
    { period: 3, grade: 5, classNum: 9, subject: '과' },
    { period: 4, grade: 5, classNum: 10, subject: '과' },
    { period: 5, grade: 5, classNum: 8, subject: '과' },
  ]),
  ...S('김자영', 3, [
    { period: 1, grade: 6, classNum: 3, subject: '과' },
    { period: 2, grade: 6, classNum: 4, subject: '과' },
    { period: [3, 4], grade: 5, classNum: 8, subject: '과' },
  ]),
  ...S('김자영', 4, [
    { period: [1, 2], grade: 5, classNum: 9, subject: '과' },
    { period: [3, 4], grade: 5, classNum: 10, subject: '과' },
  ]),

  // ── 우주희 (5영어B, 2놀이B) ──
  ...S('우주희', 0, [
    { period: 1, grade: 5, classNum: 6, subject: '영' },
    { period: 2, grade: 5, classNum: 7, subject: '영' },
    { period: 3, grade: 5, classNum: 9, subject: '영' },
    { period: 4, grade: 5, classNum: 10, subject: '영' },
  ]),
  ...S('우주희', 1, [
    { period: 1, grade: 2, classNum: 3, subject: '즐' },
    { period: 2, grade: 2, classNum: 4, subject: '즐' },
    { period: 3, grade: 2, classNum: 5, subject: '즐' },
    { period: 4, grade: 5, classNum: 9, subject: '영' },
    { period: 5, grade: 5, classNum: 8, subject: '영' },
  ]),
  ...S('우주희', 2, [
    { period: 1, grade: 2, classNum: 6, subject: '즐' },
    { period: 2, grade: 2, classNum: 7, subject: '즐' },
    { period: 3, grade: 5, classNum: 10, subject: '영' },
    { period: 4, grade: 5, classNum: 7, subject: '영' },
  ]),
  ...S('우주희', 3, [
    { period: 1, grade: 5, classNum: 8, subject: '영' },
    { period: 2, grade: 5, classNum: 10, subject: '영' },
    { period: 3, grade: 5, classNum: 6, subject: '영' },
    { period: 4, grade: 5, classNum: 9, subject: '영' },
  ]),
  ...S('우주희', 4, [
    { period: 1, grade: 5, classNum: 6, subject: '영' },
    { period: 2, grade: 5, classNum: 7, subject: '영' },
    { period: 3, grade: 5, classNum: 8, subject: '영' },
  ]),

  // ── 김영주 (4과학) ──
  ...S('김영주', 0, [
    { period: [1, 2], grade: 4, classNum: 1, subject: '과' },
    { period: [3, 4], grade: 4, classNum: 2, subject: '과' },
  ]),
  ...S('김영주', 1, [
    { period: [1, 2], grade: 4, classNum: 3, subject: '과' },
    { period: [3, 4], grade: 4, classNum: 4, subject: '과' },
  ]),
  ...S('김영주', 2, [
    { period: [1, 2], grade: 4, classNum: 5, subject: '과' },
    { period: [3, 4], grade: 4, classNum: 6, subject: '과' },
  ]),
  ...S('김영주', 3, [
    { period: [1, 2], grade: 4, classNum: 7, subject: '과' },
    { period: [3, 4], grade: 4, classNum: 8, subject: '과' },
  ]),
  ...S('김영주', 4, [
    { period: [1, 2], grade: 4, classNum: 9, subject: '과' },
    { period: [3, 4], grade: 4, classNum: 10, subject: '과' },
  ]),

  // ── 신갑천 (2놀이A, 3과학) ──
  ...S('신갑천', 0, [
    { period: 1, grade: 2, classNum: 1, subject: '즐' },
    { period: 2, grade: 2, classNum: 2, subject: '즐' },
  ]),
  ...S('신갑천', 1, [
    { period: [1, 2], grade: 3, classNum: 1, subject: '과' },
    { period: [3, 4], grade: 3, classNum: 2, subject: '과' },
  ]),
  ...S('신갑천', 2, [
    { period: [1, 2], grade: 3, classNum: 3, subject: '과' },
    { period: [3, 4], grade: 3, classNum: 4, subject: '과' },
  ]),
  ...S('신갑천', 3, [
    { period: [1, 2], grade: 3, classNum: 5, subject: '과' },
    { period: [3, 4], grade: 3, classNum: 6, subject: '과' },
  ]),
  ...S('신갑천', 4, [
    { period: [1, 2], grade: 3, classNum: 7, subject: '과' },
    { period: [3, 4], grade: 3, classNum: 8, subject: '과' },
  ]),

  // ── 신선우 (4영어) ──
  ...S('신선우', 0, [
    { period: 1, grade: 4, classNum: 10, subject: '영' },
    { period: 2, grade: 4, classNum: 9, subject: '영' },
    { period: 3, grade: 4, classNum: 3, subject: '영' },
    { period: 4, grade: 4, classNum: 4, subject: '영' },
  ]),
  ...S('신선우', 1, [
    { period: 1, grade: 4, classNum: 9, subject: '영' },
    { period: 2, grade: 4, classNum: 5, subject: '영' },
    { period: 3, grade: 4, classNum: 6, subject: '영' },
    { period: 4, grade: 4, classNum: 7, subject: '영' },
  ]),
  ...S('신선우', 2, [
    { period: 1, grade: 4, classNum: 1, subject: '영' },
    { period: 2, grade: 4, classNum: 2, subject: '영' },
    { period: 3, grade: 4, classNum: 7, subject: '영' },
    { period: 4, grade: 4, classNum: 8, subject: '영' },
  ]),
  ...S('신선우', 3, [
    { period: 1, grade: 4, classNum: 6, subject: '영' },
    { period: 2, grade: 4, classNum: 5, subject: '영' },
    { period: 3, grade: 4, classNum: 3, subject: '영' },
    { period: 4, grade: 4, classNum: 10, subject: '영' },
  ]),
  ...S('신선우', 4, [
    { period: 1, grade: 4, classNum: 1, subject: '영' },
    { period: 2, grade: 4, classNum: 2, subject: '영' },
    { period: 3, grade: 4, classNum: 8, subject: '영' },
    { period: 4, grade: 4, classNum: 4, subject: '영' },
  ]),

  // ── 이호연 (3영어, 1놀이B) ──
  ...S('이호연', 0, [
    { period: 1, grade: 3, classNum: 1, subject: '영' },
    { period: 2, grade: 3, classNum: 2, subject: '영' },
    { period: 3, grade: 3, classNum: 7, subject: '영' },
    { period: 4, grade: 3, classNum: 4, subject: '영' },
  ]),
  ...S('이호연', 1, [
    { period: 1, grade: 3, classNum: 8, subject: '영' },
    { period: 2, grade: 3, classNum: 7, subject: '영' },
    { period: 3, grade: 3, classNum: 3, subject: '영' },
  ]),
  ...S('이호연', 2, [
    { period: 1, grade: 3, classNum: 1, subject: '영' },
    { period: 2, grade: 3, classNum: 2, subject: '영' },
    { period: 3, grade: 3, classNum: 5, subject: '영' },
    { period: 4, grade: 3, classNum: 6, subject: '영' },
  ]),
  ...S('이호연', 3, [
    { period: 1, grade: 1, classNum: 5, subject: '즐' },
    { period: 2, grade: 1, classNum: 6, subject: '즐' },
    { period: 3, grade: 1, classNum: 7, subject: '즐' },
    { period: 4, grade: 3, classNum: 8, subject: '영' },
  ]),
  ...S('이호연', 4, [
    { period: 1, grade: 3, classNum: 3, subject: '영' },
    { period: 2, grade: 3, classNum: 4, subject: '영' },
    { period: 3, grade: 3, classNum: 5, subject: '영' },
    { period: 4, grade: 3, classNum: 6, subject: '영' },
  ]),

  // ── 한송화 (6과학, 1놀이A) ──
  ...S('한송화', 0, [
    { period: [1, 2], grade: 6, classNum: 5, subject: '과' },
    { period: 3, grade: 1, classNum: 1, subject: '즐' },
    { period: 4, grade: 1, classNum: 2, subject: '즐' },
  ]),
  ...S('한송화', 1, [
    { period: [1, 2], grade: 6, classNum: 7, subject: '과' },
    { period: 3, grade: 6, classNum: 9, subject: '과' },
    { period: 4, grade: 1, classNum: 4, subject: '즐' },
  ]),
  ...S('한송화', 2, [
    { period: [1, 2], grade: 6, classNum: 5, subject: '과' },
    { period: [3, 4], grade: 6, classNum: 6, subject: '과' },
  ]),
  ...S('한송화', 3, [
    { period: [1, 2], grade: 6, classNum: 7, subject: '과' },
    { period: [3, 4], grade: 6, classNum: 8, subject: '과' },
  ]),
  ...S('한송화', 4, [
    { period: [1, 2], grade: 6, classNum: 9, subject: '과' },
    { period: 3, grade: 1, classNum: 3, subject: '즐' },
  ]),

  // ── 이기백 (5영어A, 6영어A) ──
  ...S('이기백', 0, [
    { period: 2, grade: 6, classNum: 9, subject: '영' },
    { period: 3, grade: 5, classNum: 3, subject: '영' },
    { period: 4, grade: 5, classNum: 4, subject: '영' },
    { period: 5, grade: 6, classNum: 8, subject: '영' },
  ]),
  ...S('이기백', 1, [
    { period: 2, grade: 5, classNum: 2, subject: '영' },
    { period: 3, grade: 5, classNum: 5, subject: '영' },
    { period: 4, grade: 5, classNum: 3, subject: '영' },
    { period: 5, grade: 5, classNum: 1, subject: '영' },
  ]),
  ...S('이기백', 2, [
    { period: 2, grade: 6, classNum: 9, subject: '영' },
    { period: 3, grade: 5, classNum: 4, subject: '영' },
    { period: 4, grade: 5, classNum: 1, subject: '영' },
    { period: 5, grade: 6, classNum: 8, subject: '영' },
  ]),
  ...S('이기백', 3, [
    { period: 2, grade: 5, classNum: 5, subject: '영' },
    { period: 3, grade: 5, classNum: 3, subject: '영' },
    { period: 4, grade: 5, classNum: 4, subject: '영' },
    { period: 5, grade: 5, classNum: 2, subject: '영' },
  ]),
  ...S('이기백', 4, [
    { period: 1, grade: 6, classNum: 8, subject: '영' },
    { period: 2, grade: 5, classNum: 1, subject: '영' },
    { period: 3, grade: 6, classNum: 9, subject: '영' },
    { period: 4, grade: 5, classNum: 2, subject: '영' },
    { period: 5, grade: 5, classNum: 5, subject: '영' },
  ]),

  // ── 최향춘 (6영어B) ──
  ...S('최향춘', 0, [
    { period: 2, grade: 6, classNum: 3, subject: '영' },
    { period: 3, grade: 6, classNum: 4, subject: '영' },
    { period: 4, grade: 6, classNum: 5, subject: '영' },
  ]),
  ...S('최향춘', 1, [
    { period: 1, grade: 6, classNum: 6, subject: '영' },
    { period: 2, grade: 6, classNum: 2, subject: '영' },
    { period: 3, grade: 6, classNum: 7, subject: '영' },
    { period: 4, grade: 6, classNum: 5, subject: '영' },
  ]),
  ...S('최향춘', 2, [
    { period: 1, grade: 6, classNum: 4, subject: '영' },
    { period: 2, grade: 6, classNum: 3, subject: '영' },
    { period: 3, grade: 6, classNum: 7, subject: '영' },
    { period: 4, grade: 6, classNum: 1, subject: '영' },
  ]),
  ...S('최향춘', 3, [
    { period: 1, grade: 6, classNum: 1, subject: '영' },
    { period: 2, grade: 6, classNum: 2, subject: '영' },
    { period: 3, grade: 6, classNum: 6, subject: '영' },
    { period: 4, grade: 6, classNum: 4, subject: '영' },
    { period: 5, grade: 6, classNum: 5, subject: '영' },
  ]),
  ...S('최향춘', 4, [
    { period: 1, grade: 6, classNum: 6, subject: '영' },
    { period: 2, grade: 6, classNum: 7, subject: '영' },
    { period: 3, grade: 6, classNum: 1, subject: '영' },
    { period: 4, grade: 6, classNum: 2, subject: '영' },
    { period: 5, grade: 6, classNum: 3, subject: '영' },
  ]),
]
