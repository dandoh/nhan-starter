import { useState } from 'react'
import { ChevronDown, Pencil, Sparkles, Trash2 } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLiveQuery, eq } from '@tanstack/react-db'
import type { TableCollections, Column } from '@/lib/ai-table/collections'
import { useAppForm } from '@/hooks/use-app-form'
import { toast } from 'sonner'
import type { OutputType, OutputTypeConfig } from '@/lib/ai-table/output-types'

type ColumnHeaderPopoverProps = {
  column: Column
  collections: TableCollections
}

export function ColumnHeaderPopover({
  column,
  collections,
}: ColumnHeaderPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Check if this is the last manual column to disable type change
  const { data: manualColumns = [] } = useLiveQuery((q) =>
    q
      .from({ col: collections.columns })
      .where(({ col }) => eq(col.type, 'manual')),
  )

  // Get all columns to check if this is the last one
  const { data: allColumns = [] } = useLiveQuery((q) =>
    q.from({ col: collections.columns }),
  )

  const isLastManualColumn =
    column.type === 'manual' && manualColumns.length <= 1
  const isLastColumn = allColumns.length <= 1

  // Parse existing config for form
  const existingConfig = column.outputTypeConfig as OutputTypeConfig | null

  // Extract config values based on type
  const getOptionsString = () => {
    if (existingConfig && 'options' in existingConfig && existingConfig.options) {
      return existingConfig.options.map((opt: { value: string }) => opt.value).join(', ')
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
      type: (column.type || 'ai') as 'manual' | 'ai',
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

        const config: { options?: Array<{ value: string; color?: string }>; maxSelections?: number } = {
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

      collections.columns.update(column.id, (draft) => {
        draft.name = value.name
        draft.type = value.type
        draft.description = value.description
        draft.outputType = value.outputType
        draft.aiPrompt = value.aiPrompt
        draft.outputTypeConfig = outputTypeConfig
      })
      setIsOpen(false)
    },
  })

  const handleCancel = () => {
    form.reset()
    setIsOpen(false)
  }

  const handleDelete = () => {
    if (isLastColumn) {
      toast.error('Cannot delete the last column')
      return
    }

    if (isLastManualColumn) {
      toast.error('Cannot delete the last manual column')
      return
    }

    collections.columns.delete(column.id)
    setIsOpen(false)
    toast.success('Column deleted')
  }

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span>{column.name}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex opacity-30">
                {column.type === 'manual' ? (
                  <Pencil className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {column.type === 'manual' ? 'Manual Column' : 'AI Column'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-96 max-h-[600px] overflow-y-auto"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid gap-4">
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
                <field.TextField label="Name" placeholder="Column name" />
              )}
            </form.AppField>

            {/* Column Type */}
            <form.AppField name="type">
              {(field) => (
                <div>
                  {isLastManualColumn && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Cannot change type of last manual column
                    </p>
                  )}
                  <field.RadioGroupField
                    label="Column Type"
                    disabled={isLastManualColumn}
                    options={[
                      {
                        value: 'manual',
                        label: 'Manual - User enters values manually',
                        disabled: isLastManualColumn,
                      },
                      {
                        value: 'ai',
                        label: 'AI - Values generated by AI prompt',
                      },
                    ]}
                  />
                </div>
              )}
            </form.AppField>

            {/* Description */}
            <form.AppField name="description">
              {(field) => <field.TextArea label="Description" rows={2} />}
            </form.AppField>
            {/* AI Prompt - Only show for AI columns */}
            <form.Subscribe selector={(state) => state.values.type}>
              {(type) =>
                type === 'ai' && (
                  <form.AppField name="aiPrompt">
                    {(field) => (
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <Label>AI Prompt</Label>
                          <p className="text-xs text-muted-foreground">
                            Define how AI should generate values for this column
                          </p>
                        </div>
                        <field.TextArea label="" rows={3} />
                      </div>
                    )}
                  </form.AppField>
                )
              }
            </form.Subscribe>

            {/* Output Type - Only show for AI columns */}
            <form.Subscribe selector={(state) => state.values.type}>
              {(type) =>
                type === 'ai' && (
                  <form.AppField name="outputType">
                    {(field) => (
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <Label>Output Type</Label>
                          <p className="text-xs text-muted-foreground">
                            How should AI format the response?
                          </p>
                        </div>
                        <field.Select
                          label=""
                          placeholder="Select output type"
                          values={[
                            {
                              value: 'text',
                              label: '📝 Text - Brief single-line text',
                            },
                            {
                              value: 'long_text',
                              label: '📄 Long Text - Multi-paragraph text',
                            },
                            {
                              value: 'single_select',
                              label:
                                '🏷️ Single Select - One choice from options',
                            },
                            {
                              value: 'multi_select',
                              label: '🏷️ Multi Select - Multiple choices',
                            },
                            { value: 'date', label: '📅 Date - Date values' },
                          ]}
                        />
                      </div>
                    )}
                  </form.AppField>
                )
              }
            </form.Subscribe>

            {/* Output Type Config - Conditional based on outputType */}
            <form.Subscribe
              selector={(state) => ({
                type: state.values.type,
                outputType: state.values.outputType,
              })}
            >
              {({ type, outputType }) =>
                type === 'ai' && (
                  <>
                    {/* Options for single_select and multi_select */}
                    {(outputType === 'single_select' ||
                      outputType === 'multi_select') && (
                      <form.AppField name="options">
                        {(field) => (
                          <div className="grid gap-2">
                            <div className="space-y-1">
                              <Label>Options (Optional)</Label>
                              <p className="text-xs text-muted-foreground">
                                Enter options separated by commas or new lines
                                (e.g. "Low, Medium, High"). Leave empty for
                                free-form AI suggestions.
                              </p>
                            </div>
                            <field.TextArea label="" rows={3} />
                          </div>
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
                                label: 'YYYY-MM-DD (2024-01-15)',
                              },
                              {
                                value: 'MM/DD/YYYY',
                                label: 'MM/DD/YYYY (01/15/2024)',
                              },
                              {
                                value: 'DD/MM/YYYY',
                                label: 'DD/MM/YYYY (15/01/2024)',
                              },
                              {
                                value: 'MMM DD, YYYY',
                                label: 'MMM DD, YYYY (Jan 15, 2024)',
                              },
                              {
                                value: 'MMMM DD, YYYY',
                                label: 'MMMM DD, YYYY (January 15, 2024)',
                              },
                            ]}
                          />
                        )}
                      </form.AppField>
                    )}
                  </>
                )
              }
            </form.Subscribe>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLastColumn || isLastManualColumn}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
