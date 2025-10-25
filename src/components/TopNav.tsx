import { ReactNode } from 'react'

interface TopNavProps {
  title?: string
  children?: ReactNode
}

export function TopNav({ title, children }: TopNavProps) {
  // If only title is provided
  if (title && !children) {
    return (
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
    )
  }

  // If only children are provided
  if (!title && children) {
    return (
      <header className="flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-4">
        {children}
      </header>
    )
  }

  // If both title and children are provided
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  )
}
