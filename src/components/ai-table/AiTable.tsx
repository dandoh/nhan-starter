import { useMemo } from 'react'
import { useLiveQuery } from '@tanstack/react-db'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useTableSync } from '@/hooks/use-table-sync'
import { Button } from '@/components/ui/button'
import { DataGrid } from '@/components/data-grid/data-grid'
import { useDataGrid } from '@/hooks/use-data-grid'
import type {
  Column,
  Record as TableRecord,
  Cell,
} from '@/lib/ai-table/collections'

//

interface TableBlockWrapperProps {
  tableId: string
}

type GridRow = Record<string, unknown> & { id: string }

// Create column helper - defined outside component for stable reference
const columnHelper = createColumnHelper<GridRow>()

export function AiTable({ tableId }: TableBlockWrapperProps) {
  const collections = useTableSync(tableId)

  // Live query for columns
  const { data: columns } = useLiveQuery((q) =>
    q
      .from({ col: collections.columnsCollection })
      .orderBy(({ col }) => col.position, 'asc'),
  )

  // Live query for records
  const { data: records } = useLiveQuery((q) =>
    q
      .from({ rec: collections.recordsCollection })
      .orderBy(({ rec }) => rec.position, 'asc'),
  )

  // Live query for cells
  const { data: cells } = useLiveQuery((q) =>
    q.from({ cell: collections.cellsCollection }),
  )

  // Lookup for cells by record+column
  const cellByRecordAndColumn = useMemo(() => {
    const map = new Map<string, Cell>()
    for (const cell of cells) {
      map.set(`${cell.recordId}-${cell.columnId}`, cell)
    }
    return map
  }, [cells])

  // Map DB columns to DataGrid columns (all editable)
  const gridColumns = useMemo<ColumnDef<GridRow>[]>(() => {
    const toVariant = (
      c: Column,
    ):
      | { variant: 'short-text' }
      | { variant: 'long-text' }
      | { variant: 'select'; options: Array<{ label: string; value: string }> }
      | {
          variant: 'multi-select'
          options: Array<{ label: string; value: string }>
        }
      | { variant: 'date' } => {
      switch (c.outputType) {
        case 'long_text':
          return { variant: 'long-text' }
        case 'single_select': {
          const options = (c.outputTypeConfig?.options ?? []).map((o) => ({
            label: o.value,
            value: o.value,
          }))
          return { variant: 'select', options }
        }
        case 'multi_select': {
          const options = (c.outputTypeConfig?.options ?? []).map((o) => ({
            label: o.value,
            value: o.value,
          }))
          return { variant: 'multi-select', options }
        }
        case 'date':
          return { variant: 'date' }
        case 'text':
        default:
          return { variant: 'short-text' }
      }
    }

    return columns.map((col) =>
      columnHelper.accessor(col.id, {
        id: col.id,
        header: col.name,
        meta: {
          cell: toVariant(col),
        },
        minSize: 140,
      }),
    )
  }, [columns])

  // Build grid data (deserialize stored text into correct shapes)
  const gridData = useMemo<GridRow[]>(() => {
    const deserialize = (col: Column, stored: string | null | undefined) => {
      switch (col.outputType) {
        case 'multi_select': {
          if (!stored) return [] as string[]
          try {
            const parsed = JSON.parse(stored)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return [] as string[]
          }
        }
        default:
          return stored ?? ''
      }
    }

    return records.map((rec) => {
      const row: GridRow = { id: rec.id }
      for (const col of columns) {
        const cell = cellByRecordAndColumn.get(`${rec.id}-${col.id}`)
        row[col.id] = deserialize(col, cell?.value ?? '')
      }
      return row
    })
  }, [records, columns, cellByRecordAndColumn])

  // Persist edits back to DB cells
  const onGridDataChange = (newData: GridRow[]) => {
    for (let i = 0; i < newData.length; i++) {
      const newRow = newData[i]
      const existingRow = gridData[i]
      if (!existingRow) continue
      const recordId = newRow.id
      for (const col of columns) {
        const key = col.id
        const nextVal = newRow[key]
        const prevVal = (existingRow as any)[key]
        const areEqual = Array.isArray(nextVal)
          ? Array.isArray(prevVal) &&
            JSON.stringify(nextVal) === JSON.stringify(prevVal)
          : nextVal === prevVal
        if (areEqual) continue

        let toStore: string
        switch (col.outputType) {
          case 'multi_select':
            toStore = JSON.stringify((nextVal as string[]) ?? [])
            break
          default:
            toStore = String(nextVal ?? '')
        }

        const cell = cellByRecordAndColumn.get(`${recordId}-${col.id}`)
        if (cell?.id) {
          collections.cellsCollection.update(cell.id, (draft) => {
            draft.value = toStore
          })
        }
      }
    }
  }

  // Add row via DataGrid footer
  const onRowAdd = async () => {
    const newRecord: TableRecord = {
      id: crypto.randomUUID(),
      tableId,
      position: records.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    collections.recordsCollection.insert(newRecord)
    return {
      rowIndex: records.length,
      columnId: columns[0]?.id,
    }
  }

  const onRowsDelete = async (_rows: any[], rowIndices: number[]) => {
    const toDelete = rowIndices.map((idx) => records[idx]).filter(Boolean)
    for (const rec of toDelete) {
      collections.recordsCollection.delete(rec.id)
    }
  }

  const { table, ...dataGridProps } = useDataGrid<GridRow>({
    columns: gridColumns,
    data: gridData,
    onDataChange: onGridDataChange,
    onRowAdd,
    onRowsDelete,
    enableSearch: true,
  })

  return (
    <div className="w-full flex flex-row">
      <div className="flex gap-2 flex-1">
        <DataGrid {...dataGridProps} table={table} />
      </div>
      <div className="flex items-start pt-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            collections.columnsCollection.insert({
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
  )
}
