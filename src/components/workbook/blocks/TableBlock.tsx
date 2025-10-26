import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TableBlockProps {
  data: {
    columns: string[]
    rows: any[][]
  }
  title?: string
}

export function TableBlock({ data, title }: TableBlockProps) {
  const { columns, rows } = data

  return (
    <div className="divide-y divide-border">
      {title && (
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {rows.length} rows
          </Badge>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className="font-medium">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 10).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="text-sm">
                    {cell?.toString() || ''}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 10 && (
          <div className="border-t border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            Showing 10 of {rows.length} rows
          </div>
        )}
      </div>
    </div>
  )
}

