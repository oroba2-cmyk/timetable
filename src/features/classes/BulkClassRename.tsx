'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { bulkRenameClasses } from './actions'

interface Props {
  termId: string
}

export function BulkClassRename({ termId }: Props) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  function parseRows(raw: string) {
    const rows: { gradeNumber: number; classNumber: number; displayName: string }[] = []
    for (const line of raw.split('\n').map(l => l.trim()).filter(Boolean)) {
      const cols = line.split(/[\t,]/).map(c => c.trim())
      const grade = parseInt(cols[0])
      const cls = parseInt(cols[1])
      const name = cols[2] ?? ''
      if (!isNaN(grade) && !isNaN(cls)) {
        rows.push({ gradeNumber: grade, classNumber: cls, displayName: name })
      }
    }
    return rows
  }

  async function handleSubmit() {
    const rows = parseRows(text)
    if (rows.length === 0) { setMessage('유효한 데이터가 없습니다.'); return }
    setPending(true)
    setMessage('')
    const result = await bulkRenameClasses(termId, rows)
    if (result.success) {
      const parts = [`${result.data.renamed}개 반 이름 변경`]
      if (result.data.notFound.length > 0) parts.push(`미처리: ${result.data.notFound.join(', ')}`)
      setMessage(parts.join(' / '))
      if (result.data.notFound.length === 0) setText('')
    } else {
      setMessage(result.error)
    }
    setPending(false)
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold mb-1">반 이름 일괄 변경</h2>
      <p className="text-xs text-gray-400 mb-3">
        학년, 반번호, 새이름 순서로 탭 또는 쉼표로 구분하여 입력 (예: 1 → 1반 → 꿈반)
      </p>
      <div className="space-y-3">
        <div>
          <Label>데이터 입력</Label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"1\t1\t꿈반\n1\t2\t사랑반\n2\t1\t도전반"}
            rows={6}
            className="w-full border rounded px-2 py-1.5 text-sm font-mono resize-y mt-1"
          />
        </div>
        {message && (
          <p className={`text-sm ${message.includes('변경') ? 'text-blue-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
        <Button onClick={handleSubmit} disabled={pending} className="w-full">
          {pending ? '처리 중...' : '반 이름 변경'}
        </Button>
      </div>
    </div>
  )
}
