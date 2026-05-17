'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteOtherAcademicEvents } from './actions'

export function DeleteAllEventsButton({ termId }: { termId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirming) { setConfirming(true); return }
    startTransition(async () => {
      await deleteOtherAcademicEvents(termId)
      setConfirming(false)
    })
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={handleClick} className="text-red-600 border-red-200 hover:bg-red-50">
        전체 삭제
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-red-600">삭제할까요?</span>
      <Button variant="destructive" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? '삭제 중...' : '확인'}
      </Button>
      <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>취소</Button>
    </div>
  )
}
