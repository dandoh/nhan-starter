# Multiple Output Types Implementation Plan

## Phase 0: Setup

**Install shadcn Badge component (if not already present):**
```bash
pnpx shadcn@latest add badge
```

## Phase 1: Database Schema

**Update `src/db/schema.ts`:**

- Add `outputType` enum field to `aiTableColumns`: `'text' | 'long_text' | 'single_select' | 'multi_select' | 'date'`
- Extend `config` type definition to include:
- `options?: Array<{ value: string; color?: string }>` (for select types)
- `maxSelections?: number` (for multi-select)
- `dateFormat?: string` (for date type - arbitrary format string)
- Keep existing `aiPrompt?: string`
- Default `outputType` to `'text'` for backward compatibility

**Note:** Migration will be handled manually by user

## Phase 2: Type Definitions & Validation

**Create `src/lib/ai-table/output-types.ts`:**

- Define TypeScript types for each output type config
- Export `OutputTypeConfig` union type
- Create Zod schemas for validating each output type
- Add utility functions for formatting/parsing cell values

**Update `src/orpc/router/ai-tables.ts`:**

- Update `createColumn` input schema to include `outputType` and extended `config`
- Update `updateColumn` input schema similarly
- Add validation logic to ensure config matches outputType
- Update type definitions in collections

## Phase 3: AI Computation Updates

**Update `src/inngest/functions/compute-ai-cell.ts`:**

- Switch from `generateText` to `generateObject` with proper Zod schemas for each output type
- Define response schemas based on outputType:
- `single_select`: `z.object({ value: z.string() })`
- `multi_select`: `z.object({ values: z.array(z.string()) })`
- `text`: `z.object({ value: z.string() })`
- `long_text`: `z.object({ value: z.string() })`
- `date`: `z.object({ value: z.string() })` with date format instruction
- For select types: Include available options in prompt (if provided)
- For multi_select: Add max selections constraint to prompt
- Structured output makes validation automatic and more reliable
- For invalid responses, set error status with helpful message

## Phase 4: Frontend - Utilities

**Create `src/lib/ai-table/formatters.ts`:**

- Date formatting utilities (short/long format)
- Cell value parsers for each output type
- Value validators
- Helper functions to map option colors to shadcn Badge variants

## Phase 5: Frontend - Column Editor

**Update `src/components/ai-table/ColumnHeaderPopover.tsx`:**

- Add "Output Type" dropdown (only visible for AI columns)
- Show type-specific options conditionally:
- Single/Multi Select: Simple text input for comma-separated options (optional)
- Multi Select: Add "Max Selections" number input
- Date: Add format radio buttons (short/long)
- Update form submission to include outputType and extended config
- Add helpful descriptions for each output type

## Phase 6: Frontend - Cell Rendering

**Update `src/components/ai-table/TableCell.tsx`:**

- Query column's `outputType` and `config`
- Render based on output type:
- `single_select`: Display value using shadcn `Badge` component with appropriate variant
- `multi_select`: Parse JSON array, display as multiple shadcn `Badge` components with wrapping
- `text`: Keep current single-line `Input` for manual, plain text for AI
- `long_text`: For AI columns show multi-line div with scroll, for manual show `Textarea`
- `date`: Parse and format date with calendar icon
- Keep existing compute status indicators (spinner, error)

## Phase 7: Testing & Polish

**Test each output type:**

- Create test table with one column of each type
- Verify AI computation works correctly
- Test validation for invalid AI responses
- Verify manual columns still work (manual columns remain text-only as per spec)
- Test editing column types and options
- Check theme color usage (no hardcoded colors)

**Polish:**

- Add tooltips explaining output types
- Ensure responsive design for multi-select pills
- Verify backward compatibility (existing columns default to text type)
- Add visual feedback for invalid option values

## Key Files to Modify

1. `src/db/schema.ts` - Add outputType field and extend config type
2. `src/lib/ai-table/output-types.ts` - New file for types and validation
3. `src/lib/ai-table/formatters.ts` - New file for formatting utilities and Badge variant mapping
4. `src/orpc/router/ai-tables.ts` - Update create/update column schemas
5. `src/inngest/functions/compute-ai-cell.ts` - Add type-aware prompts and validation
6. `src/components/ai-table/ColumnHeaderPopover.tsx` - Add output type selector with simple options input
7. `src/components/ai-table/TableCell.tsx` - Type-aware rendering using shadcn Badge component
8. `src/lib/ai-table/collections.ts` - Update TypeScript types if needed

## Notes

- Manual columns remain text-only (no output types) as per spec
- Cell values stored as text; multi-select stored as JSON array string
- No type changing after creation in MVP (would require data migration)
- Free-form mode (no predefined options) supported for select types
- All colors use shadcn theme colors (no hardcoded hex values)
- Using shadcn's Badge component for displaying select values (no custom Badge component needed)
