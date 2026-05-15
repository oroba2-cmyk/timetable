'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { autoGenerateClasses } from './actions'

interface Props {
  termId: string
}

export function GradeAutoGen({ termId }: Props) {
  const [counts, setCounts] = useState<Record<number, string>>({
    1: '', 2: '', 3: '', 4: '', 5: '', 6: '',
  })
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function handleGenerate() {
    const entries = Object.entries(counts).filter(([, v]) => v && Number(v) > 0)
    if (entries.length === 0) {
      setMessage('학급 수를 1 이상 입력해주세요.')
      return
    }
    setPending(true)
    setMessage('')
    let totalCreated = 0
    for (const [grade, count] of entries) {
      const result = await autoGenerateClasses(termId, Number(grade), Number(count))
      if (result.success) totalCreated += result.data.created
    }
    setMessage(`${totalCreated}개 학급이 생성되었습니다.`)
    setPending(false)
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold mb-3">학급 자동 생성</h2>
      <p className="text-sm text-gray-500 mb-3">학년별 학급 수를 입력하면 학급을 자동으로 생성합니다.</p>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3, 4, 5, 6].map(grade => (
          <div key={grade} className="flex items-center gap-2">
            <label className="text-sm font-medium w-16 shrink-0">{grade}학년</label>
            <Input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              value={counts[grade]}
              onChange={e => setCounts(prev => ({ ...prev, [grade]: e.target.value }))}
              placeholder="0"
              className="w-20"
            />
            <span className="text-sm text-gray-500">반</span>
          </div>
        ))}
      </div>
      {message && <p className="text-sm text-blue-600 mb-2">{message}</p>}
      <Button onClick={handleGenerate} disabled={pending}>
        {pending ? '생성 중...' : '학급 생성'}
      </Button>
    </div>
  )
}
