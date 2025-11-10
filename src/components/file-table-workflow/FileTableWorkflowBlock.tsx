import { WorkflowLayout } from './WorkflowLayout'
import {
  fileTableWorkflowsCollection,
  updateFileTableWorkflow,
} from '@/lib/file-table-workflows/collection'
import { useLiveQuery, eq } from '@tanstack/react-db'
import type { FileTableWorkflow } from '@/db/schema'
import { Button } from '@/components/ui/button'
import type { BlocksCollection } from '@/lib/workbooks/collections'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'

interface FileTableWorkflowBlockProps {
  blockId: string
  workflowId: string
  blocksCollection: BlocksCollection
}

export function FileTableWorkflowBlock({
  blockId,
  workflowId,
  blocksCollection,
}: FileTableWorkflowBlockProps) {
  const { data: workflow } = useLiveQuery((q) =>
    q
      .from({ workflow: fileTableWorkflowsCollection })
      .where(({ workflow }) => eq(workflow.id, workflowId))
      .findOne(),
  ) as { data: FileTableWorkflow | undefined }

  // Poll for workflow updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fileTableWorkflowsCollection.utils.refetch()
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
        <p className="text-sm text-muted-foreground">Loading workflow...</p>
      </div>
    )
  }

  const handleFileDelete = (fileId: string) => {
    const updatedFiles = workflow.files.filter((f) => f.id !== fileId)
    updateFileTableWorkflow({
      workflowId: workflow.id,
      files: updatedFiles,
    })
  }

  const handleColumnUpdate = (
    columnIndex: number,
    updates: Partial<FileTableWorkflow['suggestedColumns'][0]>,
  ) => {
    const updatedColumns = [...workflow.suggestedColumns]
    updatedColumns[columnIndex] = {
      ...updatedColumns[columnIndex],
      ...updates,
    }
    updateFileTableWorkflow({
      workflowId: workflow.id,
      suggestedColumns: updatedColumns,
    })
  }

  const handleAddFiles = () => {
    // TODO: Implement file upload
    console.log('Add files clicked')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <WorkflowLayout
          files={workflow.files}
          columns={workflow.suggestedColumns}
          onFileDelete={handleFileDelete}
          onColumnUpdate={handleColumnUpdate}
          onAddFiles={handleAddFiles}
        />
      </div>
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => blocksCollection.delete(blockId)}
          >
            Discard
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement table creation
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}
