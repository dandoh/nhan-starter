'use client'

import { createContext, useContext, useRef, useCallback } from 'react'

export interface AIChatHandle {
  focus: () => void
  setInput: (value: string | ((oldValue: string) => string)) => void
}

type AIChatContextValue = {
  chatRef: React.MutableRefObject<AIChatHandle | null>
  setChatRef: (handle: AIChatHandle) => void
}

const AIChatContext = createContext<AIChatContextValue | null>(null)

export function AIChatProvider({ children }: { children: React.ReactNode }) {
  const chatRef = useRef<AIChatHandle | null>(null)

  const setChatRef = useCallback((handle: AIChatHandle) => {
    chatRef.current = handle
  }, [])

  return (
    <AIChatContext.Provider value={{ chatRef, setChatRef }}>
      {children}
    </AIChatContext.Provider>
  )
}

export function useAIChatContext() {
  const context = useContext(AIChatContext)
  if (!context) {
    throw new Error('useAIChatContext must be used within AIChatProvider')
  }
  return context
}

/**
 * Hook to get the AI chat ref and focus method
 * Use this anywhere in your app to focus the AI chat input
 */
export function useAIChat() {
  const { chatRef } = useAIChatContext()

  return {
    focus: () => {
      chatRef.current?.focus()
    },
    setInput: (value: string | ((oldValue: string) => string)) => {
      chatRef.current?.setInput(value)
    },
  }
}
