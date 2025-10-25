import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from './ui/separator'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopNavProps {
  breadcrumbs: BreadcrumbItem[]
  children?: ReactNode
}

export function TopNav({ breadcrumbs, children }: TopNavProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-sidebar px-4 py-4">
      <div className="flex items-center gap-2 h-full">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-full" />
        <Breadcrumb className="ml-2">
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1
              
              return (
                <div key={index} className="contents">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : item.href ? (
                      <BreadcrumbLink asChild>
                        <Link to={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-muted-foreground">{item.label}</span>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </div>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </header>
  )
}

interface AppPageWrapperProps {
  children: ReactNode
}

export function AppPageWrapper({ children }: AppPageWrapperProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">{children}</div>
  )
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
    <div
      className={cn(
        'flex-1 scrollbar scrollbar-thumb-interactive overflow-x-hidden overflow-y-auto p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
