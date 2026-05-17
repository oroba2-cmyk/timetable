/**
 * 와석초 PDF(pdftotext)에서 전담·특별실 주간 그리드 추출
 */

export type SubjectCode = '과' | '영' | '즐'

export interface ParsedSlot {
  dayIndex: number // 0=월 … 4=금
  period: number // 1–6
  grade: number
  classNum: number
  subjectCode?: SubjectCode
}

export interface ParsedSpecialistGrid {
  kind: 'specialist'
  teacherKey: string // 'c' | 'd' | 실명
  slots: ParsedSlot[]
}

export interface ParsedRoomGrid {
  kind: 'room'
  roomKey: string // PDF 헤더 (예: 과학실2층6학년)
  slots: ParsedSlot[]
}

export type ParsedGrid = ParsedSpecialistGrid | ParsedRoomGrid

const CELL_RE = /^(\d)-(\d+)(?:-(과|영|즐))?$/
const PERIOD_RE = /^[1-6]$/
const SKIP_RE = /^×|방과후|학년$|^[AB]$/

const SPECIALIST_HEADERS: { pattern: RegExp; teacherKey: string }[] = [
  { pattern: /^c\s*\(/i, teacherKey: 'c' },
  { pattern: /^d\s*\(/i, teacherKey: 'd' },
  { pattern: /^우주희\s*\(/, teacherKey: '우주희' },
  { pattern: /^김영주\s*\(/, teacherKey: '김영주' },
  { pattern: /^신갑천\s*\(/, teacherKey: '신갑천' },
  { pattern: /^신선우\s*\(/, teacherKey: '신선우' },
  { pattern: /^이기백\s*\(/, teacherKey: '이기백' },
  { pattern: /^이호연\s*\(/, teacherKey: '이호연' },
  { pattern: /^최향춘\s*\(/, teacherKey: '최향춘' },
  { pattern: /^한송화\s*\(/, teacherKey: '한송화' },
]

const ROOM_HEADERS = [
  '과학실2층6학년',
  '과학실4층4학년',
  '과학실4층5학년',
  '과학실2층3학년',
  '다목적실',
  '운동장',
  '체육관',
  '음악실',
  '컴퓨터실 2층',
  '컴퓨터실 4층',
  '시청각실',
]

function normalizeLine(line: string): string {
  return line.trim().replace(/^[■∎●]\s*/, '')
}

function parseCell(line: string): Omit<ParsedSlot, 'dayIndex' | 'period'> | null {
  const t = normalizeLine(line)
  if (!t || SKIP_RE.test(t) || t === '월' || t === '화' || t === '수' || t === '목' || t === '금') {
    return null
  }
  const m = CELL_RE.exec(t)
  if (!m) return null
  return {
    grade: parseInt(m[1], 10),
    classNum: parseInt(m[2], 10),
    subjectCode: (m[3] as SubjectCode | undefined) ?? undefined,
  }
}

function findWeekHeaderIndex(lines: string[], from: number): number {
  const days = ['월', '화', '수', '목', '금']
  for (let i = from; i < lines.length; i++) {
    let j = i
    let matched = 0
    while (matched < 5 && j < lines.length) {
      const t = lines[j].trim()
      j++
      if (!t) continue
      if (t === days[matched]) {
        matched++
        continue
      }
      break
    }
    if (matched === 5) return j
  }
  return -1
}

/** period 번호 다음 줄들을 요일 순으로 슬롯에 매핑 (한 요일에 여러 학급 가능) */
function readPeriodSlots(
  lines: string[],
  startIdx: number,
  period: number
): { slots: ParsedSlot[]; nextIdx: number } {
  const slots: ParsedSlot[] = []
  let i = startIdx
  const cells: Omit<ParsedSlot, 'dayIndex' | 'period'>[] = []

  while (i < lines.length) {
    const t = lines[i].trim()
    if (PERIOD_RE.test(t) && parseInt(t, 10) !== period) break
    if (
      t.startsWith('■') ||
      t.startsWith('∎') ||
      SPECIALIST_HEADERS.some((h) => h.pattern.test(normalizeLine(t))) ||
      ROOM_HEADERS.some((r) => normalizeLine(t).includes(r.replace(/\s/g, '')) ||
        normalizeLine(t).includes(r))
    ) {
      break
    }
    const cell = parseCell(t)
    if (cell) cells.push(cell)
    else if (t === '월') break
    i++
  }

  // 요일별: 5열 그리드 — 셀 수가 5의 배수면 요일당 균등, 아니면 순차 1셀=1요일
  if (cells.length === 0) return { slots, nextIdx: i }

  if (cells.length <= 5) {
    for (let d = 0; d < cells.length; d++) {
      slots.push({ ...cells[d], dayIndex: d, period })
    }
  } else {
    // 다목적실 등: 5요일 × (여러 학급) — 5개씩 묶거나 남은 셀은 앞 요일부터
    const perDay = Math.ceil(cells.length / 5)
    let ci = 0
    for (let d = 0; d < 5 && ci < cells.length; d++) {
      for (let k = 0; k < perDay && ci < cells.length; k++) {
        slots.push({ ...cells[ci], dayIndex: d, period })
        ci++
      }
    }
  }

  return { slots, nextIdx: i }
}

function parseGridBlock(
  lines: string[],
  headerIdx: number,
  meta: { kind: 'specialist'; teacherKey: string } | { kind: 'room'; roomKey: string }
): ParsedGrid | null {
  const start = findWeekHeaderIndex(lines, headerIdx)
  if (start < 0) return null

  const allSlots: ParsedSlot[] = []
  let i = start

  while (i < lines.length) {
    const t = lines[i].trim()
    if (!t) {
      i++
      continue
    }
    if (!PERIOD_RE.test(t)) {
      i++
      if (i - start > 80) break
      continue
    }
    const period = parseInt(t, 10)
    const { slots, nextIdx } = readPeriodSlots(lines, i + 1, period)
    allSlots.push(...slots)
    i = nextIdx
    if (nextIdx - start > 120) break
  }

  if (allSlots.length === 0) return null

  if (meta.kind === 'specialist') {
    return { kind: 'specialist', teacherKey: meta.teacherKey, slots: allSlots }
  }
  return { kind: 'room', roomKey: meta.roomKey, slots: allSlots }
}

export function parseWaseokPdfText(raw: string): ParsedGrid[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim())
  const grids: ParsedGrid[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const norm = normalizeLine(lines[i])

    for (const { pattern, teacherKey } of SPECIALIST_HEADERS) {
      if (pattern.test(norm)) {
        const key = `sp:${teacherKey}`
        if (seen.has(key)) continue
        const grid = parseGridBlock(lines, i, { kind: 'specialist', teacherKey })
        if (grid && grid.slots.length > 0) {
          grids.push(grid)
          seen.add(key)
        }
        break
      }
    }

    for (const roomKey of ROOM_HEADERS) {
      const compact = norm.replace(/\s/g, '')
      const target = roomKey.replace(/\s/g, '')
      if (compact.includes(target) || norm.includes(roomKey)) {
        const key = `rm:${roomKey}`
        if (seen.has(key)) continue
        const grid = parseGridBlock(lines, i, { kind: 'room', roomKey })
        if (grid && grid.slots.length > 0) {
          grids.push(grid)
          seen.add(key)
        }
        break
      }
    }
  }

  return grids
}

export const TEACHER_NAME_BY_KEY: Record<string, string> = {
  c: '김현진',
  d: '김자영',
  우주희: '우주희',
  김영주: '김영주',
  신갑천: '신갑천',
  신선우: '신선우',
  이기백: '이기백',
  이호연: '이호연',
  최향춘: '최향춘',
  한송화: '한송화',
}

export const ROOM_NAME_BY_KEY: Record<string, string> = {
  과학실2층6학년: '과학실1',
  과학실4층4학년: '과학실2',
  과학실4층5학년: '과학실2',
  과학실2층3학년: '과학실1',
  다목적실: '다목적실',
  운동장: '운동장',
  체육관: '체육관',
  음악실: '음악실',
  '컴퓨터실 2층': '컴퓨터실1',
  '컴퓨터실 4층': '컴퓨터실2',
  시청각실: '시청각실',
}

/** 과학실 등 과목 접미사 없는 칸 → 과학 */
export function defaultSubjectCodeForRoom(roomKey: string): SubjectCode | undefined {
  if (roomKey.includes('과학실')) return '과'
  if (roomKey === '다목적실') return '즐'
  return undefined
}

/** PDF 헤더의 학년(예: 과학실4층5학년 → 5). 파서가 다른 학년 칸을 섞어 읽는 경우 걸러냄 */
export function expectedGradeForRoomKey(roomKey: string): number | null {
  const m = roomKey.match(/(\d)학년$/)
  return m ? parseInt(m[1], 10) : null
}
