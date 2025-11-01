import { useMemo, useCallback } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useTableSync } from '@/hooks/use-table-sync'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AiTableCell } from '@/components/ai-table/AiTableCell'
import { AiColumnHeader } from '@/components/ai-table/AiColumnHeader'
import type { Record as TableRecord } from '@/lib/ai-table/collections'

interface TableBlockWrapperProps {
  tableId: string
}

type GridRow = TableRecord & { id: string }

// Create column helper - defined outside component for stable reference
const columnHelper = createColumnHelper<GridRow>()

export function AiTable({ tableId }: TableBlockWrapperProps) {
  const { columnsCollection, recordsCollection, cellsCollection } =
    useTableSync(tableId)

  // Live query for columns
  const { data: columns = [], isReady: isReadyColumns } = useLiveQuery((q) =>
    q
      .from({ col: columnsCollection })
      .orderBy(({ col }) => col.position, 'asc'),
  )

  // Live query for records
  const { data: records = [], isReady: isReadyRecords } = useLiveQuery((q) =>
    q
      .from({ rec: recordsCollection })
      .orderBy(({ rec }) => rec.position, 'asc'),
  )

  // Handle adding a new column
  const handleAddColumn = useCallback(() => {
    columnsCollection.insert({
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
  }, [columnsCollection, tableId, columns.length])

  // Handle adding a new row
  const handleAddRow = useCallback(() => {
    recordsCollection.insert({
      id: crypto.randomUUID(),
      tableId,
      position: records.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }, [recordsCollection, tableId, records.length])

  // Map DB columns to TanStack Table columns + Add Column button
  const tableColumns = useMemo<ColumnDef<GridRow>[]>(() => {
    const dataColumns = columns.map((col) =>
      columnHelper.display({
        id: col.id,
        header: () => (
          <AiColumnHeader
            column={col}
            collections={{
              columnsCollection,
              recordsCollection,
              cellsCollection,
            }}
          />
        ),
        cell: ({ row }) => (
          <AiTableCell
            recordId={row.original.id}
            columnId={col.id}
            collections={{
              columnsCollection,
              recordsCollection,
              cellsCollection,
            }}
          />
        ),
      }),
    )

    // Add column button as the last column
    const addColumnColumn = columnHelper.display({
      id: '__add_column__',
      header: () => (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-full justify-center hover:bg-muted/70 text-muted-foreground hover:text-foreground border-0 rounded-none font-normal cursor-pointer"
          onClick={handleAddColumn}
        >
          <Plus className="size-4" />
        </Button>
      ),
      cell: () => null, // Empty cells for this column
    })

    return [...dataColumns, addColumnColumn]
  }, [columns, columnsCollection, recordsCollection, cellsCollection, tableId, handleAddColumn])

  // Build table data - just records with id
  const tableData = useMemo<GridRow[]>(() => {
    return records.map((rec) => ({
      ...rec,
      id: rec.id,
    }))
  }, [records])

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  })

  if (!isReadyColumns || !isReadyRecords) {
    return (
      <div className="w-full flex flex-row">
        <div className="flex gap-2 flex-1">
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            Loading data...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-row min-w-0">
      <div className="flex gap-2 flex-1 min-w-0 overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.id === '__add_column__'
                        ? 'w-12 min-w-12 p-0 !border-r-0'
                        : ''
                    }
                  >
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === '__add_column__'
                          ? 'w-12 min-w-12 p-0 !border-r-0 !border-b-0'
                          : ''
                      }
                    >
                      {cell.column.id === '__add_column__'
                        ? null
                        : flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={tableColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No rows yet. Add a column to get started.
                </TableCell>
              </TableRow>
            )}
            {/* Add Record Row */}
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={tableColumns.length}
                className="p-0 !border-r-0 !border-b-0"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full justify-start hover:bg-muted/70 text-muted-foreground hover:text-foreground border-0 rounded-none font-normal px-2 cursor-pointer"
                  onClick={handleAddRow}
                >
                  <Plus className="size-4 mr-2" />
                  Add record
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
