import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useTableSync } from '@/hooks/use-table-sync'
import { TableCell } from '@/components/ai-table/TableCell'
import { AddColumnDialog } from '@/components/ai-table/AddColumnDialog'
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
          <div className="flex items-center gap-2">
            <span>{col.name}</span>
          </div>
        ),
        cell: ({ row, column }) => (
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
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              to="/tables"
              className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to Tables
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Table Editor</h1>
          </div>

          <div className="flex gap-2">
            <AddColumnDialog
              tableId={tableId}
              collections={collections}
              columns={columns}
            />
            <Button variant="outline" onClick={addRow}>
              Add Row
            </Button>
          </div>
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
                        <TableHead key={header.id} className="bg-muted/50">
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
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No rows yet. Click "Add Row" to get started.
                      </TableCellUI>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCellUI key={cell.id} className="p-0">
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
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span>{columns.length} columns</span>
          <span>·</span>
          <span>{records.length} rows</span>
        </div>
      </div>
    </div>
  )
}
