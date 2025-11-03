import React from 'react'
import { Input } from '@/components/ui/input'
import type { EditableCellProps } from '../output-type-registry'

export function TextEditableCell({
  value,
  onChange,
  onBlur,
  onFocus,
}: EditableCellProps) {
  const displayValue = value || ''
  return (
    <Input
      value={displayValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="h-full w-full border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm"
      placeholder=""
    />
  )
}

