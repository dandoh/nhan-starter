import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/_authed/app')({
  component: AppPage,
})

type TableRow = {
  id: string
  [key: string]: string
}

// Create column helper - defined outside component for stable reference
const columnHelper = createColumnHelper<TableRow>()

function AppPage() {
  const [data, setData] = useState<TableRow[]>([])
  const [columnIds, setColumnIds] = useState<string[]>(['main'])
  const [columnNames, setColumnNames] = useState<Record<string, string>>({
    main: 'Main column',
  })
  const [newColumnName, setNewColumnName] = useState('')
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false)

  const addColumn = () => {
    if (newColumnName.trim()) {
      const newColumnId = `col-${Date.now()}`
      setColumnIds([...columnIds, newColumnId])
      setColumnNames({ ...columnNames, [newColumnId]: newColumnName.trim() })
      setNewColumnName('')
      setIsAddColumnDialogOpen(false)
    }
  }

  const addRow = () => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
    }
    setData([...data, newRow])
  }

  const updateCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      setData((oldData) =>
        oldData.map((row) =>
          row.id === rowId ? { ...row, [columnId]: value } : row,
        ),
      )
    },
    [setData],
  )

  // Define columns with useMemo for stable reference
  const columns = useMemo(
    () =>
      columnIds.map((colId) =>
        columnHelper.accessor(colId, {
          header: columnNames[colId],
          cell: (info) => {
            const value = info.getValue() as string
            const rowId = info.row.original.id

            if (colId === 'main') {
              return (
                <Input
                  value={value || ''}
                  onChange={(e) => updateCell(rowId, colId, e.target.value)}
                  className="border-none bg-transparent focus-visible:ring-1"
                  placeholder="Enter text..."
                />
              )
            }

            return <div className="text-foreground">{value || ''}</div>
          },
        }),
      ),
    [columnIds, columnNames, updateCell],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex gap-2">
          <Dialog
            open={isAddColumnDialogOpen}
            onOpenChange={setIsAddColumnDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">Add Column</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Column</DialogTitle>
                <DialogDescription>
                  Enter a name for the new column.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="column-name">Column Name</Label>
                  <Input
                    id="column-name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addColumn()
                      }
                    }}
                    placeholder="Enter column name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addColumn}>Add Column</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={addRow}>
            Add Row
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
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
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
