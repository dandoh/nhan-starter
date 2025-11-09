import { File } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EditableCellProps } from '../output-type-registry'
import type { FileConfig } from '../output-types'

type FileValue = {
  bucket: string
  key: string
  filename: string
  extension: string
  fileSize: number
  mimeType: string
  md5Hash?: string
}

/**
 * Format file size in bytes to human-readable format
 */
function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Get file icon based on MIME type
 */
function getFileIcon(mimeType: string | undefined) {
  if (!mimeType) return File
  
  if (mimeType.startsWith('image/')) {
    return File // Could use Image icon later
  }
  if (mimeType.includes('pdf')) {
    return File // Could use FileText icon later
  }
  
  return File
}

export function FileEditableCell({
  value,
  onBlur,
  onFocus,
}: EditableCellProps<FileConfig, FileValue>) {
  const fileValue = value
  
  // Check if file data exists
  const hasFile = fileValue?.bucket && fileValue?.key && fileValue?.filename
  
  const handleClick = () => {
    // Placeholder for future preview functionality
    if (hasFile) {
      // TODO: Open file preview/dialog
      console.log('File clicked:', fileValue)
    }
  }
  
  if (!hasFile || !fileValue.bucket || !fileValue.key || !fileValue.filename) {
    return (
      <div
        className="h-full w-full flex items-center p-3 text-sm text-muted-foreground"
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <span>No file</span>
      </div>
    )
  }
  
  const FileIcon = getFileIcon(fileValue.mimeType)
  const displayName = fileValue.filename || 'Unknown file'
  const fileSize = formatFileSize(fileValue.fileSize)
  
  return (
    <div
      className={cn(
        'h-full w-full flex gap-2 p-3 cursor-pointer',
        'bg-muted hover:bg-accent rounded-sm transition-colors'
      )}
      onClick={handleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={0}
    >
      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className="truncate text-sm" title={displayName}>
          {displayName}
        </span>
        {fileValue.fileSize && (
          <span className="text-xs text-muted-foreground">
            {fileSize}
          </span>
        )}
      </div>
    </div>
  )
}

