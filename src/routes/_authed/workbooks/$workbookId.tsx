import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { AiChat, AiChatFloatingButton } from '@/components/ai-chat/AiChat'
import { AiTable } from '@/components/ai-table/AiTable'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import { workbooksCollection } from '@/lib/workbooks/collections'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { cn } from '@/lib/utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpcClient, orpcQuery } from '@/orpc/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, FileText, BarChart3, FileCode } from 'lucide-react'
import {
  createWorkbookDetailStore,
} from './workbook-detail-store'
import { useStore } from 'zustand'

function ResizableBlock({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const handle = handleRef.current
    if (!container || !handle) return

    const startResize = (e: MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      const startY = e.clientY
      const startHeight = height ?? container.offsetHeight

      const doResize = (e: MouseEvent) => {
        const newHeight = startHeight + (e.clientY - startY)
        const minHeight = 200
        setHeight(Math.max(minHeight, newHeight))
      }

      const stopResize = () => {
        setIsResizing(false)
        document.removeEventListener('mousemove', doResize)
        document.removeEventListener('mouseup', stopResize)
      }

      document.addEventListener('mousemove', doResize)
      document.addEventListener('mouseup', stopResize)
    }

    handle.addEventListener('mousedown', startResize)

    return () => {
      handle.removeEventListener('mousedown', startResize)
    }
  }, [height])

  return (
    <div
      ref={containerRef}
      className="group relative w-full border border-border rounded-lg bg-card overflow-hidden"
      style={{ height: height ? `${height}px` : 'auto', minHeight: '200px' }}
    >
      {children}
      {/* Resize Handle */}
      <div
        ref={handleRef}
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-colors',
          isResizing
            ? 'bg-border'
            : 'bg-transparent hover:bg-border/30 group-hover:bg-border/20',
        )}
      />
    </div>
  )
}

function WorkbookDetailPage() {
  const { workbookId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()

  // Use workbook-specific store with a single selector for better performance
  const workbookDetailStore = useMemo(() => createWorkbookDetailStore(), [])
  const isChatMinimized = useStore(
    workbookDetailStore,
    (state) => state.isChatMinimized,
  )
  const createBlockDialogType = useStore(
    workbookDetailStore,
    (state) => state.createBlockDialogType,
  )
  const setChatMinimized = useStore(
    workbookDetailStore,
    (state) => state.setChatMinimized,
  )
  const setCreateBlockDialogType = useStore(
    workbookDetailStore,
    (state) => state.setCreateBlockDialogType,
  )

  const { data: workbook } = useLiveQuery((q) =>
    q
      .from({ workbook: workbooksCollection })
      .where(({ workbook }) => eq(workbook.id, workbookId))
      .findOne(),
  )

  // Fetch workbook with blocks
  const { data: workbookWithBlocks, refetch: refetchWorkbook } =
    useSuspenseQuery(
      orpcQuery.workbooks.get.queryOptions({
        input: { workbookId },
      }),
    )

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBlockTypeSelect = (blockType: 'table' | 'chart' | 'markdown') => {
    setCreateBlockDialogType(blockType)
  }

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
          <div className="flex-1 overflow-auto p-2">
            {/* Blocks Grid */}
            <div className="flex flex-col gap-2">
              {workbookWithBlocks.blocks.map((block) => (
                <ResizableBlock key={block.id}>
                  {block.blockType === 'table' && block.table && (
                    <AiTable tableId={block.table.id} />
                  )}
                </ResizableBlock>
              ))}
              <div className="w-full border-2 border-dashed border-border bg-card rounded-lg p-8 min-h-[200px] flex items-center justify-center">
                <div className="flex justify-center items-center gap-4">
                  <div
                    onClick={() => handleBlockTypeSelect('table')}
                    className="flex flex-col items-center justify-center gap-2 w-24 h-24 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground/40 hover:bg-accent/30 transition-all group cursor-pointer"
                  >
                    <Table className="w-6 h-6 text-muted-foreground group-hover:text-foreground/70" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground/70">
                      Table
                    </span>
                  </div>

                  <div
                    onClick={() => handleBlockTypeSelect('markdown')}
                    className="flex flex-col items-center justify-center gap-2 w-24 h-24 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground/40 hover:bg-accent/30 transition-all group cursor-pointer"
                  >
                    <FileCode className="w-6 h-6 text-muted-foreground group-hover:text-foreground/70" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground/70">
                      Markdown
                    </span>
                  </div>

                  <div
                    onClick={() => handleBlockTypeSelect('chart')}
                    className="flex flex-col items-center justify-center gap-2 w-24 h-24 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground/40 hover:bg-accent/30 transition-all group cursor-pointer"
                  >
                    <BarChart3 className="w-6 h-6 text-muted-foreground group-hover:text-foreground/70" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground/70">
                      Chart
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
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
              onMinimize={() => setChatMinimized(true)}
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
          <AiChatFloatingButton onClick={() => setChatMinimized(false)} />
        </div>
      </div>

      {/* Create Block Dialog */}
      {createBlockDialogType && (
        <CreateBlockDialog
          open={true}
          onOpenChange={(open) =>
            setCreateBlockDialogType(open ? createBlockDialogType : null)
          }
          workbookId={workbookId}
          blockType={createBlockDialogType}
          onCreateSuccess={refetchWorkbook}
        />
      )}
    </AppPageWrapper>
  )
}

