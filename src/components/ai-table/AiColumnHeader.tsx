import { useState } from 'react'
import {
  Edit2,
  Trash2,
  ChevronDown,
  Info,
  ArrowDown,
  ArrowUp,
  Pin,
  PinOff,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useLiveQuery } from '@tanstack/react-db'
import type { TableCollections } from '@/lib/ai-table/collections'
import type { AiTableColumn as DbAiTableColumn } from '@/db/schema'
import type { Column as TSColumn } from '@tanstack/react-table'
import { useAppForm } from '@/hooks/use-app-form'
import { toast } from 'sonner'
import type { OutputType, OutputTypeConfig } from '@/lib/ai-table/output-types'
import {
  getAllOutputTypes,
  getOutputTypeDefinition,
} from '@/lib/ai-table/output-type-registry'
import { cn } from '@/lib/utils'
import { useAIChat } from '@/components/ai-chat/ai-chat-context'

type ColumnHeaderProps = {
  column: DbAiTableColumn
  tanstackColumn?: TSColumn<any>;
  collections: TableCollections
}

type ViewMode = 'menu' | 'edit'

export function AiColumnHeader({ column, tanstackColumn, collections }: ColumnHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('menu')
  const { setInput } = useAIChat()

  // Get all columns to check if this is the last one
  const { data: allColumns = [] } = useLiveQuery((q) =>
    q.from({ col: collections.columnsCollection }),
  )

  const isLastColumn = allColumns.length <= 1

  // Get output type definition for icon
  const outputType = (column.outputType || 'text') as OutputType
  const outputTypeDef = getOutputTypeDefinition(outputType)
  const existingConfig = column.outputTypeConfig as OutputTypeConfig | null

  // Extract config values based on type
  const getOptionsString = () => {
    if (
      existingConfig &&
      'options' in existingConfig &&
      existingConfig.options
    ) {
      return existingConfig.options
        .map((opt: { value: string }) => opt.value)
        .join(', ')
    }
    return ''
  }

  const getMaxSelections = () => {
    if (existingConfig && 'maxSelections' in existingConfig) {
      return existingConfig.maxSelections
    }
    return undefined
  }

  const getDateFormat = () => {
    if (existingConfig && 'dateFormat' in existingConfig) {
      return existingConfig.dateFormat || 'YYYY-MM-DD'
    }
    return 'YYYY-MM-DD'
  }

  const form = useAppForm({
    defaultValues: {
      name: column.name,
      description: column.description || '',
      outputType: (column.outputType || 'text') as OutputType,
      aiPrompt: column.aiPrompt || '',
      // Options as comma-separated string for easier editing
      options: getOptionsString(),
      maxSelections: getMaxSelections(),
      dateFormat: getDateFormat(),
    },
    onSubmit: async ({ value }) => {
      console.log('value', value)

      // Build outputTypeConfig based on outputType
      let outputTypeConfig: OutputTypeConfig | null = null

      if (value.outputType === 'single_select') {
        // Parse options from comma-separated or newline-separated string
        const optionsArray = value.options
          .split(/[,\n]+/)
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt.length > 0)
          .map((opt: string) => ({ value: opt }))

        outputTypeConfig = {
          ...(optionsArray.length > 0 && { options: optionsArray }),
        }
      } else if (value.outputType === 'multi_select') {
        // Parse options from comma-separated or newline-separated string
        const optionsArray = value.options
          .split(/[,\n]+/)
          .map((opt: string) => opt.trim())
          .filter((opt: string) => opt.length > 0)
          .map((opt: string) => ({ value: opt }))

        const config: {
          options?: Array<{ value: string; color?: string }>
          maxSelections?: number
        } = {
          ...(optionsArray.length > 0 && { options: optionsArray }),
        }

        if (value.maxSelections) {
          // Convert to number if it's a string
          const maxSelectionsNum =
            typeof value.maxSelections === 'string'
              ? parseInt(value.maxSelections, 10)
              : value.maxSelections
          if (maxSelectionsNum > 0) {
            config.maxSelections = maxSelectionsNum
          }
        }

        outputTypeConfig = config
      } else if (value.outputType === 'date') {
        outputTypeConfig = {
          dateFormat: value.dateFormat,
        }
      }

      collections.columnsCollection.update(column.id, (draft) => {
        draft.name = value.name
        draft.description = value.description
        draft.outputType = value.outputType
        draft.aiPrompt = value.aiPrompt
        draft.outputTypeConfig = outputTypeConfig
      })
      setIsOpen(false)
      toast.success('Column updated')
    },
  })

  const handleCancel = () => {
    form.reset()
    setIsOpen(false)
  }

  const handleDelete = () => {
    if (column.primary) {
      toast.error('Cannot delete primary column')
      return
    }

    if (isLastColumn) {
      toast.error('Cannot delete the last column')
      return
    }

    collections.columnsCollection.delete(column.id)
    setIsOpen(false)
    toast.success('Column deleted')
  }

  const handleEditClick = (e: Event) => {
    e.preventDefault()
    setViewMode('edit')
  }

  const handleDropdownOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setViewMode('menu')
    }
  }

  const handleMentionInAI = () => {
    setIsOpen(false)
    // Add mention text (e.g., @column:ColumnName), appending to existing text
    setInput((oldValue) => {
      const mentionText = `@${column.name} `
      return oldValue ? `${oldValue}${mentionText}` : mentionText
    })
  }

  const isPinnedLeft = tanstackColumn?.getIsPinned() === 'left'
  const canPin = tanstackColumn?.getCanPin?.() ?? false
  const isPrimary = column.primary

  return (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Column type icon with tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center">
                <outputTypeDef.icon className="h-4 w-4 text-muted-foreground" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{outputTypeDef.tooltip}</p>
            </TooltipContent>
          </Tooltip>

          {/* Column name */}
          <span>{column.name}</span>
        </div>

        {/* Right side: Info icon and dropdown menu */}
        <div className="flex items-center gap-1">
          {/* Description info icon with tooltip */}
          {column.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus:outline-none"
                  aria-label="Column description"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{column.description}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Dropdown menu */}
          <DropdownMenu open={isOpen} onOpenChange={handleDropdownOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label="Column options"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn('w-80 p-0', {
                'w-100': viewMode === 'edit',
              })}
            >
              {viewMode === 'menu' ? (
                <>
                  <DropdownMenuItem onSelect={handleEditClick}>
                    <Edit2 className="h-4 w-4" />
                    <span>Edit column</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={handleMentionInAI}>
                    <Sparkles className="h-4 w-4" />
                    <span>Mention in AI</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {canPin && !isPrimary && (
                    <>
                      <DropdownMenuItem
                        onSelect={() => {
                          if (!tanstackColumn) return
                          if (isPinnedLeft) {
                            tanstackColumn.pin(false)
                          } else {
                            tanstackColumn.pin('left')
                          }
                        }}
                      >
                        {isPinnedLeft ? (
                          <>
                            <PinOff className="h-4 w-4" />
                            <span>Unpin</span>
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4" />
                            <span>Pin left</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <ArrowDown className="h-4 w-4" />
                    <span>Sort A → Z</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <ArrowUp className="h-4 w-4" />
                    <span>Sort Z → A</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault()
                      handleDelete()
                    }}
                    disabled={column.primary || isLastColumn}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete column</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Column Name */}
                  <form.AppField
                    name="name"
                    validators={{
                      onBlur: ({ value }) => {
                        if (!value || value.trim().length === 0) {
                          return 'Column name is required'
                        }
                        return undefined
                      },
                    }}
                  >
                    {(field) => (
                      <field.TextField
                        label="Column Name"
                        placeholder="Enter column name"
                      />
                    )}
                  </form.AppField>

                  {/* Output Type */}
                  <form.AppField name="outputType">
                    {(field) => (
                      <field.Select
                        label="Output Type"
                        placeholder="Select output type"
                        values={getAllOutputTypes()}
                      />
                    )}
                  </form.AppField>

                  {/* Description */}
                  <form.AppField name="description">
                    {(field) => (
                      <field.TextArea label="Description (Optional)" rows={2} />
                    )}
                  </form.AppField>

                  {/* AI Prompt */}
                  <form.AppField name="aiPrompt">
                    {(field) => (
                      <field.TextArea label="AI Prompt (Optional)" rows={3} />
                    )}
                  </form.AppField>

                  {/* Output Type Config - Conditional based on outputType */}
                  <form.Subscribe selector={(state) => state.values.outputType}>
                    {(outputType) => (
                      <>
                        {/* Options for single_select and multi_select */}
                        {(outputType === 'single_select' ||
                          outputType === 'multi_select') && (
                          <form.AppField name="options">
                            {(field) => (
                              <field.TextArea
                                label="Options (Optional)"
                                rows={2}
                              />
                            )}
                          </form.AppField>
                        )}

                        {/* Max selections for multi_select */}
                        {outputType === 'multi_select' && (
                          <form.AppField name="maxSelections">
                            {(field) => (
                              <field.TextField
                                label="Max Selections (Optional)"
                                placeholder="Leave empty for unlimited"
                              />
                            )}
                          </form.AppField>
                        )}

                        {/* Date format for date */}
                        {outputType === 'date' && (
                          <form.AppField name="dateFormat">
                            {(field) => (
                              <field.RadioGroupField
                                label="Date Format"
                                options={[
                                  {
                                    value: 'YYYY-MM-DD',
                                    label: 'YYYY-MM-DD',
                                  },
                                  {
                                    value: 'MM/DD/YYYY',
                                    label: 'MM/DD/YYYY',
                                  },
                                  {
                                    value: 'DD/MM/YYYY',
                                    label: 'DD/MM/YYYY',
                                  },
                                ]}
                              />
                            )}
                          </form.AppField>
                        )}
                      </>
                    )}
                  </form.Subscribe>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <form.AppForm>
                      <form.SubscribeButton
                        label="Save"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          form.handleSubmit()
                        }}
                      />
                    </form.AppForm>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  )
}
