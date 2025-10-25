'use client'

import { useState } from 'react'
import { Sparkles, MessageSquareIcon } from 'lucide-react'
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ai-elements/message'
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
import { Loader } from '@/components/ai-elements/loader'
import { Response } from '@/components/ai-elements/response'

interface AIChatProps {
  tableId: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  avatar: string
  name: string
}

export function AIChat({ tableId: _tableId }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready')

  const handleSubmit = async (message: PromptInputMessage) => {
    // TODO: Use tableId to scope AI operations to this specific table
    const text = message.text?.trim()
    if (!text) return

    setStatus('submitted')

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      avatar: '/avatar-placeholder.png',
      name: 'You',
    }

    setMessages((prev) => [...prev, userMessage])

    // Simulate streaming
    setTimeout(() => {
      setStatus('streaming')

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'AI response will be implemented here. This demonstrates the ai-elements components working together.',
        avatar: '/ai-avatar.png',
        name: 'AI Assistant',
      }

      setMessages((prev) => [...prev, aiMessage])

      setTimeout(() => {
        setStatus('ready')
      }, 1000)
    }, 500)
  }

  const quickActions = [
    'Add a new column',
    'Analyze sentiment trends',
    'Calculate P/E ratio',
    'Export to CSV',
  ].slice(0, 4)

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit({ text: suggestion })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation Area */}
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              }
              title="AI Assistant"
              description="Ask me to help with your table. I can add columns, analyze data, or perform calculations."
            />
          ) : (
            <>
              {messages.map((message) => (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    <Response>{message.content}</Response>
                  </MessageContent>
                  <MessageAvatar src={message.avatar} name={message.name} />
                </Message>
              ))}

              {status === 'streaming' && (
                <Message from="assistant">
                  <MessageContent>
                    <div className="flex items-center gap-2">
                      <Loader size={16} />
                      <span className="text-muted-foreground text-sm">
                        Thinking...
                      </span>
                    </div>
                  </MessageContent>
                  <MessageAvatar src="/ai-avatar.png" name="AI Assistant" />
                </Message>
              )}
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

      {/* Input Area */}
      <div>
        <div className="p-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Ask AI to help..." />
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