function CreateBlockDialog({
  open,
  onOpenChange,
  workbookId,
  blockType,
  onCreateSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workbookId: string
  blockType: 'table' | 'chart' | 'markdown'
  onCreateSuccess: () => void
}) {
  const [isCreatingBlock, setIsCreatingBlock] = useState(false)
  const navigate = useNavigate()

  const handleCreateBlock = async () => {
    setIsCreatingBlock(true)
    try {
      // Currently only 'table' is supported by the API
      if (blockType !== 'table') {
        console.warn(`Block type ${blockType} is not yet supported`)
        onOpenChange(false)
        return
      }

      const result = await orpcClient.workbooks.createBlock({
        workbookId,
        blockType: 'table',
      })

      // Navigate to the table if it's a table block
      if (result.table) {
        navigate({
          to: '/tables/$tableId',
          params: { tableId: result.table.id },
        })
      }

      onCreateSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create block:', error)
    } finally {
      setIsCreatingBlock(false)
    }
  }

  // Render different content based on blockType
  if (blockType === 'table') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Table</DialogTitle>
            <DialogDescription>
              Choose how to create your table
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={handleCreateBlock}
              disabled={isCreatingBlock}
              variant="outline"
              className="h-auto py-4 px-6 justify-start gap-4 hover:bg-accent"
            >
              <Table className="w-5 h-5" />
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium">Create new empty table</span>
                <span className="text-xs text-muted-foreground">
                  Start with a blank table
                </span>
              </div>
            </Button>

            <Button
              disabled
              variant="outline"
              className="h-auto py-4 px-6 justify-start gap-4 opacity-50 cursor-not-allowed"
            >
              <FileText className="w-5 h-5" />
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium">Load from CSV</span>
                <span className="text-xs text-muted-foreground">
                  Coming soon
                </span>
              </div>
            </Button>

            <Button
              disabled
              variant="outline"
              className="h-auto py-4 px-6 justify-start gap-4 opacity-50 cursor-not-allowed"
            >
              <BarChart3 className="w-5 h-5" />
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium">Load from data sources</span>
                <span className="text-xs text-muted-foreground">
                  Coming soon
                </span>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Placeholder for other block types
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Create {blockType === 'chart' ? 'Chart' : 'Markdown'} Block
          </DialogTitle>
          <DialogDescription>Coming soon</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

export const Route = createFileRoute('/_authed/workbooks/$workbookId')({
  ssr: false,
  component: WorkbookDetailPage,
})
