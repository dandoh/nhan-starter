import React from 'react'

interface BlockHeaderProps {
  name: string
  leftSidebarActions?: React.ReactNode
  rightHeaderActions?: React.ReactNode
  showLeftSidebar?: boolean
  children: React.ReactNode
}

export function BlockHeader({
  name,
  leftSidebarActions,
  rightHeaderActions,
  showLeftSidebar = true,
  children,
}: BlockHeaderProps) {

  return (
    <div className="flex flex-col min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h2 className="text-sm font-medium text-foreground">{name}</h2>
        {rightHeaderActions && (
          <div className="flex items-center gap-1">{rightHeaderActions}</div>
        )}
      </div>

      {/* Main content area with sidebar and children */}
      <div className="flex flex-1 min-w-0 overflow-hidden h-full">
        {/* Left sidebar with action buttons */}
        {leftSidebarActions && showLeftSidebar && (
          <div className="flex flex-col items-center gap-2 p-2 border-r border-border bg-card w-12 shrink-0 self-stretch h-full">
            {leftSidebarActions}
          </div>
        )}

        {/* Children content (table) */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

