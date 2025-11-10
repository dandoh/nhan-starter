import { inngest } from '../client'
import { db } from '@/db'
import { fileTableWorkflows, FileTableWorkflowColumn } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Process a single uploaded workflow file
 * Analyzes the file and suggests new columns for the table
 * Concurrency limited to 3 files at a time
 */
export const processFileTableWorkflowFile = inngest.createFunction(
  {
    id: 'process-file-table-workflow-file',
    concurrency: {
      limit: 3,
    },
    retries: 1,
    onFailure: async ({ error, event }) => {
      // Handle any failure by updating file status to error
      const { workflowId, fileId } = event.data.event.data
      
      // Fetch the workflow
      const workflow = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })
      
      if (workflow) {
        // Update the file status to error
        const updatedFiles = workflow.files.map((file) =>
          file.id === fileId
            ? { ...file, status: `Error: ${error.message}` }
            : file,
        )
        
        await db
          .update(fileTableWorkflows)
          .set({ files: updatedFiles })
          .where(eq(fileTableWorkflows.id, workflowId))
      }
    },
  },
  { event: 'workflow/file-table-workflow-file.process' },
  async ({ event, step }) => {
    const { workflowId, fileId, filename } = event.data

    // Step 1: Fetch workflow
    const workflow = await step.run('fetch-workflow', async () => {
      const result = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })

      if (!result) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      return result
    })

    // Step 2: Update file status to processing
    await step.run('set-processing-status', async () => {
      const updatedFiles = workflow.files.map((file) =>
        file.id === fileId ? { ...file, status: 'Processing' } : file,
      )

      await db
        .update(fileTableWorkflows)
        .set({ files: updatedFiles })
        .where(eq(fileTableWorkflows.id, workflowId))
    })

    // Step 3: Simulate file analysis (fake sleep and generate suggestions)
    const newSuggestions = await step.run('analyze-file', async () => {
      // Simulate processing time (2-4 seconds)
      const sleepTime = 2000 + Math.random() * 2000
      await new Promise((resolve) => setTimeout(resolve, sleepTime))

      // Generate fake column suggestions based on the file
      const suggestions: FileTableWorkflowColumn[] = []

      // Add a few sample suggestions
      const fileNameWithoutExt = filename.replace(/\.[^/.]+$/, '')
      
      suggestions.push({
        name: `${fileNameWithoutExt} Summary`,
        outputType: 'text',
        autoPopulate: true,
        primary: false,
      })

      suggestions.push({
        name: `${fileNameWithoutExt} Category`,
        outputType: 'single_select',
        autoPopulate: true,
        primary: false,
      })

      suggestions.push({
        name: `${fileNameWithoutExt} Tags`,
        outputType: 'multi_select',
        autoPopulate: true,
        primary: false,
      })

      return suggestions
    })

    // Step 4: Update workflow with new column suggestions
    await step.run('add-column-suggestions', async () => {
      // Fetch latest workflow state
      const latestWorkflow = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })

      if (!latestWorkflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      // Merge new suggestions with existing ones (avoid duplicates by name)
      const existingNames = new Set(
        latestWorkflow.suggestedColumns.map((col) => col.name),
      )
      const uniqueNewSuggestions = newSuggestions.filter(
        (suggestion) => !existingNames.has(suggestion.name),
      )

      const updatedSuggestions = [
        ...latestWorkflow.suggestedColumns,
        ...uniqueNewSuggestions,
      ]

      // Update file status to completed
      const updatedFiles = latestWorkflow.files.map((file) =>
        file.id === fileId ? { ...file, status: 'Processed' } : file,
      )

      await db
        .update(fileTableWorkflows)
        .set({
          suggestedColumns: updatedSuggestions,
          files: updatedFiles,
        })
        .where(eq(fileTableWorkflows.id, workflowId))
    })

    return {
      success: true,
      workflowId,
      fileId,
      suggestionsAdded: newSuggestions.length,
    }
  },
)

