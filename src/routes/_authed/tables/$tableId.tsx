import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Plus } from 'lucide-react'
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

export const Route = createFileRoute('/_authed/tables/$tableId')({
  ssr: false,
  component: TableEditorPage,
})
const columnHelper = createColumnHelper<TableRecord>()

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const collections = useTableSync(tableId)

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

  // TanStack Table setup with lazy cell rendering
  const tableData = useMemo(() => records, [records])

  const columnDefs = useMemo<ColumnDef<TableRecord>[]>(() => {
    return columns.map((col) =>
      columnHelper.display({
        id: col.id,
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
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl py-8">
        {/* Header */}
        <div className="mb-2">
          <Link
            to="/tables"
            className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Tables
          </Link>
        </div>

        {/* Table */}
        {columns.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed border-border">
            <div className="text-center">
              <p className="mb-4 text-muted-foreground">Loading table...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="bg-muted/50 border-r border-border"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                      <TableHead className="w-12 bg-muted/50">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            collections.columns.insert({
                              id: crypto.randomUUID(),
                              tableId,
                              name: 'Untitled',
                              type: 'ai',
                              config: {},
                              position: columns.length,
                              createdAt: new Date(),
                              updatedAt: new Date(),
                            })
                          }}
                        >
                          <Plus className="h-4 w-4" />
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
                          <TableCellUI
                            key={cell.id}
                            className="p-0 border-r border-border"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCellUI>
                        ))}
                        <TableCellUI className="w-12" />
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Add Row Button and Stats */}
        <div className="mt-2 flex items-center gap-4">
          {columns.length > 0 && (
            <Button onClick={addRow} variant="ghost" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
