import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { AiChat, AiChatFloatingButton } from '@/components/ai-chat/AiChat'
import { AiTable } from '@/components/ai-table/AiTable'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import { workbooksCollection } from '@/lib/workbooks/collections'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  FileText,
  BarChart3,
  FileCode,
  MoreVertical,
  Settings,
  Download,
  Share2,
  Trash2,
  PanelLeft,
  PanelRight,
} from 'lucide-react'
import { createWorkbookDetailStore } from './workbook-detail-store'
import { useStore } from 'zustand'
import { useWorkbookSync } from '@/hooks/use-workbook-sync'
import type { BlocksCollection } from '@/lib/workbooks/collections'
import { BlockHeader } from '@/components/workbooks/BlockHeader'
import { TableCollections, tablesCollection } from '@/lib/ai-table/collections'
import type { WorkbookBlock } from '@/db/schema'

function TableBlock({
  block,
  tableId,
  blocksCollection,
  tablesCollection,
}: {
  block: WorkbookBlock
  tableId: string
  blocksCollection: BlocksCollection
  tablesCollection: TableCollections
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)

  // Query table name
  const { data: table } = useLiveQuery((q) =>
    q
      .from({ table: tablesCollection })
      .where(({ table }) => eq(table.id, tableId))
      .findOne(),
  )

  const handleDeleteBlock = () => {
    blocksCollection.delete(block.id)
    tablesCollection.delete(tableId)
    setIsDeleteDialogOpen(false)
  }

  const leftSidebarActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Share">
        <Share2 className="h-4 w-4" />
      </Button>
    </>
  )

  const rightHeaderActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Settings className="h-4 w-4" />
            <span>Table settings</span>
          </DropdownMenuItem>
          {leftSidebarActions && (
            <DropdownMenuItem
              onSelect={() => setShowLeftSidebar(!showLeftSidebar)}
            >
              {showLeftSidebar ? (
                <>
                  <PanelLeft className="h-4 w-4" />
                  <span>Hide left panel</span>
                </>
              ) : (
                <>
                  <PanelRight className="h-4 w-4" />
                  <span>Show left panel</span>
                </>
              )}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete this block</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this block and its table. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBlock}
              className="bg-destructive text-destructive-foreground! hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <BlockHeader
      name={table?.name || 'Untitled Table'}
      leftSidebarActions={leftSidebarActions}
      rightHeaderActions={rightHeaderActions}
      showLeftSidebar={showLeftSidebar}
    >
      <AiTable tableId={tableId} />
    </BlockHeader>
  )
}

