import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSidebar } from '@/components/ui/sidebar'
import { AiTable } from '@/components/ai-table/AiTable'
import { AiChat, AiChatFloatingButton } from '@/components/ai-chat/AiChat'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TopNav, AppPageWrapper } from '@/components/AppPageWrapper'
import {
  tablesCollection,
  updateTableName,
  updateTableDescription,
} from '@/lib/ai-table/collections'
import { eq, useLiveQuery } from '@tanstack/react-db'

export const Route = createFileRoute('/_authed/tables/$tableId')({
  ssr: false,
  component: TableEditorPage,
})

function TableEditorPage() {
  const { tableId } = Route.useParams()
  const { setOpen: setSidebarOpen } = useSidebar()
  const [isChatMinimized, setIsChatMinimized] = useState(false)
  const { data: table } = useLiveQuery((q) =>
    q
      .from({ table: tablesCollection })
      .where(({ table }) => eq(table.id, tableId))
      .findOne(),
  )

  // Collapse sidebar on mount
  useEffect(() => {
    setSidebarOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleNameChange = (value: string) => {
    if (!table) return
    if (value !== table.name) {
      updateTableName({ tableId: table.id, name: value })
    }
  }

  const handleDescriptionChange = (value: string) => {
    if (!table) return
    const descriptionValue = value || null
    updateTableDescription({
      tableId: table.id,
      description: descriptionValue,
    })
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Tables', href: '/tables' },
          { label: table?.name ?? 'Untitled' },
        ]}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table content */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex-1 overflow-hidden p-1">

            <div className="h-full flex flex-col space-y-2">
              {/* Name and Description Section */}
              {/* <div className="shrink-0 space-y-2 ">
                <div className="">
                  <Input
                    value={table?.name || ''}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Table name"
                    className="!text-xl font-semibold h-auto px-1 py-2 border-none shadow-none 
                    hover:ring-primary/50 hover:ring-1 
                    focus-visible:ring-primary focus-visible:ring-1"
                  />
                </div> */}
              {/* <div className="">
                  <Input
                    value={table?.description || ''}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="Add a description..."
                    className="px-1 border-none shadow-none 
                    hover:ring-primary/50 hover:ring-1 hover:ring-inset
                    overflow-hidden
                    focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-inset min-h-0 text-foreground/80"
                  />
                </div> */}
              {/* </div> */}
              {/* Table Block - scrollable */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <AiTable tableId={tableId} />
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div
          className={`flex flex-col shrink-0 bg-card border-l border-border transition-all duration-300 ease-in-out overflow-hidden ${
            isChatMinimized
              ? 'w-0 opacity-0 pointer-events-none'
              : 'w-96 opacity-100'
          }`}
        >
          <AiChat
            context={{ type: 'table', tableId }}
            title="Table AI Assistant"
            description="Ask me to help with your table. I can add columns, analyze data, or perform calculations."
            quickActions={[
              'Add a new column',
              'Analyze sentiment trends',
              'Calculate statistics',
              'Export to CSV',
            ]}
            onMinimize={() => setIsChatMinimized(true)}
            minimized={isChatMinimized}
          />
        </div>

        {/* Floating button when minimized */}
        <div
          className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${
            isChatMinimized
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
          }`}
        >
          <AiChatFloatingButton onClick={() => setIsChatMinimized(false)} />
        </div>
      </div>
    </AppPageWrapper>
  )
}
