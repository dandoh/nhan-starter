import { useMemo, useCallback } from 'react'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
  type ColumnDef,
  type Cell,
  type Header,
  ColumnSizingState,
  ColumnPinningState,
  type Table as TanTable,
  type Column as TSColumn,
  Updater,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Plus, Sparkles, GripHorizontal } from 'lucide-react'
import { useTableSync } from '@/hooks/use-table-sync'
import { Button } from '@/components/ui/button'
import { orpcClient } from '@/orpc/client'
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
  updateTableColumnPinning,
} from '@/lib/ai-table/collections'
import {
  AiTable as AiTableType,
  AiTableColumn,
  AiTableRecord,
} from '@/db/schema'
import { Skeleton } from '@/components/ui/skeleton'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
interface TableBlockWrapperProps {
  tableId: string
}

type GridRow = AiTableRecord & { id: string }

// Create column helper - defined outside component for stable reference
const columnHelper = createColumnHelper<GridRow>()

function getCommonPinningStyles(
  column: TSColumn<GridRow>,
): React.CSSProperties {
  const isPinned = column.getIsPinned()

  return {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
  }
}

function getCommonPinningClasses(isPinned: boolean | string): string {
  return cn(
    isPinned ? 'sticky' : 'relative',
    isPinned && 'bg-card z-20',
    isPinned && 'border-r-0',
    isPinned &&
      "after:content-[''] after:absolute after:top-0 after:right-0 after:h-full after:w-px after:bg-border after:pointer-events-none",
  )
}

function DraggableTableHeader({
  header,
}: {
  header: Header<GridRow, unknown>
}) {
  const isAddColumn = header.column.id === '__add_column__'
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    index,
    overIndex,
    activeIndex,
  } = useSortable({
    id: header.column.id,
    disabled: isAddColumn,
  })

  console.log(
    'index',
    index,
    'overIndex',
    overIndex,
    'activeIndex',
    activeIndex,
  )

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: isDragging ? CSS.Translate.toString(transform) : undefined,
    transition: 'width transform 0.2s ease-in-out',
    zIndex: isDragging ? 1 : 0,
    width: `calc(var(--header-${header.id}-size) * 1px)`,
    ...getCommonPinningStyles(header.column),
  }

  const isPinned = header.column.getIsPinned()

  return (
    <TableHead
      key={header.id}
      ref={setNodeRef as unknown as React.Ref<HTMLTableCellElement>}
      className={cn(
        getCommonPinningClasses(!!isPinned),
        index === overIndex && !isAddColumn
          ? 'border-l-primary border-l-2'
          : '',
        isDragging && !isAddColumn && 'bg-primary/20!',
      )}
      style={style}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {!isAddColumn && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1 cursor-grab"
          {...attributes}
          {...listeners}
        >
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
      {header.column.getCanResize() && (
        <div
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={
            'absolute top-0 right-0 h-full w-1 cursor-col-resize select-none touch-none bg-transparent ' +
            (header.column.getIsResizing() ? 'border-r-primary border-r-2' : '')
          }
        />
      )}
    </TableHead>
  )
}

