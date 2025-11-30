import { os, streamToEventIterator, type } from '@orpc/server'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { authMiddleware } from '../middleware/auth'
import { deepseek } from '@ai-sdk/deepseek'
import { createTool } from '@orpc/ai-sdk'
import dashboard from './dashboard'
import { User } from 'better-auth'

const createDashboardToolForUser = (user: User) =>
  createTool(dashboard.create, {
    context: {
      user,
    },
  })

export const chat = os
  .use(authMiddleware)
  .input(type<{ chatId: string; messages: UIMessage[] }>())
  .handler(({ input, context }) => {
    const result = streamText({
      model: deepseek('deepseek-chat'),
      system: 'You are a help4ful AI assistant. Be concise and helpful.',
      messages: convertToModelMessages(input.messages),
      tools: {
        createDashboard: createDashboardToolForUser(context.user),
      },
    })

    return streamToEventIterator(result.toUIMessageStream())
  })

export default {
  chat,
}