function ResizableBlock({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(450)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    const handle = handleRef.current
    if (!container || !handle) return

    const startResize = (e: MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      const startY = e.clientY
      const startHeight = container.offsetHeight

      const doResize = (e: MouseEvent) => {
        const newHeight = startHeight + (e.clientY - startY)
        const minHeight = 450
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
  }, [])

  return (
    <div
      ref={containerRef}
      className="group relative w-full border border-border rounded-lg bg-card overflow-hidden"
      style={{ height: `${height}px`, minHeight: '450px' }}
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
  const createBlockPopoverType = useStore(
    workbookDetailStore,
    (state) => state.createBlockPopoverType,
  )
  const setChatMinimized = useStore(
    workbookDetailStore,
    (state) => state.setChatMinimized,
  )
  const setCreateBlockPopoverType = useStore(
    workbookDetailStore,
    (state) => state.setCreateBlockPopoverType,
  )
  const { workbook: preloadedWorkbook } = Route.useLoaderData()

  const { data: workbook = preloadedWorkbook } = useLiveQuery((q) =>
    q
      .from({ workbook: workbooksCollection })
      .where(({ workbook }) => eq(workbook.id, workbookId))
      .findOne(),
  )

  // Use workbook sync to get blocks collection
  const { blocksCollection } = useWorkbookSync(workbookId)

  // Live query for blocks
  const { data: blocks = [] } = useLiveQuery((q) =>
    q
      .from({ block: blocksCollection })
      .orderBy(({ block }) => block.createdAt, 'asc'),
  )

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateTableBlock = () => {
    const tempId = crypto.randomUUID()
    const newBlock = {
      id: tempId,
      workbookId,
      blockType: 'table' as const,
      tableId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    blocksCollection.insert(newBlock)
    setCreateBlockPopoverType(null)
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Workbooks', href: '/workbooks' },
          { label: workbook.name ?? 'Untitled' },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Workbook content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-auto p-2">
            {/* Blocks Grid */}
            <div className="flex flex-col gap-2">
              {blocks.map((block) => (
                <ResizableBlock key={block.id}>
                  {block.blockType === 'table' && block.tableId && (
                    <TableBlock
                      block={block}
                      tableId={block.tableId}
                      blocksCollection={blocksCollection}
                      tablesCollection={tablesCollection}
                    />
                  )}
                </ResizableBlock>
              ))}
              {blocks.length === 0 ? (
                <div className="w-full border-2 border-dashed border-border rounded-lg p-8 min-h-[300px] flex flex-col items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-2 text-center max-w-md">
                    <h3 className="text-lg font-semibold text-foreground">
                      Get started with your workbook
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Create your first block by loading data from a file,
                      connecting to a data source, or starting with an empty
                      table. Choose a block type below to begin.
                    </p>
                  </div>
                  <CreateBlockOptions
                    openType={createBlockPopoverType}
                    onOpenTypeChange={setCreateBlockPopoverType}
                    onCreateTable={handleCreateTableBlock}
                  />
                </div>
              ) : (
                <div className="w-full border-2 border-dashed border-border rounded-lg p-8 min-h-[200px] flex flex-col items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-2 text-center max-w-md">
                    <p className="text-lg text-muted-foreground">
                      Add another block
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Add a new table, document, or chart block to your
                      workbook. You can load data from files or connect to data
                      sources.
                    </p>
                  </div>
                  <CreateBlockOptions
                    openType={createBlockPopoverType}
                    onOpenTypeChange={setCreateBlockPopoverType}
                    onCreateTable={handleCreateTableBlock}
                  />
                </div>
              )}
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
    </AppPageWrapper>
  )
}

type BlockOptionType = 'table' | 'document' | 'chart'

function CreateBlockOptions({
  openType,
  onOpenTypeChange,
  onCreateTable,
}: {
  openType: BlockOptionType | null
  onOpenTypeChange: (type: BlockOptionType | null) => void
  onCreateTable: () => void
}) {
  const blockTypes: BlockOptionType[] = ['table', 'document', 'chart']

  return (
    <div className="flex justify-center items-center gap-4">
      {blockTypes.map((type) => {
        const Icon =
          type === 'table' ? Table : type === 'document' ? FileCode : BarChart3
        const label =
          type === 'table'
            ? 'Table'
            : type === 'document'
              ? 'Document'
              : 'Chart'

        return (
          <Popover
            key={type}
            open={openType === type}
            onOpenChange={(open) => onOpenTypeChange(open ? type : null)}
          >
            <PopoverTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                className="flex  flex-col items-center justify-center gap-2 w-24 h-24 border-1 border-dashed border-border rounded-lg transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:border-muted-foreground/40 hover:bg-accent/30 cursor-pointer"
              >
                <Icon className="w-6 h-6 text-muted-foreground group-hover:text-foreground/70" />
                <span className="text-xs text-muted-foreground group-hover:text-foreground/70">
                  {label}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              sideOffset={12}
              className="w-80 border border-border bg-card p-0 shadow-lg"
            >
              {type === 'table' ? (
                <TableCreationPopoverContent
                  onCreateEmptyTable={onCreateTable}
                />
              ) : (
                <BlockComingSoonContent blockType={type} />
              )}
            </PopoverContent>
          </Popover>
        )
      })}
    </div>
  )
}

function TableCreationPopoverContent({
  onCreateEmptyTable,
}: {
  onCreateEmptyTable: () => void
}) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3">
        <Button
          onClick={onCreateEmptyTable}
          variant="outline"
          className="h-auto p-2 justify-start gap-4 hover:bg-accent"
        >
          <Table className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span className="font-medium">Create new empty table</span>
            <span className="text-xs text-muted-foreground">
              Start with a blank table
            </span>
          </div>
        </Button>

        <Button
          disabled
          variant="outline"
          className="h-auto p-2 justify-start gap-4 opacity-50 cursor-not-allowed"
        >
          <FileText className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span className="font-medium">Load from CSV</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
        </Button>

        <Button
          disabled
          variant="outline"
          className="h-auto p-2 justify-start gap-4 opacity-50 cursor-not-allowed"
        >
          <BarChart3 className="w-5 h-5" />
          <div className="flex flex-col items-start">
            <span className="font-medium">Load from data sources</span>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>
        </Button>
      </div>
    </div>
  )
}

function BlockComingSoonContent({
  blockType,
}: {
  blockType: Extract<BlockOptionType, 'document' | 'chart'>
}) {
  const heading = blockType === 'chart' ? 'Chart blocks' : 'Document blocks'

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-foreground">{heading}</h4>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </div>
      <p className="text-sm text-muted-foreground">
        We&apos;re working on bringing {blockType} creation flows to life.
        You&apos;ll soon be able to connect files and data sources here.
      </p>
    </div>
  )
}

export const Route = createFileRoute('/_authed/workbooks/$workbookId')({
  ssr: false,
  component: WorkbookDetailPage,
  loader: async ({ params }) => {
    await workbooksCollection.stateWhenReady()
    const workbook = await workbooksCollection.get(params.workbookId)

    if (!workbook) {
      throw new Error('Workbook not found')
    }

    return { workbook }
  },
})
