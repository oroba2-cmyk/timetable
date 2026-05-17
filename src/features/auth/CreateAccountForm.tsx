'use client'

import { useActionState } from 'react'
import { createAccountAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, fd: FormData) => {
      const result = await createAccountAction(fd)
      if (!result.success) return { error: result.error }
      return { ok: true }
    },
    null
  )

  return (
    <form action={action} className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="font-semibold">새 계정 만들기</h2>
      <div>
        <Label htmlFor="schoolName">학교명</Label>
        <Input id="schoolName" name="schoolName" placeholder="예: 연습초등학교" required />
        <p className="text-xs text-gray-500 mt-1">로그인 후 사이드바에 표시됩니다.</p>
      </div>
      <div>
        <Label htmlFor="loginId">아이디</Label>
        <Input id="loginId" name="loginId" placeholder="비우면 학교명에서 자동 제안 (영문)" />
      </div>
      <div>
        <Label htmlFor="password">비밀번호</Label>
        <Input id="password" name="password" type="password" placeholder="비우면 아이디1234!" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-600">계정이 생성되었습니다.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? '생성 중…' : '계정 생성'}
      </Button>
    </form>
  )
}
