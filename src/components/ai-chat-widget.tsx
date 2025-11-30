"use client"

import { useState } from "react"
import { MessageSquareIcon, XIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChat } from "@ai-sdk/react"
import { eventIteratorToUnproxiedDataStream } from "@orpc/client"
import { orpcClient } from "@/orpc/client"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import type { ToolUIPart } from "ai"

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [chatId] = useState(() => crypto.randomUUID())

  const { messages, sendMessage, status } = useChat({
    transport: {
      async sendMessages(options) {
        return eventIteratorToUnproxiedDataStream(
          await orpcClient.aiChat.chat(
            {
              chatId: options.chatId ?? chatId,
              messages: options.messages,
            },
            { signal: options.abortSignal }
          )
        )
      },
      reconnectToStream() {
        throw new Error("Unsupported")
      },
    },
  })

  const [inputValue, setInputValue] = useState("")

  const handleSubmit = () => {
    if (!inputValue.trim() || status !== "ready") return

    sendMessage({ text: inputValue })
    setInputValue("")
  }

  // Render message parts including text and tool invocations
  const renderMessageParts = (message: (typeof messages)[number]) => {
    if (!message.parts || message.parts.length === 0) {
      return null
    }

    return message.parts.map((part, index) => {
      if (part.type === "text") {
        return (
          <MessageResponse key={index}>
            {part.text}
          </MessageResponse>
        )
      }

      // Handle tool invocation parts (type starts with "tool-")
      if (part.type.startsWith("tool-")) {
        const toolPart = part as ToolUIPart
        // Extract tool name from type (e.g., "tool-createDashboard" -> "createDashboard")
        const toolName = part.type.replace("tool-", "")
        return (
          <Tool key={index} className="group">
            <ToolHeader
              title={toolName}
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
    })
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 size-14 rounded-full p-0 shadow-lg"
          size="icon"
        >
          <MessageSquareIcon className="size-6" />
          <span className="sr-only">Open AI Chat</span>
        </Button>
      )}

      {/* Floating Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[50vh] min-h-[400px] w-[480px] flex-col rounded-lg border bg-card shadow-xl">
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2">
              <MessageSquareIcon className="size-4 text-muted-foreground" />
              <span className="font-medium text-sm">AI Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setIsOpen(false)}
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Chat Content */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Messages Area */}
            <Conversation className="flex-1">
              <ConversationContent className="gap-4 p-4">
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    icon={<MessageSquareIcon className="size-8" />}
                    title="How can I help?"
                    description="Ask me anything about your data or tasks"
                  />
                ) : (
                  <>
                    {messages.map((message) => (
                      <Message key={message.id} from={message.role}>
                        <MessageContent>
                          {renderMessageParts(message)}
                        </MessageContent>
                      </Message>
                    ))}
                    {status === "streaming" && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2Icon className="size-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </>
                )}
              </ConversationContent>
            </Conversation>

            {/* Input Area */}
            <div className="shrink-0 border-t p-3">
              <PromptInput
                onSubmit={handleSubmit}
                className="w-full"
              >
                <PromptInputTextarea
                  placeholder="Type your message..."
                  className="min-h-10 max-h-32"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <PromptInputFooter>
                  <PromptInputTools />
                  <PromptInputSubmit
                    status={status === "ready" ? undefined : status}
                    disabled={!inputValue.trim() || status !== "ready"}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
