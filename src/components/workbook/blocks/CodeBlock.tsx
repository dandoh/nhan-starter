import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface CodeBlockProps {
  language: 'python' | 'sql' | 'javascript'
  code: string
  output?: string
  onChange?: (code: string) => void
}

export function CodeBlock({ language, code, output, onChange }: CodeBlockProps) {
  const [localCode, setLocalCode] = useState(code)

  const languageColors = {
    python: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    sql: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    javascript: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  }

  return (
    <div className="divide-y divide-border">
      {/* Code input */}
      <div className="relative">
        <div className="absolute right-4 top-4 z-10">
          <Badge variant="outline" className={languageColors[language]}>
            {language.toUpperCase()}
          </Badge>
        </div>
        <Textarea
          value={localCode}
          onChange={(e) => {
            setLocalCode(e.target.value)
            onChange?.(e.target.value)
          }}
          placeholder={`Write ${language} code here...`}
          className="min-h-[120px] resize-none border-none font-mono text-sm focus-visible:ring-0 p-6"
          spellCheck={false}
        />
      </div>

      {/* Output area */}
      {output && (
        <div className="bg-muted/30 p-6">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Output
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}

