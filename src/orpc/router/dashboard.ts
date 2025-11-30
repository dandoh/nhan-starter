/**
 * Dashboard ORPC routes - CRUD for user dashboards
 */
import { os } from '@orpc/server'
import * as z from 'zod'
import { db } from '@/db'
import { dashboards } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { AI_SDK_TOOL_META_SYMBOL } from '@orpc/ai-sdk'

/**
 * List all dashboards for the current user
 */
export const list = os
  .use(authMiddleware)
  .input(z.object({}).optional())
  .handler(async ({ context }) => {
    const items = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.userId, context.user.id))
      .orderBy(desc(dashboards.updatedAt))

    return { items }
  })

/**
 * Get a single dashboard by ID (must belong to current user)
 */
export const get = os
  .use(authMiddleware)
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const [dashboard] = await db
      .select()
      .from(dashboards)
      .where(
        and(
          eq(dashboards.id, input.id),
          eq(dashboards.userId, context.user.id),
        ),
      )
      .limit(1)

    if (!dashboard) {
      throw new Error('Dashboard not found')
    }

    return { dashboard }
  })

/**
 * Create a new dashboard
 */
export const create = os
  .use(authMiddleware)
  .meta({
    [AI_SDK_TOOL_META_SYMBOL]: {
      name: 'createDashboard',
    },
  })
  .input(
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      symbols: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ input, context }) => {
    const [dashboard] = await db
      .insert(dashboards)
      .values({
        userId: context.user.id,
        name: input.name,
        description: input.description,
        symbols: input.symbols,
      })
      .$returningId()

    return { id: dashboard.id }
  })

/**
 * Update an existing dashboard
 */
export const update = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(1000).nullish(),
      symbols: z.array(z.string()).optional(),
      rangeStart: z.number().nullish(),
      rangeEnd: z.number().nullish(),
    }),
  )
  .handler(async ({ input, context }) => {
    const { id, ...updates } = input

    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {}
    if (updates.name !== undefined) cleanUpdates.name = updates.name
    if (updates.description !== undefined)
      cleanUpdates.description = updates.description
    if (updates.symbols !== undefined) cleanUpdates.symbols = updates.symbols
    if (updates.rangeStart !== undefined)
      cleanUpdates.rangeStart = updates.rangeStart
    if (updates.rangeEnd !== undefined) cleanUpdates.rangeEnd = updates.rangeEnd

    if (Object.keys(cleanUpdates).length === 0) {
      return { success: true }
    }

    const [result] = await db
      .update(dashboards)
      .set(cleanUpdates)
      .where(and(eq(dashboards.id, id), eq(dashboards.userId, context.user.id)))

    if (result.affectedRows === 0) {
      throw new Error('Dashboard not found or not owned by user')
    }

    return { success: true }
  })

/**
 * Delete a dashboard
 */
export const remove = os
  .use(authMiddleware)
  .input(z.object({ id: z.string() }))
  .handler(async ({ input, context }) => {
    const [result] = await db
      .delete(dashboards)
      .where(
        and(
          eq(dashboards.id, input.id),
          eq(dashboards.userId, context.user.id),
        ),
      )

    if (result.affectedRows === 0) {
      throw new Error('Dashboard not found or not owned by user')
    }

    return { success: true }
  })

export default {
  list,
  get,
  create,
  update,
  remove,
}
