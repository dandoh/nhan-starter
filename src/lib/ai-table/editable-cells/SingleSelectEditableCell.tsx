import React from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EditableCellProps } from '../output-type-registry'
import type { SingleSelectConfig } from '../output-types'

export function SingleSelectEditableCell({
  value,
  config,
  onChange,
  onBlur,
  onFocus,
}: EditableCellProps<SingleSelectConfig, { value: string }>) {
  const displayValue = value?.value || ''
  const options = config?.options || []

  const handleChange = (newValue: string) => {
    onChange({ value: newValue })
  }

  if (options.length > 0) {
    // Use Select dropdown for predefined options
    return (
      <Select
        value={displayValue || ''}
        onValueChange={handleChange}
        onOpenChange={(open) => {
          if (!open && onBlur) onBlur()
        }}
      >
        <SelectTrigger
          onFocus={onFocus}
          className="h-full w-full border-none !bg-transparent dark:!bg-transparent hover:!bg-transparent dark:hover:!bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm data-[placeholder]:text-muted-foreground flex-1"
        >
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  } else {
    // Use Input for free-form text
    return (
      <Input
        value={displayValue || ''}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        className="h-full w-full border-none !bg-transparent dark:!bg-transparent hover:!bg-transparent dark:hover:!bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm flex-1"
        placeholder=""
      />
    )
  }
}

