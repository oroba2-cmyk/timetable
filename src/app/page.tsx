import { listTerms, createTerm, deleteTerm } from '@/features/terms/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function HomePage() {
  const terms = await listTerms()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">학기 관리</h1>

      <form
        action={async (fd: FormData) => {
          'use server'
          await createTerm({
            year: Number(fd.get('year')),
            semester: Number(fd.get('semester')),
            startDate: fd.get('startDate') as string,
            endDate: fd.get('endDate') as string,
          })
        }}
        className="bg-white rounded-lg p-6 shadow mb-6 space-y-4"
      >
        <h2 className="font-semibold">새 학기 추가</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year">학년도</Label>
            <Input id="year" name="year" type="number" defaultValue={new Date().getFullYear()} required />
          </div>
          <div>
            <Label htmlFor="semester">학기</Label>
            <Input id="semester" name="semester" type="number" min={1} max={2} defaultValue={1} required />
          </div>
          <div>
            <Label htmlFor="startDate">시작일</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="endDate">종료일</Label>
            <Input id="endDate" name="endDate" type="date" required />
          </div>
        </div>
        <Button type="submit">학기 추가</Button>
      </form>

      <div className="space-y-2">
        {terms.map((t) => (
          <div key={t.id} className="bg-white rounded-lg p-4 shadow flex items-center justify-between gap-4">
            <span className="font-medium">{t.year}학년도 {t.semester}학기</span>
            <span className="text-sm text-gray-500">
              {t.startDate.toLocaleDateString('ko-KR')} ~ {t.endDate.toLocaleDateString('ko-KR')}
            </span>
            <form action={async () => { 'use server'; await deleteTerm(t.id) }}>
              <Button variant="destructive" size="sm" type="submit">삭제</Button>
            </form>
          </div>
        ))}
        {terms.length === 0 && <p className="text-gray-500 text-sm">등록된 학기가 없습니다.</p>}
      </div>
    </div>
  )
}
