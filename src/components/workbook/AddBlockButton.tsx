import { useState } from 'react'
import { Plus, FileText, Table as TableIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BlockType } from './WorkbookBlock'

interface AddBlockButtonProps {
  onAddBlock: (type: BlockType) => void
}

const blockTypes = [
  { type: 'markdown' as BlockType, label: 'Markdown', icon: FileText },
  { type: 'table' as BlockType, label: 'Table', icon: TableIcon },
]

export function AddBlockButton({ onAddBlock }: AddBlockButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="group relative flex items-center justify-center h-[24px]">
      {/* Separator line - always present */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border border-dashed opacity-20 group-hover:opacity-100" />
      </div>

      {/* Content - fixed height container to prevent layout shift */}
      <div className="relative flex items-center h-10">
        {!isExpanded ? (
          // Collapsed state - just the plus button
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100 bg-background hover:bg-accent"
            onClick={() => setIsExpanded(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        ) : (
          // Expanded state - block type options
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm z-10 absolute top-6 -translate-x-1/2">
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
        )}
      </div>
    </div>
  )
}
