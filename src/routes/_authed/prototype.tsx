import { createFileRoute } from '@tanstack/react-router'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  X,
  Plus,
  FileText,
  AlertCircle,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Helper function to convert to Title Case
function toTitleCase(str: string): string {
  return str
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export const Route = createFileRoute('/_authed/prototype')({
  component: PrototypePage,
})

// Types
type FileStatus = {
  id: string
  name: string
  size: number
  uploadProgress: number
  processingProgress: number
  contentType?: string
  chunks?: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  statusText: string
}

type SuggestedColumn = {
  id: string
  name: string
  type: string
  selected: boolean
  autoPopulate: boolean
  required?: boolean
}

// Main Prototype Page
function PrototypePage() {
  // Mock data for Stage 1: Uploading
  const uploadingFiles: FileStatus[] = [
    {
      id: '1',
      name: 'sales_data.csv',
      size: 1024000,
      uploadProgress: 45,
      processingProgress: 0,
      status: 'uploading',
      statusText: 'Uploading... 45%',
    },
    {
      id: '2',
      name: 'customer_info.xlsx',
      size: 2048000,
      uploadProgress: 78,
      processingProgress: 0,
      status: 'uploading',
      statusText: 'Uploading... 78%',
    },
    {
      id: '3',
      name: 'product_catalog.pdf',
      size: 512000,
      uploadProgress: 23,
      processingProgress: 0,
      status: 'uploading',
      statusText: 'Uploading... 23%',
    },
  ]

  // Mock data for Stage 2: Processing
  const processingFiles: FileStatus[] = [
    {
      id: '1',
      name: 'sales_data.csv',
      size: 1024000,
      uploadProgress: 100,
      processingProgress: 65,
      contentType: 'CSV',
      chunks: 6,
      status: 'processing',
      statusText: 'Chunking content',
    },
    {
      id: '2',
      name: 'customer_info.xlsx',
      size: 2048000,
      uploadProgress: 100,
      processingProgress: 30,
      contentType: 'XLSX',
      chunks: 2,
      status: 'processing',
      statusText: 'Analyzing structure',
    },
    {
      id: '3',
      name: 'product_catalog.pdf',
      size: 512000,
      uploadProgress: 100,
      processingProgress: 90,
      contentType: 'PDF',
      chunks: 9,
      status: 'processing',
      statusText: 'Extracting content',
    },
  ]

  // Mock data for Stage 3: Suggesting Columns (partial)
  const completedFiles: FileStatus[] = [
    {
      id: '1',
      name: 'sales_data.csv',
      size: 1024000,
      uploadProgress: 100,
      processingProgress: 100,
      contentType: 'CSV',
      chunks: 10,
      status: 'completed',
      statusText: 'Ready',
    },
    {
      id: '2',
      name: 'customer_info.xlsx',
      size: 2048000,
      uploadProgress: 100,
      processingProgress: 100,
      contentType: 'XLSX',
      chunks: 10,
      status: 'completed',
      statusText: 'Ready',
    },
    {
      id: '3',
      name: 'product_catalog.pdf',
      size: 512000,
      uploadProgress: 100,
      processingProgress: 100,
      contentType: 'PDF',
      chunks: 10,
      status: 'completed',
      statusText: 'Ready',
    },
  ]

  const partialColumns: SuggestedColumn[] = [
    {
      id: '0',
      name: 'subject',
      type: 'file',
      selected: true,
      autoPopulate: true,
      required: true,
    },
    {
      id: '1',
      name: 'customer_id',
      type: 'text',
      selected: true,
      autoPopulate: true,
    },
    {
      id: '2',
      name: 'customer_name',
      type: 'text',
      selected: true,
      autoPopulate: true,
    },
    {
      id: '3',
      name: 'email',
      type: 'text',
      selected: true,
      autoPopulate: true,
    },
  ]

  // Mock data for Stage 4: Selecting Columns
  const allColumns: SuggestedColumn[] = [
    {
      id: '0',
      name: 'subject',
      type: 'file',
      selected: true,
      autoPopulate: true,
      required: true,
    },
    {
      id: '1',
      name: 'customer_id',
      type: 'text',
      selected: true,
      autoPopulate: true,
    },
    {
      id: '2',
      name: 'customer_name',
      type: 'text',
      selected: true,
      autoPopulate: true,
    },
    {
      id: '3',
      name: 'email',
      type: 'text',
      selected: true,
      autoPopulate: true,
    },
    {
      id: '4',
      name: 'purchase_date',
      type: 'date',
      selected: true,
      autoPopulate: false,
    },
    {
      id: '5',
      name: 'amount',
      type: 'number',
      selected: false,
      autoPopulate: true,
    },
    {
      id: '6',
      name: 'product_category',
      type: 'text',
      selected: true,
      autoPopulate: false,
    },
    {
      id: '7',
      name: 'status',
      type: 'select',
      selected: false,
      autoPopulate: true,
    },
  ]

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Prototype' }]} />
      <AppPageContentWrapper className="bg-muted/30">
        <div className="mx-auto max-w-7xl p-6 space-y-6">
          <div className="space-y-6">
            {/* Stage 1: Uploading */}
            <WorkflowCard>
              <WorkflowLayout files={uploadingFiles} columns={[]} />
            </WorkflowCard>

            {/* Stage 2: Processing */}
            <WorkflowCard>
              <WorkflowLayout files={processingFiles} columns={[]} />
            </WorkflowCard>

            {/* Stage 3: Analyzing */}
            <WorkflowCard>
              <WorkflowLayout
                files={completedFiles}
                columns={partialColumns}
                isAnalyzing={true}
              />
            </WorkflowCard>

            {/* Stage 4: Configuring */}
            <WorkflowCard>
              <WorkflowLayout files={completedFiles} columns={allColumns} />
            </WorkflowCard>
          </div>
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

// Workflow Card Wrapper
function WorkflowCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="">{children}</CardContent>
    </Card>
  )
}

