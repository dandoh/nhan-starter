// Example router - replace with your own routes
import { os } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import { todos, expenses } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

// Example: Simple hello world route
export const hello = os
  .use(authMiddleware)
  .input(z.object({ name: z.string().optional() }))
  .handler(({ input, context }) => {
    return {
      message: `Hello, ${input.name || context.user.name || 'World'}!`,
      userId: context.user.id,
    }
  })

// Todo CRUD operations
export const getTodos = os
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const userTodos = await db
      .select()
      .from(todos)
      .where(eq(todos.userId, context.user.id))
      .orderBy(desc(todos.createdAt))
    
    return userTodos
  })

export const createTodo = os
  .use(authMiddleware)
  .input(
    z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    await db.insert(todos).values({
      id: nanoid(),
      title: input.title,
      description: input.description,
      userId: context.user.id,
      completed: false,
    })
    
    return { success: true }
  })

export const updateTodo = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string(),
      title: z.string().min(1, 'Title is required').optional(),
      description: z.string().optional(),
      completed: z.boolean().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const { id, ...updates } = input
    
    await db
      .update(todos)
      .set(updates)
      .where(and(eq(todos.id, id), eq(todos.userId, context.user.id)))
    
    return { success: true }
  })

export const deleteTodo = os
  .use(authMiddleware)
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    await db
      .delete(todos)
      .where(and(eq(todos.id, input.id), eq(todos.userId, context.user.id)))
    
    return { success: true }
  })

// Expense CRUD operations
export const getExpenses = os
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const userExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, context.user.id))
      .orderBy(desc(expenses.date))
    
    return userExpenses
  })

export const createExpense = os
  .use(authMiddleware)
  .input(
    z.object({
      amount: z.number().positive('Amount must be greater than 0'),
      description: z.string().min(1, 'Description is required'),
      category: z.string().optional(),
      date: z.string().datetime().or(z.date()),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    await db.insert(expenses).values({
      id: nanoid(),
      amount: input.amount.toString(),
      description: input.description,
      category: input.category,
      date: typeof input.date === 'string' ? new Date(input.date) : input.date,
      notes: input.notes,
      userId: context.user.id,
    })
    
    return { success: true }
  })

export const updateExpense = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string(),
      amount: z.number().positive('Amount must be greater than 0').optional(),
      description: z.string().min(1, 'Description is required').optional(),
      category: z.string().optional(),
      date: z.string().datetime().or(z.date()).optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ input, context }) => {
    const { id, date, amount, ...updates } = input
    
    const updateData: any = { ...updates }
    if (amount !== undefined) {
      updateData.amount = amount.toString()
    }
    if (date !== undefined) {
      updateData.date = typeof date === 'string' ? new Date(date) : date
    }
    
    await db
      .update(expenses)
      .set(updateData)
      .where(and(eq(expenses.id, id), eq(expenses.userId, context.user.id)))
    
    return { success: true }
  })

export const deleteExpense = os
  .use(authMiddleware)
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, input.id), eq(expenses.userId, context.user.id)))
    
    return { success: true }
  })

export default {
  hello,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
}
