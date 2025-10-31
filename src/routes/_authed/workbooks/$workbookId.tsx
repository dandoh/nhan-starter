import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { useWorkbookSync } from '@/hooks/use-workbook-sync'
import { WorkbookBlock } from '@/components/workbook/WorkbookBlock'
import { AddBlockButton } from '@/components/workbook/AddBlockButton'
import { MarkdownBlock } from '@/components/workbook/blocks/MarkdownBlock'
import { TableBlockWrapper } from '@/components/workbook/blocks/TableBlockWrapper'
import { AIChat } from '@/components/ai-chat/AIChat'
import { Input } from '@/components/ui/input'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import type { BlockType } from '@/components/workbook/WorkbookBlock'
import { serverFnGetWorkbook } from '@/serverFns/workbooks'

export const Route = createFileRoute('/_authed/workbooks/$workbookId')({
  ssr: false,
  loader: async ({ params, context }) => {
    const workbook = await serverFnGetWorkbook({
      data: {
        workbookId: params.workbookId,
      },
    })
    return { workbook }
  },
  component: WorkbookDetailPage,
})

function WorkbookDetailPage() {
  const { workbookId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()

  const { workbook: preloadedWorkbook } = Route.useLoaderData()

  const {
    workbook,
    sortedBlocks,
    addBlock,
    deleteBlock,
    onWorkbookDescriptionChange,
    onWorkbookNameChange,
    onWorkbookDescriptionBlur,
    onWorkbookNameBlur,
  } = useWorkbookSync(preloadedWorkbook)

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  if (!workbook) {
    return <div>Loading...</div>
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Workbooks', href: '/workbooks' },
          { label: workbook.name },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Workbook blocks */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-16 py-8">
            {/* Editable Title and Description */}
            <div className="mb-2 space-y-2">
              <Input
                value={workbook.name}
                onChange={(e) => onWorkbookNameChange(e.target.value)}
                onBlur={onWorkbookNameBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="!text-3xl font-bold border-none shadow-none px-0 h-auto rounded-none bg-transparent transition-colors hover:ring-1 hover:ring-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50"
              />

              <Input
                value={workbook.description || ''}
                onChange={(e) => onWorkbookDescriptionChange(e.target.value)}
                onBlur={onWorkbookDescriptionBlur}
                placeholder="Add a description..."
                className="text-sm text-muted-foreground border-none shadow-none px-0 h-auto rounded-none bg-transparent transition-colors hover:text-foreground hover:ring-1 hover:ring-primary/50 focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>

            <AddBlockButton onAddBlock={(type) => addBlock(type, 0)} />
            <div className="space-y-1">
              {sortedBlocks.map((block, index) => (
                <div key={block.id}>
                  <WorkbookBlock
                    block={{
                      id: block.id,
                      type: block.type as BlockType,
                      content: null,
                    }}
                    onDelete={() => deleteBlock(block.id)}
                  >
                    {block.type === 'markdown' && block.aiMarkdownId && (
                      <div className="p-6">
                        <MarkdownBlock markdownId={block.aiMarkdownId} />
                      </div>
                    )}

                    {block.type === 'table' && block.aiTableId && (
                      <div className="p-6">
                        <TableBlockWrapper tableId={block.aiTableId} />
                      </div>
                    )}
                  </WorkbookBlock>

                  <AddBlockButton
                    onAddBlock={(type: BlockType) => addBlock(type, index + 1)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <AIChat
            context={{ type: 'workbook', workbookId }}
            title="Workbook AI Assistant"
            description="Ask questions about your data, get help with analysis, or generate insights from your workbook."
            quickActions={[
              'Analyze the data in my tables',
              'Summarize key insights',
              'Generate a report',
              'What trends do you see?',
            ]}
          />
        </div>
      </div>
    </AppPageWrapper>
  )
}
