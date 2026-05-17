'use client'

import { usePathname } from 'next/navigation'

export function ClientShell({
  children,
  sidebar,
}: {
  children: React.ReactNode
  sidebar: React.ReactNode
}) {
  const pathname = usePathname()
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen">
      {sidebar}
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
