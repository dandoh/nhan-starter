import { os } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'

const todos = [
  { id: 1, name: 'Get groceries' },
  { id: 2, name: 'Buy a new phone' },
  { id: 3, name: 'Finish the project' },
]

// Public route - no authentication required
export const listTodos = os.input(z.object({})).handler(() => {
  return todos
})

export const addTodo = os
  .use(authMiddleware)
  .input(z.object({ name: z.string() }))
  .handler(({ input, context }) => {
    const newTodo = { id: todos.length + 1, name: input.name }
    todos.push(newTodo)
    return newTodo
  })
