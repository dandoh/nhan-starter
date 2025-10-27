import { useMemo, useState } from 'react'
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
import { AiTableCell } from '@/components/ai-table/AiTableCell'
import { AiColumnHeader } from '@/components/ai-table/AiColumnHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell as TableCellUI,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Record as TableRecord } from '@/lib/ai-table/collections'

const columnHelper = createColumnHelper<TableRecord>()

interface TableBlockWrapperProps {
  tableId: string
}

export function TableBlockWrapper({ tableId }: TableBlockWrapperProps) {
  const collections = useTableSync(tableId)
  const [rowSelection, setRowSelection] = useState({})

  // Live query for columns
  const { data: columns } = useLiveQuery((q) =>
    q
      .from({ col: collections.columns })
      .orderBy(({ col }) => col.position, 'asc'),
  )

  // Live query for records
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

  // TanStack Table setup
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
    <div className="w-full">
      <div className="flex gap-2">
        <div className="flex-1 overflow-auto max-h-[500px] scrollbar scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-interactive">
          <Table className="relative">
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
            variant="ghost"
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
      {/* Add Row Button */}
      {columns.length > 0 && (
        <div className="flex items-center mt-4">
          <Button onClick={addRow} variant="ghost" size="sm">
            <Plus className="size-4 mr-2" />
            Add row
          </Button>
        </div>
      )}
    </div>
  )
}
