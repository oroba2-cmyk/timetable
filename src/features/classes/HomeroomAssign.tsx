'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { assignHomeroomTeachers } from './actions'

interface Props {
  termId: string
}

export function HomeroomAssign({ termId }: Props) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function parseRows(raw: string) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    const rows: { gradeNumber: number; classNumber: number; teacherName: string }[] = []
    for (const line of lines) {
      const cols = line.split(/[\t,]/).map(c => c.trim())
      const grade = parseInt(cols[0])
      const cls = parseInt(cols[1])
      const teacher = cols[2]
      if (!isNaN(grade) && !isNaN(cls) && teacher) {
        rows.push({ gradeNumber: grade, classNumber: cls, teacherName: teacher })
      }
    }
    return rows
  }

  async function handleSubmit() {
    const rows = parseRows(text)
    if (rows.length === 0) { setMessage('유효한 데이터가 없습니다.'); return }
    setPending(true)
    setMessage('')
    const result = await assignHomeroomTeachers(termId, rows)
    if (result.success) {
      const parts = [`${result.data.assigned}명 배정 완료`]
      if (result.data.notFound.length > 0) {
        parts.push(`미처리: ${result.data.notFound.join(', ')}`)
      }
      setMessage(parts.join(' / '))
      if (result.data.notFound.length === 0) setText('')
    } else {
      setMessage(result.error)
    }
    setPending(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setText(await file.text())
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold mb-1">담임교사 배정</h2>
      <p className="text-xs text-gray-400 mb-3">
        학년, 반, 교사이름 순서로 탭 또는 쉼표로 구분하여 붙여넣기 (CSV 업로드 가능)
      </p>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>데이터 입력</Label>
            <label className="text-xs text-blue-600 cursor-pointer hover:underline">
              CSV 업로드
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
            </label>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"1\t1\t홍길동\n1\t2\t김철수\n2\t1\t이영희"}
            rows={6}
            className="w-full border rounded px-2 py-1.5 text-sm font-mono resize-y"
          />
        </div>
        {message && (
          <p className={`text-sm ${message.includes('완료') ? 'text-blue-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}
        <Button onClick={handleSubmit} disabled={pending} className="w-full">
          {pending ? '처리 중...' : '담임 배정'}
        </Button>
      </div>
    </div>
  )
}
