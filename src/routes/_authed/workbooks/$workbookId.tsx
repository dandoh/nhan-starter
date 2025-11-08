import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { AiChat, AiChatFloatingButton } from '@/components/ai-chat/AiChat'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import { workbooksCollection } from '@/lib/workbooks/collections'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/workbooks/$workbookId')({
  ssr: false,
  component: WorkbookDetailPage,
})

function WorkbookDetailPage() {
  const { workbookId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const { data: workbook } = useLiveQuery((q) =>
    q
      .from({ workbook: workbooksCollection })
      .where(({ workbook }) => eq(workbook.id, workbookId))
      .findOne(),
  )

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Workbooks', href: '/workbooks' },
          { label: workbook?.name ?? 'Untitled' },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Workbook content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-hidden p-2">
            <div className="h-full flex flex-col space-y-2">
              {/* Workbook Block - scrollable */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {/* Empty state - content will be added later */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col items-center justify-center">
                  <p className="text-muted-foreground">
                    Workbook content will be displayed here
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'flex flex-col shrink-0 p-2 pl-0 transition-all duration-300 ease-in-out ',
            isChatMinimized
              ? 'w-0 opacity-0 pointer-events-none'
              : 'w-96 opacity-100',
          )}
        >
          <div
            className={cn(
              'bg-card border border-border overflow-hidden h-full rounded-sm',
            )}
          >
            <AiChat
              context={{ type: 'workbook', workbookId }}
              title="Workbook AI Assistant"
              description="Ask me to help with your workbook. I can add blocks, analyze data, or perform calculations."
              quickActions={[
                'Add a new table block',
                'Add a new chart block',
                'Analyze workbook data',
                'Export workbook',
              ]}
              onMinimize={() => setIsChatMinimized(true)}
              minimized={isChatMinimized}
            />
          </div>
        </div>

        {/* Floating button when minimized */}
        <div
          className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${
            isChatMinimized
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <AiChatFloatingButton onClick={() => setIsChatMinimized(false)} />
        </div>
      </div>
    </AppPageWrapper>
  )
}

