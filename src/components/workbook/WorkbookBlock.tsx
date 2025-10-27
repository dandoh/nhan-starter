import { ReactNode } from 'react'
import { GripVertical, MoreHorizontal, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type BlockType = 'table' | 'markdown' | 'text' | 'code' | 'sql' | 'chart'

export interface Block {
  id: string
  type: BlockType
  content: any
  title?: string
}

interface WorkbookBlockProps {
  block: Block
  onDelete?: (blockId: string) => void
  onRun?: (blockId: string) => void
  children: ReactNode
}

export function WorkbookBlock({
  block,
  onDelete,
  onRun,
  children,
}: WorkbookBlockProps) {
  const showRunButton = block.type === 'code' || block.type === 'sql'

  return (
    <div className="group relative">
      {/* Block toolbar - appears on hover */}
      <div className="absolute -left-12 top-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute -right-12 top-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {showRunButton && onRun && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onRun(block.id)}
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete?.(block.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Block content */}
      <div className="rounded-lg border border-border bg-card transition-colors hover:border-primary/50">
        {children}
      </div>
    </div>
  )
}

