import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { X } from 'lucide-react'
import type { EditableCellProps } from '../output-type-registry'
import type { MultiSelectConfig } from '../output-types'

export function MultiSelectEditableCell({
  value,
  config,
  onChange,
  onBlur,
  onFocus,
}: EditableCellProps<MultiSelectConfig, { values: string[] }>) {
  const values = value?.values || []
  const options = config?.options || []
  const maxSelections = config?.maxSelections
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleChange = (newValues: string[]) => {
    onChange({ values: newValues })
  }

  const handleToggle = (optionValue: string) => {
    const newValues = values.includes(optionValue)
      ? values.filter((v) => v !== optionValue)
      : maxSelections && values.length >= maxSelections
        ? values
        : [...values, optionValue]
    handleChange(newValues)
  }

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newValues = values.filter((v) => v !== optionValue)
    handleChange(newValues)
  }

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.value.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (options.length > 0) {
    // Use Command component for searchable multi-select
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            className="h-full w-full cursor-pointer py-1 px-2 text-sm flex items-center gap-1 flex-wrap min-h-[28px] flex-1"
            onFocus={onFocus}
            onClick={() => setIsOpen(true)}
          >
            {values.length > 0 ? (
              values.map((val, index) => {
                return (
                  <Badge
                    variant="secondary"
                    key={index}
                    className="text-sm flex items-center gap-1 pr-1"
                  >
                    {val}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(val, e)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRemove(val, e as any)
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })
            ) : (
              <span className="text-muted-foreground">Select...</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0"
          align="start"
          onInteractOutside={() => {
            setIsOpen(false)
            setSearchQuery('')
            if (onBlur) onBlur()
          }}
        >
          <Command>
            <CommandInput
              placeholder="Search options..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = values.includes(option.value)
                  const isDisabled = Boolean(
                    maxSelections &&
                      values.length >= maxSelections &&
                      !isSelected,
                  )

                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => {
                        if (!isDisabled) {
                          handleToggle(option.value)
                        }
                      }}
                      disabled={isDisabled}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          if (!isDisabled) {
                            handleToggle(option.value)
                          }
                        }}
                        disabled={isDisabled}
                        className="mr-2"
                      />
                      <span>{option.value}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  } else {
    // Use comma-separated input for free-form
    const commaSeparatedValue = values.join(', ')
    return (
      <Input
        value={commaSeparatedValue}
        onChange={(e) => {
          const newValues = e.target.value
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0)
          handleChange(newValues)
        }}
        onBlur={onBlur}
        onFocus={onFocus}
        className="h-full w-full border-none !bg-transparent dark:!bg-transparent hover:!bg-transparent dark:hover:!bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm flex-1"
        placeholder="Comma-separated values"
      />
    )
  }
}

