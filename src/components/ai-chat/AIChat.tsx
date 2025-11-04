'use client'

import { Suspense } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Sparkles, Plus, X } from 'lucide-react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent } from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'
import { Suggestion } from '@/components/ai-elements/suggestion'
import { Response } from '@/components/ai-elements/response'
import { Loader } from '@/components/ai-elements/loader'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import type { ToolUIPart } from 'ai'
import type { ConversationContext } from '@/db/schema'
import { serverFnCreateConversation } from '@/serverFns/conversations'
import { Button } from '@/components/ui/button'
import { orpcQuery } from '@/orpc/client'

interface AIChatProps {
  context: Exclude<ConversationContext, { type: 'general' }>
  title?: string
  description?: string
  quickActions?: string[]
  onNewChat?: () => void
  onMinimize?: () => void
  minimized?: boolean
}

// Helper function to transform messages to UI format
function transformMessages(messages: any[]): UIMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant' | 'system',
    parts: msg.parts as any,
    metadata: msg.metadata as any,
  }))
}

// Loading fallback component
function AiChatLoading() {
  return (
    <div className="flex flex-col h-full items-center justify-center p-4">
      <Loader size={24} />
      <p className="text-sm text-muted-foreground mt-2">Initializing chat...</p>
    </div>
  )
}

// Internal component that uses Suspense
function AiChatInternal({
  context,
  title = 'AI Assistant',
  description = 'Ask me to help with your data. I can analyze, generate insights, or perform calculations.',
  quickActions = [
    'Analyze the data',
    'Summarize key insights',
    'What trends do you see?',
    'Generate a report',
  ],
  onNewChat,
  onMinimize,
  minimized = false,
}: AIChatProps) {
  const queryClient = useQueryClient()

  // Use oRPC's auto-generated query hook with Suspense
  const { data: conversations } = useSuspenseQuery(
    orpcQuery.conversations.getForContext.queryOptions({
      input: { context, limit: 10 },
    }),
  )

  // Use the most recent conversation (first in the array)
  const conversation = conversations[0]
  const existingMessages = transformMessages(conversation.messages || [])

  const handleNewChat = async () => {
    try {
      await serverFnCreateConversation({
        data: {
          context,
        },
      })
      // Invalidate conversations query to refetch
      queryClient.invalidateQueries({
        queryKey: orpcQuery.conversations.getForContext.queryKey({
          input: { context, limit: 10 },
        }),
      })
      onNewChat?.()
    } catch (error) {
      console.error('Failed to create new conversation:', error)
    }
  }

  const { messages, sendMessage, status, error } = useChat({
    id: conversation.id,
    transport: new DefaultChatTransport({
      api: `/api/chat/${conversation.id}`,
    }),
    messages: existingMessages,
    onFinish: () => {
      // Refresh columns, records, and cells after AI chat finishes (for table context)
      if (context.type === 'table') {
        queryClient.invalidateQueries({
          queryKey: ['ai-tables', context.tableId, 'columns'],
        })
        queryClient.invalidateQueries({
          queryKey: ['ai-tables', context.tableId, 'records'],
        })
        queryClient.invalidateQueries({
          queryKey: ['ai-tables', context.tableId, 'cells'],
        })
      }
    },
  })

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text?.trim()
    if (!text) return

    sendMessage({ text })
  }

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit({ text: suggestion })
  }

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Topbar */}
      <div className="flex items-center justify-end gap-1 p-2 shrink-0 w-full">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNewChat}
          className="h-7 w-7"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onMinimize}
          className="h-7 w-7"
          aria-label="Minimize chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Conversation Area */}
      <Conversation className="flex-1 min-h-0 ">
        <ConversationContent className="scrollbar scrollbar-track-transparent scrollbar-thumb-transparent hover:scrollbar-thumb-interactive">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              }
              title={title}
              description={description}
            />
          ) : (
            <>
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent variant="flat">
                    {message.parts.map((part, index) => {
                      // Handle text parts
                      if (part.type === 'text') {
                        return <Response key={index}>{part.text}</Response>
                      }

                      // Handle tool calls
                      if (part.type.startsWith('tool-')) {
                        const toolPart = part as ToolUIPart
                        // Auto-open tools that are completed or errored
                        // const shouldDefaultOpen =
                        //   toolPart.state === 'output-available' ||
                        //   toolPart.state === 'output-error'

                        return (
                          <Tool key={index} open={false}>
                            <ToolHeader
                              type={toolPart.type}
                              state={toolPart.state}
                            />
                            <ToolContent>
                              <ToolInput input={toolPart.input} />
                              <ToolOutput
                                output={toolPart.output}
                                errorText={toolPart.errorText}
                              />
                            </ToolContent>
                          </Tool>
                        )
                      }

                      return null
                    })}
                  </MessageContent>
                </Message>
              ))}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Quick Actions - Show only when no messages */}
      {messages.length === 0 && (
        <div className="p-4 space-y-2">
          <div className="flex flex-col gap-2">
            {quickActions.map((action) => (
              <Suggestion
                key={action}
                suggestion={action}
                onClick={handleSuggestionClick}
                className="justify-start w-fit"
                variant="outline"
                size="sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-2">
          <div className="p-2 bg-destructive/10 text-destructive text-xs rounded">
            Error: {error.message}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div>
        <div className="p-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask AI to help..."
                disabled={isLoading}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {/* <span className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </span> */}
              </PromptInputTools>
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  )
}

// Floating button component for minimized state
export function AiChatFloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      size="icon-lg"
      variant="outline"
      className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 border-primary bg-card hover:bg-card"
      aria-label="Open AI chat"
    >
      <Sparkles className="h-6 w-6 text-primary" />
    </Button>
  )
}

// Exported component with Suspense boundary
export function AiChat(props: AIChatProps) {
  return (
    <Suspense fallback={<AiChatLoading />}>
      <AiChatInternal {...props} />
    </Suspense>
  )
}
