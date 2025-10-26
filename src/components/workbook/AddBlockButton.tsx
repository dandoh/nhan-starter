import { useState } from 'react'
import { Plus, FileText, Code, Database, BarChart3, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BlockType } from './WorkbookBlock'

interface AddBlockButtonProps {
  onAddBlock: (type: BlockType) => void
}

const blockTypes = [
  { type: 'sql' as BlockType, label: 'SQL', icon: Database },
  { type: 'code' as BlockType, label: 'Python', icon: Code },
  { type: 'text' as BlockType, label: 'Text', icon: FileText },
  { type: 'chart' as BlockType, label: 'Chart', icon: BarChart3 },
  { type: 'table' as BlockType, label: 'Table', icon: TableIcon },
]

export function AddBlockButton({ onAddBlock }: AddBlockButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!isExpanded) {
    return (
      <div className="group relative flex items-center justify-center py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-6 w-6 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100 bg-background hover:bg-accent"
          onClick={() => setIsExpanded(true)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group relative flex items-center justify-center py-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
        <span className="text-xs font-medium text-muted-foreground">Add:</span>
        {blockTypes.map(({ type, label, icon: Icon }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            onClick={() => {
              onAddBlock(type)
              setIsExpanded(false)
            }}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => setIsExpanded(false)}
        >
          <span className="text-xs">Cancel</span>
        </Button>
      </div>
    </div>
  )
}

