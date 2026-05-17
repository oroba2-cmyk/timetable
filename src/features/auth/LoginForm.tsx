'use client'

import { useActionState } from 'react'
import { loginWithFormAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginWithFormAction, null)

  return (
    <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold">특별실·전담 시간표</h1>
        <p className="text-sm text-gray-500 mt-1">아이디와 비밀번호로 로그인하세요.</p>
      </div>
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="loginId">아이디</Label>
          <Input id="loginId" name="loginId" autoComplete="username" required />
        </div>
        <div>
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? '로그인 중…' : '로그인'}
        </Button>
      </form>
    </div>
  )
}
