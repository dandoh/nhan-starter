import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { Sparkles } from 'lucide-react'
import { useTableSync } from '@/hooks/use-table-sync'
import { TableBlockWrapper } from '@/components/workbook/blocks/TableBlockWrapper'
import { AIChat } from '@/components/ai-chat/AIChat'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { client } from '@/orpc/client'
import { toast } from 'sonner'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/tables/$tableId')({
  ssr: false,
  component: TableEditorPage,
})

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const collections = useTableSync(tableId)
  const [isComputing, setIsComputing] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  // Live query for columns to check if we have any
  const { data: columns } = useLiveQuery((q) =>
    q
      .from({ col: collections.columns })
      .orderBy(({ col }) => col.position, 'asc'),
  )

  const handleComputeAllCells = async () => {
    setIsComputing(true)
    try {
      const result = await client.aiTables.triggerComputeAllCells({ tableId })
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
      ></TopNav>
      <AppPageContentWrapper>
        <Card className="gap-0 p-0">
          <div className="px-6 py-4">
            <CardTitle className="flex justify-between items-center mb-0">
              <span>Company stock analysis</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                    size="sm"
                    variant={isAIChatOpen ? 'secondary' : 'ghost'}
                    aria-label="Toggle AI Assistant"
                  >
                    <Sparkles />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isAIChatOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </div>
          <CardContent className="p-0">
            <ResizablePanelGroup
              direction="horizontal"
              className="min-h-[300px] max-h-[600px]"
            >
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full flex flex-col px-6 py-4 overflow-hidden">
                  {/* Reuse TableBlockWrapper component */}
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
              </ResizablePanel>

              <ResizableHandle withHandle className="w-[0.5px]" />
              <ResizablePanel
                defaultSize={30}
                minSize={20}
                maxSize={50}
                className={cn(isAIChatOpen ? 'max-h-full' : 'hidden')}
              >
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
              </ResizablePanel>
            </ResizablePanelGroup>
          </CardContent>
        </Card>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
