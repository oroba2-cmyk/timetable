'use client'

export interface SubjectData {
  id: string
  name: string
  teacherName: string | null
  teacherId: string | null
}

interface Props {
  subjects: SubjectData[]
  selectedSubjectId: string | null   // null = "모든 전담 과목"
  onSelect: (id: string | null) => void
  assignmentCounts: Record<string, number>
}

export function SubjectSidebar({ subjects, selectedSubjectId, onSelect, assignmentCounts }: Props) {
  const allSelected = selectedSubjectId === null
  const totalCount = Object.values(assignmentCounts).reduce((s, n) => s + n, 0)

  return (
    <div className="w-48 shrink-0 border-r bg-gray-50 overflow-y-auto">
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
        전담 과목
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 ${
          allSelected ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span>모든 전담 과목</span>
          {totalCount > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
              allSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {totalCount}
            </span>
          )}
        </div>
      </button>

      {subjects.map(subject => {
        const count = assignmentCounts[subject.id] ?? 0
        const isSelected = subject.id === selectedSubjectId

        return (
          <button
            key={subject.id}
            type="button"
            onClick={() => onSelect(subject.id)}
            className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-0 ${
              isSelected ? 'bg-blue-600 text-white font-medium' : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate">{subject.name}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  isSelected ? 'bg-blue-400 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
            </div>
            {subject.teacherName && (
              <div className={`text-xs mt-0.5 truncate ${isSelected ? 'text-blue-200' : 'text-gray-400'}`}>
                {subject.teacherName}
              </div>
            )}
          </button>
        )
      })}
      {subjects.length === 0 && (
        <p className="px-3 py-4 text-xs text-gray-400">등록된 전담 과목 없음</p>
      )}
    </div>
  )
}
