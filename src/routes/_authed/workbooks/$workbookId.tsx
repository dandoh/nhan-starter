import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { WorkbookBlock, type Block } from '@/components/workbook/WorkbookBlock'
import { AddBlockButton } from '@/components/workbook/AddBlockButton'
import { TextBlock } from '@/components/workbook/blocks/TextBlock'
import { CodeBlock } from '@/components/workbook/blocks/CodeBlock'
import { TableBlock } from '@/components/workbook/blocks/TableBlock'
import { AIChat } from '@/components/ai-chat/AIChat'
import { Input } from '@/components/ui/input'
import type { BlockType } from '@/components/workbook/WorkbookBlock'

export const Route = createFileRoute('/_authed/workbooks/$workbookId')({
  component: WorkbookDetailPage,
})

// Mock data
const initialBlocks: Block[] = [
  {
    id: '1',
    type: 'table',
    title: 'Orders Data',
    content: {
      columns: ['id', 'order_id', 'status', 'created_at', 'menu_item', 'quantity', 'category'],
      rows: [
        [1, 8942, 'completed', '2023-01-01T13:05:00', 'Shrimp and Pork Siu Mai', 18, 'Dumplings'],
        [2, 10982, 'completed', '2019-02-25T19:40:54', 'Cilantro Har Gow', 16, 'Dumplings'],
        [3, 8441, 'completed', '2022-06-27T09:16:04', 'Seafood Gyoza', 25, 'Dumplings'],
        [4, 11916, 'completed', '2022-05-03T14:05:03', 'Boiled pork dumplings', 21, 'Dumplings'],
        [5, 11606, 'completed', '2020-08-23T11:13:00', 'Egg Yolk Bun', 33, 'Sweets'],
      ],
    },
  },
  {
    id: '2',
    type: 'text',
    title: "What's our most popular dessert?",
    content: "Let's use some Python to analyze our above SQL result.",
  },
  {
    id: '3',
    type: 'code',
    content: {
      language: 'python',
      code: `only_sweets = orders[orders['CATEGORY'] == "Sweets"]
popular_dessert = only_sweets["MENU_ITEM"].mode()[0]
print(f"The most popular dessert is the {popular_dessert}")`,
      output: 'The most popular dessert is the Green Tea & Milk Bun',
    },
  },
]

function WorkbookDetailPage() {
  const { workbookId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [workbookName, setWorkbookName] = useState('Q4 Restaurant Analysis')
  const [isEditingName, setIsEditingName] = useState(false)

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
  }, [setSidebarOpen])

  const addBlock = (type: BlockType, afterIndex: number) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: type === 'code' || type === 'sql' 
        ? { language: type === 'sql' ? 'sql' : 'python', code: '', output: '' }
        : type === 'table'
        ? { columns: [], rows: [] }
        : '',
    }

    const newBlocks = [...blocks]
    newBlocks.splice(afterIndex + 1, 0, newBlock)
    setBlocks(newBlocks)
  }

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId))
  }

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks(
      blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    )
  }

  const runBlock = (blockId: string) => {
    // Mock execution
    console.log('Running block:', blockId)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-14 items-center gap-4 border-b border-border px-6">
        {isEditingName ? (
          <Input
            value={workbookName}
            onChange={(e) => setWorkbookName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditingName(false)
            }}
            className="h-8 max-w-md border-none px-0 font-semibold focus-visible:ring-0"
            autoFocus
          />
        ) : (
          <h1
            className="cursor-pointer font-semibold hover:text-primary"
            onClick={() => setIsEditingName(true)}
          >
            {workbookName}
          </h1>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Workbook blocks */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-12 py-8">
            <div className="space-y-1">
              {blocks.map((block, index) => (
                <div key={block.id}>
                  <WorkbookBlock
                    block={block}
                    onDelete={deleteBlock}
                    onRun={runBlock}
                  >
                    {block.type === 'text' && (
                      <TextBlock
                        title={block.title}
                        content={block.content}
                        onChange={(content) =>
                          updateBlock(block.id, { content })
                        }
                        onTitleChange={(title) =>
                          updateBlock(block.id, { title })
                        }
                      />
                    )}
                    {(block.type === 'code' || block.type === 'sql') && (
                      <CodeBlock
                        language={block.content.language}
                        code={block.content.code}
                        output={block.content.output}
                        onChange={(code) =>
                          updateBlock(block.id, {
                            content: { ...block.content, code },
                          })
                        }
                      />
                    )}
                    {block.type === 'table' && (
                      <TableBlock data={block.content} title={block.title} />
                    )}
                  </WorkbookBlock>

                  <AddBlockButton
                    onAddBlock={(type) => addBlock(type, index)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-96 border-l border-border bg-card flex flex-col">
          <AIChat
            context={{ type: 'workbook', workbookId }}
            title="Workbook AI Assistant"
            description="Ask questions about your data, get help with analysis, or generate insights from your workbook."
            quickActions={[
              'Analyze the data in my tables',
              'Summarize key insights',
              'Generate a report',
              'What trends do you see?',
            ]}
          />
        </div>
      </div>
    </div>
  )
}

