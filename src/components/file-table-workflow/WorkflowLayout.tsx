import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'
import {
  X,
  Plus,
  Lock,
  ChevronDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  FileTableWorkflowFile,
  FileTableWorkflowColumn,
} from '@/db/schema'

// Helper function to convert to Title Case
function toTitleCase(str: string): string {
  return str
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Workflow Layout Component
interface WorkflowLayoutProps {
  files: FileTableWorkflowFile[]
  columns: FileTableWorkflowColumn[]
  isAnalyzing?: boolean
  onFileDelete?: (fileId: string) => void
  onColumnUpdate?: (
    columnIndex: number,
    updates: Partial<FileTableWorkflowColumn>,
  ) => void
  onAddFiles?: () => void
}

export function WorkflowLayout({
  files,
  columns,
  isAnalyzing = false,
  onFileDelete,
  onColumnUpdate,
  onAddFiles,
}: WorkflowLayoutProps) {
  return (
    <div className="flex flex-row gap-4 h-full">
      {/* Files Section */}
      <div className="flex-2 min-w-0 h-full flex flex-col">
        <div className="flex items-center justify-between sticky top-0 bg-card p-4 z-10">
          <h4 className="text-sm font-medium text-foreground">Files</h4>
        </div>
        <div className="space-y-2 p-4 pt-0 overflow-y-auto flex-1 min-h-0">
          {files.map((file) => (
            <WorkflowFileCard
              key={file.id}
              file={file}
              onDelete={onFileDelete ? () => onFileDelete(file.id) : undefined}
            />
          ))}
          <AddFilesButton onAddFiles={onAddFiles} />
        </div>
      </div>

      {/* Columns Section */}
      <div className="flex-2 min-w-0 h-full flex flex-col">
        <div className="flex items-center justify-between sticky top-0 bg-card p-4 z-10">
          <h4 className="text-sm font-medium text-foreground">Columns</h4>
        </div>
        <div className="space-y-2 p-4 pt-0 overflow-y-auto flex-1 min-h-0">
          {columns.map((column, index) => (
            <WorkflowColumnCard
              key={index}
              column={column}
              onUpdate={
                onColumnUpdate
                  ? (updates) => onColumnUpdate(index, updates)
                  : undefined
              }
            />
          ))}
          {isAnalyzing && <AnalyzingIndicator />}
        </div>
      </div>
    </div>
  )
}

// File Card Component
export function WorkflowFileCard({
  file,
  onDelete,
}: {
  file: FileTableWorkflowFile
  onDelete?: () => void
}) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isReady = file.status.toLowerCase() === 'ready'

  const getStatusIcon = () => {
    if (isReady) {
      return <CheckCircle2 className="h-4 w-4 text-primary" />
    }
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />
  }

  return (
    <div className="group rounded-lg border border-border bg-card hover:border-primary/40 transition-all duration-200">
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="shrink-0">{getStatusIcon()}</div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {file.filename}
                </span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatFileSize(file.size)}
                </span>
              </div>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onDelete}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Status Text */}
            <div className="text-xs text-muted-foreground mt-1">
              {file.status}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add Files Button
export function AddFilesButton({
  onAddFiles,
}: {
  onAddFiles?: () => void
}) {
  return (
    <button
      onClick={onAddFiles}
      className="w-full rounded-lg border-2 border-dashed border-border bg-card hover:border-primary/40 hover:bg-muted/50 transition-all duration-200 group"
    >
      <div className="p-4 flex items-center justify-center gap-2">
        <div className="p-1.5 rounded-md bg-muted group-hover:bg-primary/10 transition-colors">
          <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Add files
        </span>
      </div>
    </button>
  )
}

// Column Card Component
export function WorkflowColumnCard({
  column,
  onUpdate,
}: {
  column: FileTableWorkflowColumn
  onUpdate?: (updates: Partial<FileTableWorkflowColumn>) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleAutoPopulateToggle = (checked: boolean) => {
    if (onUpdate) {
      onUpdate({ autoPopulate: checked })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card hover:border-muted-foreground/40 transition-all duration-200">
      {/* Main Row */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={true}
            disabled={column.primary}
            className="shrink-0"
          />

          {/* Column name */}
          <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
            {toTitleCase(column.name)}
          </span>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs">
              {column.outputType}
            </Badge>

            {column.primary && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                Primary
              </Badge>
            )}

            {column.autoPopulate && (
              <Badge variant="secondary" className="text-xs">
                Auto-populated
              </Badge>
            )}
          </div>

          {/* Chevron - only show for non-primary columns */}
          {!column.primary && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  isExpanded && 'rotate-180',
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Content - only show for non-primary columns */}
      {!column.primary && isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50">
          <div className="pt-3 space-y-2">
            {/* Auto-populate toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Auto populate this field based on file content
              </span>
              <Switch
                checked={column.autoPopulate}
                onCheckedChange={handleAutoPopulateToggle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Analyzing Indicator
export function AnalyzingIndicator() {
  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <div className="p-3 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">Analyzing content...</p>
      </div>
    </div>
  )
}

