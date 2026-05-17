/** 조회 기간에 자동 선택된 학기 표시 */
export function ActiveTermBadge({ year, semester }: { year: number; semester: number }) {
  return (
    <span className="text-sm font-normal text-gray-500 ml-2">
      ({year}학년도 {semester}학기)
    </span>
  )
}
