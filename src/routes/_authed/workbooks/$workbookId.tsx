import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'
import { useSidebar } from '@/components/ui/sidebar'
import { useWorkbookSync } from '@/hooks/use-workbook-sync'
import { WorkbookBlock } from '@/components/workbook/WorkbookBlock'
import { AddBlockButton } from '@/components/workbook/AddBlockButton'
import { MarkdownBlock } from '@/components/workbook/blocks/MarkdownBlock'
import { TableBlockWrapper } from '@/components/workbook/blocks/TableBlockWrapper'
import { AIChat } from '@/components/ai-chat/AIChat'
import { Input } from '@/components/ui/input'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import { orpc } from '@/orpc/client'
import type { BlockType } from '@/components/workbook/WorkbookBlock'
import type { BlockOrder } from '@/db/schema'

export const Route = createFileRoute('/_authed/workbooks/$workbookId')({
  ssr: false,
  loader: async ({ params, context }) => {
    const workbook = await context.queryClient.ensureQueryData(
      orpc.workbooks.get.queryOptions({
        input: { workbookId: params.workbookId },
      }),
    )
    return { workbook }
  },
  component: WorkbookDetailPage,
})

function WorkbookDetailPage() {
  const { workbookId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()

  const { workbook: preloadedWorkbook } = Route.useLoaderData()

  const { data: workbook = preloadedWorkbook } = useQuery(
    orpc.workbooks.get.queryOptions({
      input: { workbookId: Route.useParams().workbookId },
    }),
  )

  // Local state for name and description (only update on blur)
  const [name, setName] = useState(workbook.name)
  const [description, setDescription] = useState(workbook.description || '')

  // Use collections for blocks
  const collections = useWorkbookSync(workbookId)

  // Live query for blocks
  const { data: blocks = [] } = useLiveQuery((q) =>
    q.from({ block: collections.blocks }),
  )

  // Mutation for workbook updates
  const updateWorkbookMutation = useMutation(
    orpc.workbooks.update.mutationOptions(),
  )

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  // Sort blocks by position from workbook.blockOrder
  const sortedBlocks = useMemo(() => {
    const order = (workbook?.blockOrder as BlockOrder) || {}
    return [...blocks].sort((a, b) => {
      const posA = (order as Record<string, number>)[a.id] ?? 999
      const posB = (order as Record<string, number>)[b.id] ?? 999
      return posA - posB
    })
  }, [blocks, workbook?.blockOrder])

  const handleNameBlur = () => {
    if (name !== workbook.name) {
      updateWorkbookMutation.mutate({
        workbookId,
        name,
      })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== (workbook.description || '')) {
      updateWorkbookMutation.mutate({
        workbookId,
        description,
      })
    }
  }

  const handleAddBlock = (type: BlockType, position: number) => {
    if (type !== 'markdown' && type !== 'table') return

    collections.blocks.insert(
      {
        id: crypto.randomUUID(),
        workbookId,
        type,
        aiMarkdownId: null,
        aiTableId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { metadata: { position } },
    )
  }

  const handleDeleteBlock = (blockId: string) => {
    collections.blocks.delete(blockId)
  }

  if (!workbook) {
    return <div>Loading...</div>
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Workbooks', href: '/workbooks' },
          { label: name },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Workbook blocks */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-12 py-8">
            {/* Editable Title and Description */}
            <div className="mb-2 space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
                className="!text-3xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-1 
                focus-visible:ring-border rounded-none bg-transparent  transition-colors "
              />

              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Add a description..."
                className="text-sm text-muted-foreground border-none shadow-none px-0 h-auto focus-visible:ring-1 
                focus-visible:ring-border rounded-none bg-transparent hover:text-foreground transition-colors "
              />
            </div>

            <AddBlockButton onAddBlock={(type) => handleAddBlock(type, 0)} />
            <div className="space-y-1">
              {sortedBlocks.map((block, index) => (
                <div key={block.id}>
                  <WorkbookBlock
                    block={{
                      id: block.id,
                      type: block.type as BlockType,
                      content: null,
                    }}
                    onDelete={handleDeleteBlock}
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
                    onAddBlock={(type) => handleAddBlock(type, index + 1)}
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
