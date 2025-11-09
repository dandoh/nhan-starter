import React from 'react'
import { Input } from '@/components/ui/input'
import type { EditableCellProps } from '../output-type-registry'
import type { TextConfig } from '../output-types'

export function TextEditableCell({
  value,
  onChange,
  onBlur,
  onFocus,
}: EditableCellProps<TextConfig, { value: string }>) {
  const displayValue = value?.value || ''
  
  const handleChange = (newValue: string) => {
    onChange({ value: newValue })
  }

  return (
    <Input
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="h-full w-full border-none !bg-transparent dark:!bg-transparent hover:!bg-transparent dark:hover:!bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm flex-1"
      placeholder=""
    />
  )
}

