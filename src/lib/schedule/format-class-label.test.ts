import { describe, it, expect } from 'vitest'
import { formatClassLabel } from './format-class-label'

const counts = new Map([
  [3, 8],
  [4, 10],
  [5, 7],
])

describe('formatClassLabel', () => {
  it('해당 학년 전 반이면 N학년', () => {
    const refs = Array.from({ length: 8 }, (_, i) => ({
      gradeNumber: 3,
      classNumber: i + 1,
    }))
    expect(formatClassLabel(refs, counts)).toBe('3학년')
  })

  it('일부 반만이면 3-2, 3-3 형식', () => {
    expect(
      formatClassLabel(
        [
          { gradeNumber: 3, classNumber: 2 },
          { gradeNumber: 3, classNumber: 3 },
        ],
        counts
      )
    ).toBe('3-2, 3-3')
  })

  it('여러 학년 전 반이면 3,4학년', () => {
    const refs = [
      ...Array.from({ length: 8 }, (_, i) => ({ gradeNumber: 3, classNumber: i + 1 })),
      ...Array.from({ length: 10 }, (_, i) => ({ gradeNumber: 4, classNumber: i + 1 })),
    ]
    expect(formatClassLabel(refs, counts)).toBe('3,4학년')
  })
})
