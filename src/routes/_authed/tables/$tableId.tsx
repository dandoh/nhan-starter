import { createFileRoute, Link } from '@tanstack/react-router'
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
import { TableCell } from '@/components/ai-table/TableCell'
import { ColumnHeaderPopover } from '@/components/ai-table/ColumnHeaderPopover'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell as TableCellUI,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Record as TableRecord } from '@/lib/ai-table/collections'
import { client } from '@/orpc/client'
import { toast } from 'sonner'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/tables/$tableId')({
  ssr: false,
  component: TableEditorPage,
})
const columnHelper = createColumnHelper<TableRecord>()

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const collections = useTableSync(tableId)
  const [isComputing, setIsComputing] = useState(false)

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
    return columns.map((col) =>
      columnHelper.display({
        id: col.id,
        maxSize: 400,
        header: () => (
          <ColumnHeaderPopover column={col} collections={collections} />
        ),
        cell: ({ row }) => (
          <TableCell
            recordId={row.original.id}
            columnId={col.id}
            collections={collections}
          />
        ),
      }),
    )
  }, [columns, collections])

  const table = useReactTable({
    data: tableData,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'AI Tables', href: '/tables' },
          { label: 'Table Details' },
        ]}
      >
        <Button
          onClick={handleComputeAllCells}
          variant="default"
          size="sm"
          disabled={isComputing}
        >
          {isComputing ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Computing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Compute All AI Cells
            </>
          )}
        </Button>
      </TopNav>
      <AppPageContentWrapper>
        <Card className="">
          <CardContent>
            {/* Table */}
            {columns.length === 0 ? (
              <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <p className="mb-4 text-muted-foreground">Loading table...</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                      <TableHead className="w-16">
                        <Button
                          size="icon"
                          variant="ghost"
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
                      </TableHead>
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
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCellUI key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCellUI>
                        ))}
                        <TableCellUI className="w-16" />
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {/* Add Row Button */}
            {columns.length > 0 && (
              <div className="mt-4">
                <Button onClick={addRow} variant="ghost" size="sm">
                  <Plus className="mr-2 size-4" />
                  Add Row
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}
