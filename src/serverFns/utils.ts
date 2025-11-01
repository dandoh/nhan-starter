import type * as z from 'zod'

// ============================================================================
// Type Helpers for Server Functions
// ============================================================================

type FunctionDef<TInput extends z.ZodTypeAny | undefined, TOutput> = TInput extends z.ZodTypeAny
  ? {
      input: TInput
      handler: (params: {
        data: z.infer<TInput>
        context: { user: { id: string } }
      }) => Promise<TOutput>
    }
  : {
      handler: (params: { context: { user: { id: string } } }) => Promise<TOutput>
    }

/**
 * Define a server function with type-safe input validation and handler
 * 
 * @example
 * // With input validation
 * const myFunctionDef = defineFunction({
 *   input: z.object({ name: z.string() }),
 *   handler: async ({ data, context }) => {
 *     // data is typed as { name: string }
 *     return { success: true }
 *   }
 * })
 * 
 * @example
 * // Without input validation
 * const myFunctionDef = defineFunction({
 *   handler: async ({ context }) => {
 *     // Only context is available
 *     return { success: true }
 *   }
 * })
 */
function defineFunction<TInput extends z.ZodTypeAny, TOutput>(def: {
  input: TInput
  handler: (params: {
    data: z.infer<TInput>
    context: { user: { id: string } }
  }) => Promise<TOutput>
}): FunctionDef<TInput, TOutput>

function defineFunction<TOutput>(def: {
  handler: (params: { context: { user: { id: string } } }) => Promise<TOutput>
}): FunctionDef<undefined, TOutput>

function defineFunction<TInput extends z.ZodTypeAny | undefined, TOutput>(
  def: FunctionDef<TInput, TOutput>
): FunctionDef<TInput, TOutput> {
  return def
}

export { defineFunction }
export type { FunctionDef }

