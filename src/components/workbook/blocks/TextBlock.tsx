import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

interface TextBlockProps {
  title?: string
  content: string
  onChange?: (content: string) => void
  onTitleChange?: (title: string) => void
}

export function TextBlock({
  title,
  content,
  onChange,
  onTitleChange,
}: TextBlockProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (!isEditing && !content && !title) {
    return (
      <div
        className="cursor-text p-8 text-center text-muted-foreground"
        onClick={() => setIsEditing(true)}
      >
        Click to add text...
      </div>
    )
  }

  return (
    <div className="p-6">
      {isEditing ? (
        <div className="space-y-3">
          <Input
            placeholder="Heading (optional)"
            value={title || ''}
            onChange={(e) => onTitleChange?.(e.target.value)}
            className="font-semibold text-lg border-none px-0 focus-visible:ring-0"
          />
          <Textarea
            placeholder="Write your text here..."
            value={content}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={() => setIsEditing(false)}
            className="min-h-[100px] resize-none border-none px-0 focus-visible:ring-0"
            autoFocus
          />
        </div>
      ) : (
        <div
          className="cursor-text space-y-2"
          onClick={() => setIsEditing(true)}
        >
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {content}
          </p>
        </div>
      )}
    </div>
  )
}

