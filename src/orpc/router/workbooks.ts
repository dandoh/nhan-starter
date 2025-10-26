import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import { workbooks } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// ============================================================================
// Workbook Management
// ============================================================================

/**
 * List all workbooks for the authenticated user
 */
export const listWorkbooks = os
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const userWorkbooks = await db.query.workbooks.findMany({
      where: eq(workbooks.userId, context.user.id),
      orderBy: [desc(workbooks.updatedAt)],
    })

    return userWorkbooks
  })

/**
 * Create a new workbook
 */
export const createWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const [newWorkbook] = await db
      .insert(workbooks)
      .values({
        userId: context.user.id,
        name: input.name,
        description: input.description,
      })
      .returning()

    return newWorkbook
  })

/**
 * Get workbook details
 */
export const getWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    return workbook
  })

/**
 * Update workbook name and description
 */
export const updateWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    const [updated] = await db
      .update(workbooks)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      })
      .where(eq(workbooks.id, input.workbookId))
      .returning()

    return updated
  })

/**
 * Delete a workbook
 */
export const deleteWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership and delete
    const result = await db
      .delete(workbooks)
      .where(
        and(
          eq(workbooks.id, input.workbookId),
          eq(workbooks.userId, context.user.id),
        ),
      )
      .returning()

    if (result.length === 0) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    return { success: true }
  })

