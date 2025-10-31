import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { Sparkles } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useTableSync } from '@/hooks/use-table-sync'
import { TableBlockWrapper } from '@/components/workbook/blocks/TableBlockWrapper'
import { AIChat } from '@/components/ai-chat/AIChat'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import { serverFnTriggerComputeAllCells } from '@/serverFns/ai-tables'

export const Route = createFileRoute('/_authed/tables/$tableId')({
  ssr: false,
  component: TableEditorPage,
})

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()
  const collections = useTableSync(tableId)
  const [isComputing, setIsComputing] = useState(false)

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live query for columns to check if we have any
  const { data: columns } = useLiveQuery((q) =>
    q
      .from({ col: collections.columns })
      .orderBy(({ col }) => col.position, 'asc'),
  )

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
          { label: 'AI Tables', href: '/tables' },
          { label: 'Table Details' },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-16 py-8">
            {/* Table Block */}
            <TableBlockWrapper tableId={tableId} />

            {/* Compute All Cells Button - specific to table page */}
            {columns.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                <Button
                  onClick={handleComputeAllCells}
                  variant="outline"
                  size="sm"
                  disabled={isComputing}
                >
                  {isComputing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Computing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Compute All AI Cells
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <AIChat
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
