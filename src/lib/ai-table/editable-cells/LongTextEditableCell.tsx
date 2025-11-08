import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import type { EditableCellProps } from '../output-type-registry'

export function LongTextEditableCell({
  value,
  onChange,
  onBlur,
  onFocus,
}: EditableCellProps) {
  const displayValue = value || ''
  return (
    <Textarea
      value={displayValue}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onFocus={onFocus}
      className="h-full w-full border-none !bg-transparent dark:!bg-transparent hover:!bg-transparent dark:hover:!bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm resize-none flex-1"
      placeholder=""
      rows={3}
    />
  )
}

