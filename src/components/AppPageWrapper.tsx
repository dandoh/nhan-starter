import { ReactNode } from 'react'

interface AppPageWrapperProps {
  children: ReactNode
}

export function AppPageWrapper({ children }: AppPageWrapperProps) {
  return <div className="flex min-h-screen flex-col">{children}</div>
}

interface AppPageContentWrapperProps {
  children: ReactNode
  className?: string
}

export function AppPageContentWrapper({
  children,
  className = '',
}: AppPageContentWrapperProps) {
  return (
    <div className={`flex-1 overflow-auto p-8 ${className}`.trim()}>
      {children}
    </div>
  )
}

