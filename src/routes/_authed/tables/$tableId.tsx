import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Plus, Sparkles } from 'lucide-react'
import { useTableSync } from '@/hooks/use-table-sync'
import { AiTableCell } from '@/components/ai-table/AiTableCell'
import { AiColumnHeader } from '@/components/ai-table/AiColumnHeader'
import { AIChat } from '@/components/ai-table/AIChat'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell as TableCellUI,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import type { Record as TableRecord } from '@/lib/ai-table/collections'
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
const columnHelper = createColumnHelper<TableRecord>()

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const collections = useTableSync(tableId)
  const [isComputing, setIsComputing] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState({})

  // Live query for columns
  const { data: columns } = useLiveQuery((q) =>
    q
      .from({ col: collections.columns })
      .orderBy(({ col }) => col.position, 'asc'),
  )

  // Live query for records (just the row structure)
  const { data: records } = useLiveQuery((q) =>
    q
      .from({ rec: collections.records })
      .orderBy(({ rec }) => rec.position, 'asc'),
  )

  const addRow = () => {
    const newRecord: TableRecord = {
      id: crypto.randomUUID(),
      tableId,
      position: records.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    collections.records.insert(newRecord)
  }

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

  // TanStack Table setup with lazy cell rendering
  const tableData = useMemo(() => records, [records])

  const columnDefs = useMemo<ColumnDef<TableRecord>[]>(() => {
    const selectColumn = columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    })

    const dataColumns = columns.map((col) =>
      columnHelper.display({
        id: col.id,
        header: () => <AiColumnHeader column={col} collections={collections} />,
        cell: ({ row }) => (
          <AiTableCell
            recordId={row.original.id}
            columnId={col.id}
            collections={collections}
          />
        ),
      }),
    )

    return [selectColumn, ...dataColumns]
  }, [columns, collections])

  const table = useReactTable({
    data: tableData,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

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
                  <div className="flex space-x-2 flex-1 overflow-hidden">
                    <div className="flex-1 overflow-auto scrollbar scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-interactive">
                      <Table className="relative">
                        <TableHeader className="">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="">
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                      )}
                                </TableHead>
                              ))}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                              <TableCellUI
                                colSpan={columns.length + 1}
                                className="h-24 text-center text-muted-foreground"
                              >
                                No rows yet. Click "+" to add columns or rows.
                              </TableCellUI>
                            </TableRow>
                          ) : (
                            table.getRowModel().rows.map((row) => (
                              <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && 'selected'}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCellUI key={cell.id}>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext(),
                                    )}
                                  </TableCellUI>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-start pt-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="size-8"
                        onClick={() => {
                          collections.columns.insert({
                            id: crypto.randomUUID(),
                            tableId,
                            name: 'Untitled',
                            type: 'ai',
                            description: '',
                            outputType: 'text',
                            aiPrompt: '',
                            outputTypeConfig: {},
                            position: columns.length,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                          })
                        }}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Add Row and Compute Buttons */}
                  {columns.length > 0 && (
                    <div className="flex items-center gap-2 mt-4">
                      <Button onClick={addRow} variant="secondary" size="sm">
                        <Plus className="size-4 mr-2" />
                        Add row
                      </Button>
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
                <AIChat tableId={tableId} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </CardContent>
        </Card>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
