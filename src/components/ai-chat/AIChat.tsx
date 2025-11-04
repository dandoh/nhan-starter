'use client'

import { Suspense } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Sparkles } from 'lucide-react'
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
import { serverFnGetConversationsForContext } from '@/serverFns/conversations'

interface AIChatProps {
  context: Exclude<ConversationContext, { type: 'general' }>
  title?: string
  description?: string
  quickActions?: string[]
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
}: AIChatProps) {
  // Use oRPC's auto-generated query hook with Suspense
  const { data: conversations } = useSuspenseQuery({
    queryKey: ['conversations', context],
    queryFn: () =>
      serverFnGetConversationsForContext({ data: { context, limit: 10 } }),
  })

  // Use the most recent conversation (first in the array)
  const conversation = conversations[0]
  const existingMessages = transformMessages(conversation.messages || [])

  const queryClient = useQueryClient()

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

// Exported component with Suspense boundary
export function AiChat(props: AIChatProps) {
  return (
    <Suspense fallback={<AiChatLoading />}>
      <AiChatInternal {...props} />
    </Suspense>
  )
}
