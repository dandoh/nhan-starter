import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { TableCollections, Column } from '@/lib/ai-table/collections'

type AddColumnDialogProps = {
  tableId: string
  collections: TableCollections
  columns: Column[]
  trigger?: React.ReactNode
}

export function AddColumnDialog({
  tableId,
  collections,
  columns,
  trigger,
}: AddColumnDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [columnName, setColumnName] = useState('')
  const [isAIGenerated, setIsAIGenerated] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([])

  const handleSubmit = () => {
    if (columnName.trim()) {
      const newColumn: Column = {
        id: crypto.randomUUID(),
        tableId,
        name: columnName.trim(),
        config: {},
        position: columns.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      collections.columns.insert(newColumn)

      // Reset form
      setColumnName('')
      setIsAIGenerated(false)
      setAiPrompt('')
      setSelectedDependencies([])
      setIsOpen(false)
    }
  }

  const toggleDependency = (columnId: string) => {
    setSelectedDependencies((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId],
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Add Column</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogDescription>
            Create a new column. You can make it AI-generated to automatically
            populate values.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Column Name */}
          <div className="grid gap-2">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAIGenerated) {
                  handleSubmit()
                }
              }}
              placeholder="e.g., Email, Summary, Category..."
              autoFocus
            />
          </div>

          {/* AI Generated Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ai-generated">AI Generated</Label>
              <div className="text-sm text-muted-foreground">
                Let AI automatically fill this column
              </div>
            </div>
            <Switch
              id="ai-generated"
              checked={isAIGenerated}
              onCheckedChange={setIsAIGenerated}
            />
          </div>

          {/* AI Prompt (only shown when AI is enabled) */}
          {isAIGenerated && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="ai-prompt">AI Prompt</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Generate a professional email subject line based on the content..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Describe what you want AI to generate for this column
                </p>
              </div>

              {/* Dependency Selection */}
              {columns.length > 0 && (
                <div className="grid gap-2">
                  <Label>Use Data From</Label>
                  <div className="space-y-2 rounded-lg border border-border p-3">
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          id={`dep-${column.id}`}
                          checked={selectedDependencies.includes(column.id)}
                          onChange={() => toggleDependency(column.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <label
                          htmlFor={`dep-${column.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {column.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which columns AI should use as context
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!columnName.trim()}>
            Add Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