function DragAlongCell({ cell }: { cell: Cell<GridRow, unknown> }) {
  const isAddColumn = cell.column.id === '__add_column__'
  const { isDragging, setNodeRef, transform, index, overIndex, activeIndex } =
    useSortable({
      id: cell.column.id,
      disabled: isAddColumn,
    })

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: isDragging ? CSS.Translate.toString(transform) : undefined,
    transition: 'width transform 0.2s ease-in-out',
    zIndex: isDragging ? 1 : 0,
    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
    ...(getCommonPinningStyles(cell.column) as React.CSSProperties),
  }

  const isPinned = cell.column.getIsPinned()

  return (
    <TableCell
      ref={setNodeRef as unknown as React.Ref<HTMLTableCellElement>}
      className={cn(
        'hover:bg-muted',
        getCommonPinningClasses(!!isPinned),
        '!px-0 !py-0',
        index === overIndex && !isAddColumn
          ? 'border-l-primary border-l-2'
          : '',
        isDragging && !isAddColumn && 'bg-primary/20!',
      )}
      style={style}
    >
      {isAddColumn
        ? null
        : flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  )
}

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
  const [isComputing, setIsComputing] = React.useState(false)
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
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }, [recordsCollection, tableId])

  // Handle compute AI
  const handleComputeAI = useCallback(async () => {
    setIsComputing(true)
    try {
      await orpcClient.aiTables.triggerComputeAllCells({
        tableId,
      })
    } catch (error) {
      console.error('Failed to trigger AI computation:', error)
    } finally {
      setIsComputing(false)
    }
  }, [tableId])

  // Map DB columns to TanStack Table columns + Add Column button
  const tableColumns = useMemo<ColumnDef<GridRow>[]>(() => {
    const dataColumns = aiColumns.map((col) =>
      columnHelper.display({
        id: col.id,
        enableResizing: true,
        enablePinning: !col.primary, // Disable pinning for primary columns
        header: (ctx) => (
          <AiColumnHeader
            column={col}
            tanstackColumn={ctx.header.column as TSColumn<GridRow>}
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

  // Build table data - just records with id
  const tableData = useMemo<GridRow[]>(() => {
    return aiRecords.map((rec) => ({
      ...rec,
      id: rec.id,
    }))
  }, [aiRecords])

  const columnSizing = useMemo(() => {
    const savedSizing = aiTable?.columnSizing || {}
    const columnIds = new Set(aiColumns.map((col) => col.id))
    const res = { ...savedSizing }
    for (const columnId of columnIds) {
      if (!savedSizing[columnId]) {
        res[columnId] = 200
      }
    }
    return res
  }, [aiTable?.columnSizing, aiColumns])

  const onColumnSizingChange = async (
    columnSizingUpdater: Updater<ColumnSizingState>,
  ) => {
    const newColumnSizing =
      typeof columnSizingUpdater === 'function'
        ? columnSizingUpdater(columnSizing)
        : columnSizingUpdater

    updateTableColumnSizing({
      tableId,
      columnSizing: newColumnSizing,
    })
  }

  const columnPinning = useMemo(() => {
    // Make sure primary column is always pinned to the left
    const primaryColumns = aiColumns.filter((col) => col.primary)
    const res = { left: [...(aiTable.columnPinning?.left ?? [])] }

    for (const column of primaryColumns) {
      if (!res.left.includes(column.id)) {
        res.left.push(column.id)
      }
    }

    return res
  }, [aiTable.columnPinning, aiColumns])

  const onColumnPinningChange = async (
    columnPinningUpdater: Updater<ColumnPinningState>,
  ) => {
    const newColumnPinning =
      typeof columnPinningUpdater === 'function'
        ? columnPinningUpdater(columnPinning)
        : columnPinningUpdater

    updateTableColumnPinning({
      tableId,
      columnPinning: newColumnPinning,
    })
  }

  const [columnOrder, setColumnOrder] = React.useState<string[]>(() =>
    aiColumns.map((c) => c.id),
  )

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
      columnSizing,
      columnPinning,
      columnOrder,
    },
    onColumnSizingChange,
    onColumnPinningChange,
    onColumnOrderChange: setColumnOrder,
    debugTable: true,
    debugRows: true,
    debugColumns: true,
    debugCells: true,
  })

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  )
  // reorder columns after drag & drop
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string)
        const newIndex = columnOrder.indexOf(over.id as string)
        return arrayMove(columnOrder, oldIndex, newIndex) //this is just a splice util
      })
    }
  }

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
  }, [
    table.getState().columnSizingInfo,
    table.getState().columnSizing,
    table.getState().columnPinning,
  ])

  const hasPinnedColumns = useMemo(() => {
    return (
      (aiTable.columnPinning?.left?.length ?? 0) > 0 ||
      (aiTable.columnPinning?.right?.length ?? 0) > 0
    )
  }, [aiTable.columnPinning])

  return (
    <div className="flex flex-col min-w-0 max-h-full">
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div className="flex gap-2 flex-1 min-w-0 overflow-auto scrollbar-track-amber-300 scrollbar-thumb-transparent">
          <Table
            // className="min-w-full"
            style={{
              ...columnSizeVars,
              ...(aiColumns.length > 1 ? { width: table.getTotalSize() } : {}),
            }}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    items={columnOrder}
                    strategy={horizontalListSortingStrategy}
                    // strategy={rectSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => (
                      <DraggableTableHeader key={header.id} header={header} />
                    ))}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getState().columnSizingInfo.isResizingColumn ? (
                <MemoizedRows table={table} columnOrder={columnOrder} />
              ) : (
                <Rows table={table} columnOrder={columnOrder} />
              )}
              {/* Add Record Row */}
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={
                    hasPinnedColumns ? aiTable.columnPinning?.left?.length : 1
                  }
                  className={cn(
                    'p-0 !border-r-0 !border-b-0',
                    getCommonPinningClasses(true),
                  )}
                  style={{
                    left: 0,
                  }}
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
      </DndContext>
      {/* Run AI Cells Button - Below table, aligned right */}
      <div className="flex justify-end mt-4">
        <Button
          onClick={handleComputeAI}
          disabled={isComputing}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
          size="lg"
        >
          <Sparkles className="size-4 mr-2" />
          {isComputing ? 'Running...' : 'Run AI cells'}
        </Button>
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
      .orderBy(({ rec }) => rec.createdAt, 'asc'),
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
      aiColumns={aiColumns as unknown as AiTableColumn[]}
      aiRecords={aiRecords as unknown as AiTableRecord[]}
      columnsCollection={columnsCollection}
      recordsCollection={recordsCollection}
      cellsCollection={cellsCollection}
    />
  )
}

function Rows({
  table,
  columnOrder,
}: {
  table: TanTable<GridRow>
  columnOrder: string[]
}) {
  return (
    <>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            <SortableContext
              items={columnOrder}
              strategy={horizontalListSortingStrategy}
            >
              {row.getVisibleCells().map((cell) => (
                <DragAlongCell key={cell.id} cell={cell} />
              ))}
            </SortableContext>
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
  (prev, next) =>
    prev.table.options.data === next.table.options.data &&
    prev.columnOrder === next.columnOrder,
) as unknown as typeof Rows
