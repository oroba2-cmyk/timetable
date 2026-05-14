// src/types/index.ts
export type {
  SchoolTerm,
  Grade,
  ClassGroup,
  Subject,
  Teacher,
  TeacherSubject,
  SpecialRoom,
  Period,
  AcademicEvent,
  ScheduleRule,
  ScheduleEntry,
  Reservation,
  SubjectType,
  TeacherType,
  RepeatUnit,
  EndType,
  EntrySource,
  EntryStatus,
} from '../generated/prisma'

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type DayOfWeek = 0 | 1 | 2 | 3 | 4

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '월', 1: '화', 2: '수', 3: '목', 4: '금',
}

export const TEACHER_TYPE_LABELS: Record<string, string> = {
  HOMEROOM: '담임',
  SPECIALIZED: '전담',
  CONCURRENT: '겸임',
}

export const SUBJECT_TYPE_LABELS: Record<string, string> = {
  SPECIALIZED: '전담',
  GENERAL: '일반',
}

export const REPEAT_UNIT_LABELS: Record<string, string> = {
  DAY: '일',
  WEEK: '주',
  MONTH: '개월',
}