// Workflow Layout Component
interface WorkflowLayoutProps {
  files: FileStatus[]
  columns: SuggestedColumn[]
  isAnalyzing?: boolean
}

function WorkflowLayout({
  files,
  columns,
  isAnalyzing = false,
}: WorkflowLayoutProps) {
  return (
    <div className="flex flex-row gap-4 h-full">
      {/* Files Section */}
      <div className="flex-2 min-w-0 h-full">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">Files</h4>
        </div>
        <div className="space-y-2">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
          <AddFilesButton />
        </div>
      </div>

      {/* Columns Section */}
      <div className="flex-4 min-w-0 h-full">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">Columns</h4>
        </div>
        <div className="space-y-2">
          {columns.map((column) => (
            <ColumnCard key={column.id} column={column} />
          ))}
          {isAnalyzing && <AnalyzingIndicator />}
        </div>
      </div>
    </div>
  )
}

// File Card Component
function FileCard({ file }: { file: FileStatus }) {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-primary" />
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
                  {file.name}
                </span>
                <span className="text-sm text-muted-foreground shrink-0">
                  {formatFileSize(file.size)}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Status Text */}
            <div className="text-xs text-muted-foreground mt-1">
              {file.statusText}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add Files Button
function AddFilesButton() {
  return (
    <button className="w-full rounded-lg border-2 border-dashed border-border bg-card hover:border-primary/40 hover:bg-muted/50 transition-all duration-200 group">
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
function ColumnCard({ column }: { column: SuggestedColumn }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card hover:border-muted-foreground/40 transition-all duration-200">
      {/* Main Row */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <Checkbox
            checked={column.selected}
            disabled={column.required}
            className="shrink-0"
          />

          {/* Column name */}
          <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
            {toTitleCase(column.name)}
          </span>

          {/* Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs">
              {column.type}
            </Badge>

            {column.required && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                Required
              </Badge>
            )}

            {column.autoPopulate && column.selected && (
              <Badge variant="secondary" className="text-xs">
                Auto-populated
              </Badge>
            )}
          </div>

          {/* Chevron */}
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
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50">
          <div className="pt-3 space-y-2">
            {/* Auto-populate toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Auto populate this field based on file content
              </span>
              <Switch
                id={`auto-${column.id}`}
                checked={column.autoPopulate}
                disabled={!column.selected}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Analyzing Indicator
function AnalyzingIndicator() {
  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <div className="p-3 flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">Analyzing content...</p>
      </div>
    </div>
  )
}
