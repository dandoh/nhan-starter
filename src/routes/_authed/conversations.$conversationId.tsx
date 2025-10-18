import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { UIMessage } from 'ai'
import { client } from '@/orpc/client'
import { MessageSquare, User, Bot, Send, AlertCircle, Plus } from 'lucide-react'

const useEffectOnce = (fn: () => void) => {
  const ref = useRef(false)
  useEffect(() => {
    if (!ref.current) {
      fn()
      ref.current = true
    }
  }, [])
}

export const Route = createFileRoute('/_authed/conversations/$conversationId')({
  component: ConversationPage,
  ssr: false,
  loader: async ({ params }) => {
    const conversation = await client.getConversation({
      conversationId: params.conversationId,
    })
    return { conversation }
  },
})

function ConversationPage() {
  const navigate = useNavigate()
  const { conversationId } = Route.useParams()
  const { conversation } = Route.useLoaderData()
  // Convert database messages to UIMessage format
  const existingMessages: UIMessage[] = conversation.messages || []

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    id: conversationId,
    transport: new DefaultChatTransport({
      api: `/api/chat/${conversationId}`,
    }),
    messages: existingMessages,
  })

  useEffectOnce(() => {
    console.log('trigger this')
    if (status === 'ready' && existingMessages.length === 1) {
      sendMessage()
    }
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return

    sendMessage({ text: input.trim() })
    setInput('')
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    handleSendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startNewConversation = () => {
    navigate({ to: '/new-chat' })
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              {conversation?.title || 'AI Conversation'}
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {conversationId.slice(0, 8)}...
            </Badge>
          </div>
          <Button onClick={startNewConversation} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </CardHeader>
      </Card>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Start a conversation
                </h3>
                <p className="text-muted-foreground text-center">
                  Send a message to begin chatting with the AI assistant
                </p>
              </CardContent>
            </Card>
          )}

          {messages.map((message: UIMessage) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start gap-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className={
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                {/* Message Content */}
                <Card
                  className={
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : ''
                  }
                >
                  <CardContent className="p-3">
                    {message.parts.map((part, partIndex) => {
                      if (part.type === 'text') {
                        return (
                          <div
                            key={partIndex}
                            className="text-sm whitespace-pre-wrap break-words"
                          >
                            {part.text}
                          </div>
                        )
                      }
                      return null
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-3xl">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <Separator />
      <Card className="rounded-none border-x-0 border-b-0">
        <CardContent className="p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleFormSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  className="min-h-[60px] max-h-[200px] resize-none"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
