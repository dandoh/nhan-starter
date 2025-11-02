import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { AiTable } from '@/components/ai-table/AiTable'
import { AiChat } from '@/components/ai-chat/AiChat'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import { serverFnTriggerComputeAllCells } from '@/serverFns/ai-tables'
import { tablesCollection } from '@/lib/ai-table/collections'
import { eq, useLiveQuery } from '@tanstack/react-db'

export const Route = createFileRoute('/_authed/tables/$tableId')({
  ssr: false,
  component: TableEditorPage,
})

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()
  const [isComputing, setIsComputing] = useState(false)
  const { data: table } = useLiveQuery((q) =>
    q
      .from({ table: tablesCollection })
      .where(({ table }) => eq(table.id, tableId))
      .findOne(),
  )

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleComputeAllCells = async () => {
    setIsComputing(true)
    try {
      const result = await serverFnTriggerComputeAllCells({
        data: {
          tableId,
        },
      })
      toast.success(result.message || 'AI computation started', {
        description: `Computing ${result.triggered} cells`,
      })
    } catch (error) {
      toast.error('Failed to trigger AI computation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsComputing(false)
    }
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Tables', href: '/tables' },
          { label: table?.name ?? 'Untitled' },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full flex flex-col">
              {/* Table Block - scrollable */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {table && <AiTable tableId={tableId} />}
              </div>

              {/* <div className="flex items-center gap-2 mt-4 shrink-0">
                <Button
                  onClick={handleComputeAllCells}
                  variant="outline"
                  size="sm"
                  disabled={isComputing}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Compute All AI Cells
                </Button>
              </div> */}
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="flex flex-col w-96 shrink-0 bg-card border-l border-border">
          <AiChat
            context={{ type: 'table', tableId }}
            title="Table AI Assistant"
            description="Ask me to help with your table. I can add columns, analyze data, or perform calculations."
            quickActions={[
              'Add a new column',
              'Analyze sentiment trends',
              'Calculate statistics',
              'Export to CSV',
            ]}
          />
        </div>
      </div>
    </AppPageWrapper>
  )
}
