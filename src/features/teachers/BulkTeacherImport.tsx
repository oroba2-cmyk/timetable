'use client'
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { bulkCreateTeachers } from './actions'

interface Props {
  termId: string
}

export function BulkTeacherImport({ termId }: Props) {
  const [text, setText] = useState('')
  const [type, setType] = useState<'HOMEROOM' | 'SPECIALIZED' | 'CONCURRENT'>('HOMEROOM')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function parseNames(raw: string): string[] {
    // Split by newlines, commas, or semicolons; trim each
    return raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
  }

  async function handleSubmit() {
    const names = parseNames(text)
    if (names.length === 0) { setMessage('이름을 입력해주세요.'); return }
    setPending(true)
    setMessage('')
    const result = await bulkCreateTeachers(termId, names, type)
    if (result.success) {
      setMessage(`${result.data.created}명 추가 완료${result.data.skipped > 0 ? `, ${result.data.skipped}명 중복 건너뜀` : ''}`)
      setText('')
    } else {
      setMessage(result.error)
    }
    setPending(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Try to parse as plain text (works for .txt, .csv first column)
    const raw = await file.text()
    // For CSV: take first column of each row
    const lines = raw.split('\n').map(line => line.split(',')[0].trim()).filter(Boolean)
    // Skip header if first line looks like a header (contains 이름 or name)
    const firstLine = lines[0]?.toLowerCase() ?? ''
    const names = (firstLine.includes('이름') || firstLine.includes('name'))
      ? lines.slice(1)
      : lines
    setText(names.join('\n'))
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h2 className="font-semibold mb-3">교사 일괄 등록</h2>
      <p className="text-sm text-gray-500 mb-3">
        이름을 한 줄에 하나씩 붙여넣거나, CSV 파일을 업로드하세요.
      </p>

      <div className="space-y-3">
        <div>
          <Label>교사 유형</Label>
          <select
            value={type}
            onChange={e => setType(e.target.value as typeof type)}
            className="w-full border rounded px-2 py-1.5 text-sm mt-1"
          >
            <option value="HOMEROOM">담임</option>
            <option value="SPECIALIZED">전담</option>
            <option value="CONCURRENT">겸임</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>교사 이름 목록</Label>
            <label className="text-xs text-blue-600 cursor-pointer hover:underline">
              파일 업로드 (txt/csv)
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={"홍길동\n김철수\n이영희"}
            rows={8}
            className="w-full border rounded px-2 py-1.5 text-sm font-mono resize-y"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.includes('완료') ? 'text-blue-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        <Button onClick={handleSubmit} disabled={pending} className="w-full">
          {pending ? '등록 중...' : '교사 등록'}
        </Button>
      </div>
    </div>
  )
}
