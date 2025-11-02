import { useMemo, useCallback, useRef } from 'react'
import { eq, useLiveQuery, usePacedMutations } from '@tanstack/react-db'
import {
  type ColumnDef,
  ColumnSizingState,
  type Table as TanTable,
  Updater,
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
import {
  tablesCollection,
  updateTableColumnSizing,
} from '@/lib/ai-table/collections'
import {
  AiTable as AiTableType,
  AiTableColumn,
  AiTableRecord,
} from '@/db/schema'
import { useDebouncer } from '@tanstack/react-pacer/debouncer'
import { Skeleton } from '@/components/ui/skeleton'

import React from 'react'
import { cn } from '@/lib/utils'

interface TableBlockWrapperProps {
  tableId: string
}

type GridRow = AiTableRecord & { id: string }

// Create column helper - defined outside component for stable reference
const columnHelper = createColumnHelper<GridRow>()

function AiTableInternal({
  tableId,
  aiTable,
  aiColumns,
  aiRecords,
  columnsCollection,
  recordsCollection,
  cellsCollection,
}: {
  tableId: string
  aiTable: AiTableType
  aiColumns: AiTableColumn[]
  aiRecords: AiTableRecord[]
  columnsCollection: ReturnType<typeof useTableSync>['columnsCollection']
  recordsCollection: ReturnType<typeof useTableSync>['recordsCollection']
  cellsCollection: ReturnType<typeof useTableSync>['cellsCollection']
}) {
  // Handle adding a new column
  const handleAddColumn = useCallback(() => {
    columnsCollection.insert({
      id: crypto.randomUUID(),
      tableId,
      name: 'Untitled',
      description: '',
      outputType: 'text',
      aiPrompt: '',
      outputTypeConfig: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AiTableColumn)
  }, [columnsCollection, tableId])

  // Handle adding a new row
  const handleAddRow = useCallback(() => {
    recordsCollection.insert({
      id: crypto.randomUUID(),
      tableId,
      position: aiRecords.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }, [recordsCollection, tableId, aiRecords.length])

  // Map DB columns to TanStack Table columns + Add Column button
  const tableColumns = useMemo<ColumnDef<GridRow>[]>(() => {
    const dataColumns = aiColumns.map((col) =>
      columnHelper.display({
        id: col.id,
        enableResizing: true,
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
      enableResizing: false,
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
  }, [
    aiColumns,
    columnsCollection,
    recordsCollection,
    cellsCollection,
    tableId,
    handleAddColumn,
  ])

  // Debounced callback to save columnSizing changes
  const saveColumnSizing = async (
    columnSizingUpdater: Updater<ColumnSizingState>,
  ) => {
    const newColumnSizing =
      typeof columnSizingUpdater === 'function'
        ? columnSizingUpdater(aiTable?.columnSizing ?? {})
        : columnSizingUpdater

    updateTableColumnSizing({
      tableId,
      columnSizing: newColumnSizing,
    })
  }

  // const { } = usePacedMutations()

  // Build table data - just records with id
  const tableData = useMemo<GridRow[]>(() => {
    return aiRecords.map((rec) => ({
      ...rec,
      id: rec.id,
    }))
  }, [aiRecords])

  // Get column sizing - filter to only include columns that exist
  // const columnSizingState = useMemo(() => {
  //   const savedSizing = aiTable?.columnSizing || {}
  //   const columnIds = new Set(aiColumns.map((col) => col.id))
  //   const filtered: ColumnSizingState = {}
  //   for (const [columnId, size] of Object.entries(savedSizing)) {
  //     if (columnIds.has(columnId)) {
  //       filtered[columnId] = size
  //     }
  //   }
  //   return filtered
  // }, [aiTable?.columnSizing, aiColumns])

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    getRowId: (row) => row.id,
    defaultColumn: {
      size: 200,
      minSize: 100,
      maxSize: 600,
    },
    state: {
      columnSizing: aiTable.columnSizing || {},
    },
    onColumnSizingChange: saveColumnSizing,
  })

  /**
   * Instead of calling `column.getSize()` on every render for every header
   * and especially every data cell (very expensive),
   * we will calculate all column sizes at once at the root table level in a useMemo
   * and pass the column sizes down as CSS variables to the <table> element.
   */
  const columnSizeVars = React.useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: { [key: string]: number } = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

  return (
    <div className="flex flex-row min-w-0">
      <div className="flex gap-2 flex-1 min-w-0 overflow-auto">
        <Table
          className="min-w-full"
          style={{
            ...columnSizeVars,
            ...(aiColumns.length > 1 ? { width: table.getTotalSize() } : {}),
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.id === '__add_column__'
                        ? 'relative w-12 min-w-12 p-0 !border-r-0'
                        : 'relative'
                    }
                    style={
                      header.id === '__add_column__'
                        ? undefined
                        : {
                            width: `calc(var(--header-${header.id}-size) * 1px)`,
                          }
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {header.column.getCanResize() && (
                      <div
                        onDoubleClick={() => header.column.resetSize()}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={
                          'absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none bg-transparent ' +
                          (header.column.getIsResizing()
                            ? 'border-r-primary border-r-2'
                            : '')
                        }
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getState().columnSizingInfo.isResizingColumn ? (
              <MemoizedRows table={table} />
            ) : (
              <Rows table={table} />
            )}
            {/* Add Record Row */}
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="p-0 !border-r-0 !border-b-0"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full justify-start hover:bg-muted/70 text-muted-foreground hover:text-foreground border-0 rounded-none font-normal px-2 cursor-pointer "
                  onClick={handleAddRow}
                >
                  <Plus className="size-4 mr-2" />
                  Add row
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function AiTable({ tableId }: TableBlockWrapperProps) {
  const { columnsCollection, recordsCollection, cellsCollection } =
    useTableSync(tableId)

  const { data: aiTable } = useLiveQuery((q) =>
    q
      .from({ table: tablesCollection })
      .where(({ table }) => eq(table.id, tableId))
      .findOne(),
  )

  // Live query for columns
  const { data: aiColumns = [], isReady: isReadyColumns } = useLiveQuery((q) =>
    q
      .from({ col: columnsCollection })
      .orderBy(({ col }) => col.createdAt, 'asc'),
  )

  // Live query for records
  const { data: aiRecords = [], isReady: isReadyRecords } = useLiveQuery((q) =>
    q
      .from({ rec: recordsCollection })
      .orderBy(({ rec }) => rec.position, 'asc'),
  )

  if (!isReadyColumns || !isReadyRecords || !aiTable) {
    return (
      <div className="flex flex-row min-w-0">
        <div className="flex gap-2 flex-1 min-w-0 overflow-auto">
          <div className="flex flex-1 items-center justify-center min-h-[200px]">
            <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <AiTableInternal
      tableId={tableId}
      aiTable={aiTable}
      aiColumns={aiColumns}
      aiRecords={aiRecords}
      columnsCollection={columnsCollection}
      recordsCollection={recordsCollection}
      cellsCollection={cellsCollection}
    />
  )
}

function Rows({ table }: { table: TanTable<GridRow> }) {
  return (
    <>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => {
              //simulate expensive render
              // for (let i = 0; i < 10000; i++) {
              //   Math.random()
              // }
              return (
                <TableCell
                  key={cell.id}
                  className={cn(
                    cell.column.id === '__add_column__'
                      ? 'w-12 min-w-12 p-0'
                      : 'p-0',
                    'hover:bg-muted/50',
                  )}
                  style={
                    cell.column.id === '__add_column__'
                      ? undefined
                      : {
                          width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                        }
                  }
                >
                  {cell.column.id === '__add_column__'
                    ? null
                    : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              )
            })}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell
            colSpan={table.getAllLeafColumns().length}
            className="h-24 text-center text-muted-foreground"
          >
            No rows yet. Add a column to get started.
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

const MemoizedRows = React.memo(
  Rows,
  (prev, next) => prev.table.options.data === next.table.options.data,
) as typeof Rows
