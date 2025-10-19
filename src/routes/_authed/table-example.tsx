import { createFileRoute } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Trash2,
} from 'lucide-react'

export const Route = createFileRoute('/_authed/table-example')({
  component: TableExamplePage,
})

// Sample data type
type User = {
  id: string
  name: string
  email: string
  status: 'active' | 'inactive' | 'pending'
  role: string
  joinedDate: string
}

// Sample data - defined outside component for stable reference
const defaultData: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active',
    role: 'Admin',
    joinedDate: '2024-01-15',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'active',
    role: 'User',
    joinedDate: '2024-02-20',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    status: 'inactive',
    role: 'User',
    joinedDate: '2024-03-10',
  },
  {
    id: '4',
    name: 'Alice Williams',
    email: 'alice@example.com',
    status: 'pending',
    role: 'Editor',
    joinedDate: '2024-04-05',
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    status: 'active',
    role: 'User',
    joinedDate: '2024-05-12',
  },
  {
    id: '6',
    name: 'Diana Prince',
    email: 'diana@example.com',
    status: 'active',
    role: 'Admin',
    joinedDate: '2024-06-18',
  },
  {
    id: '7',
    name: 'Eve Anderson',
    email: 'eve@example.com',
    status: 'inactive',
    role: 'User',
    joinedDate: '2024-07-22',
  },
  {
    id: '8',
    name: 'Frank Miller',
    email: 'frank@example.com',
    status: 'pending',
    role: 'Editor',
    joinedDate: '2024-08-30',
  },
]

// Create column helper - defined outside component for stable reference
const columnHelper = createColumnHelper<User>()

function TableExamplePage() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [data] = useState(() => defaultData)

  // Define columns with useMemo for stable reference
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
        enableSorting: false,
        enableHiding: false,
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
              className="hover:bg-muted"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: (info) => (
          <div className="font-medium text-foreground">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor('email', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
              className="hover:bg-muted"
            >
              Email
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: (info) => (
          <div className="text-muted-foreground">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue()
          return (
            <Badge
              variant={
                status === 'active'
                  ? 'default'
                  : status === 'inactive'
                    ? 'secondary'
                    : 'outline'
              }
              className={
                status === 'active'
                  ? 'bg-primary text-primary-foreground'
                  : status === 'inactive'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'border-border text-foreground'
              }
            >
              {status}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: (info) => (
          <div className="text-foreground">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor('joinedDate', {
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
              className="hover:bg-muted"
            >
              Joined Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: (info) => (
          <div className="text-muted-foreground">{info.getValue()}</div>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => alert(`Delete user: ${row.original.name}`)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        },
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            TanStack Table Example
          </h1>
          <p className="text-muted-foreground">
            A fully-featured table with sorting, filtering, pagination, and row
            selection.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Filter by name..."
                value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className="max-w-sm bg-background border-border"
              />
              {Object.keys(rowSelection).length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {Object.keys(rowSelection).length} of{' '}
                  {table.getFilteredRowModel().rows.length} row(s) selected
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-border">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-popover border-border"
              >
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="border-border"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="border-border"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-2">✓ Sorting</h3>
            <p className="text-sm text-muted-foreground">
              Click column headers to sort data ascending or descending
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-2">✓ Filtering</h3>
            <p className="text-sm text-muted-foreground">
              Search by name using the filter input above the table
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-2">✓ Pagination</h3>
            <p className="text-sm text-muted-foreground">
              Navigate through pages with previous and next buttons
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground mb-2">✓ Selection</h3>
            <p className="text-sm text-muted-foreground">
              Select rows individually or all at once with checkboxes
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

