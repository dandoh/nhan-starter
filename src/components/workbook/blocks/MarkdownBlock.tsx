import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Textarea } from '@/components/ui/textarea'
import { serverFnGetMarkdown, serverFnUpdateMarkdown } from '@/serverFns/workbooks'

interface MarkdownBlockProps {
  markdownId: string
}

export function MarkdownBlock({ markdownId }: MarkdownBlockProps) {
  // Fetch markdown data
  const { data: markdown } = useQuery(
    // orpc.workbooks.getMarkdown.queryOptions({
    //   input: { markdownId },
    // }),
    {
      queryKey: ['workbooks', 'markdowns', markdownId],
      queryFn: async () => {
        const markdown = await serverFnGetMarkdown({
          data: {
            markdownId,
          },
        })
        return markdown
      },
    },
  )

  const [content, setContent] = useState(markdown?.content || '')

  // Sync with markdown data when it loads
  useEffect(() => {
    if (markdown) {
      setContent(markdown.content)
    }
  }, [markdown])

  const updateMarkdownMutation = useMutation(
    {
      mutationFn: async () => {
        await serverFnUpdateMarkdown({
          data: {
            markdownId,
            content,
          },
        })
      },
    },
  )

  const handleBlur = () => {
    if (markdown && content !== markdown.content) {
      updateMarkdownMutation.mutate()
    }
  }

  if (!markdown) {
    return (
      <div className="w-full p-6 text-muted-foreground">
        Loading markdown...
      </div>
    )
  }

  return (
    <div className="w-full">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Start typing..."
        className="min-h-[200px] resize-y border-none shadow-none px-0 focus-visible:ring-0"
      />
    </div>
  )
}
