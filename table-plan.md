# AI-Powered Table Implementation Plan

## Overview

Build an AI-powered table application with TanStack DB, Inngest job processing, and Anthropic Claude integration. Users can create tables, add columns with AI prompts, and automatically populate cell values.

## Phase 1: Database Schema & Migrations ✅

**Goal**: Set up PostgreSQL schema for tables, columns, records, and cells

### Tasks:
1. **Update `src/db/schema.ts`** - Add new tables:
   - `ai_tables` - User's table instances
   - `ai_table_columns` - Column definitions with AI prompts
   - `ai_table_records` - Rows in tables
   - `ai_table_cells` - Individual cell data with compute status
   - Add indexes for efficient queries (recordId, columnId, computeStatus, updatedAt)

2. **Generate and run migration**:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

## Phase 2: Backend API (oRPC Endpoints)

**Goal**: Create all API endpoints for CRUD operations and delta syncing

### Create `src/orpc/router/ai-tables.ts`:

1. **Table Management**:
   - `listTables` - Get user's tables
   - `createTable` - Create new table with initial "Main" column
   - `getTable` - Get table details
   - `deleteTable` - Delete table

2. **Column Operations**:
   - `createColumn` - Add column (creates pending cells for existing records)
   - `getColumns` - Get columns for table
   - `updateColumn` - Update column name/prompt
   - `deleteColumn` - Delete column

3. **Record Operations**:
   - `createRecord` - Add row (creates empty cells for all columns)
   - `getRecords` - Get records for table
   - `deleteRecord` - Delete row

4. **Cell Operations**:
   - `updateCell` - Update cell value (with version for optimistic locking)
   - `getCells` - Get all cells for table (initial load)
   - `getTableUpdates` - Delta sync endpoint (fetch changes since cursor)

5. **Export router** in `src/orpc/router/index.ts`

## Phase 3: Inngest Setup & AI Job Processing

**Goal**: Configure Inngest and create AI cell generation function

### Tasks:

1. **Install Inngest**:
   ```bash
   pnpm add inngest
   ```

2. **Add to `src/env.ts`**:
   - `INNGEST_EVENT_KEY` (optional for local dev)
   - `INNGEST_SIGNING_KEY` (for production)

3. **Create `src/inngest/client.ts`**:
   - Initialize Inngest client

4. **Create `src/inngest/functions/compute-ai-cells.ts`**:
   - Listen to `ai/compute.trigger` event
   - Fetch cell data with column prompt
   - Call Anthropic Claude API with prompt + context
   - Update cell with result or error
   - Handle retries (3 attempts)

5. **Create `src/inngest/index.ts`**:
   - Export all functions

6. **Create API route `src/routes/api/inngest.ts`**:
   - Inngest webhook endpoint for local/production

7. **Update Inngest trigger in oRPC**:
   - When `createColumn` is called, trigger Inngest for pending cells
   - When `updateCell` on main column, trigger dependent AI columns

## Phase 4: Frontend Collections & Sync

**Goal**: Set up TanStack DB collections and incremental sync

### Tasks:

1. **Create `src/lib/ai-table/collections.ts`**:
   - Define TypeScript types for Cell, Column, Record, Table
   - Create `createTableCollections(tableId)` factory
   - Use `queryCollectionOptions` for each collection
   - Implement `onUpdate`, `onInsert` handlers for optimistic updates

2. **Create `src/hooks/use-table-sync.ts`**:
   - Poll `getTableUpdates` every 3 seconds
   - Use `collection.upsert()` to apply delta updates
   - Track cursor (last sync timestamp)
   - Handle version conflicts (don't overwrite newer local edits)

3. **Create `src/hooks/use-tables-list.ts`**:
   - Query collection for tables list
   - Handle create/delete operations

## Phase 5: UI Components

**Goal**: Build table list page and table editor with TanStack Table

### Tasks:

1. **Create `src/routes/_authed/tables/index.tsx`**:
   - List all user's tables
   - "Create New Table" button with dialog
   - Cards/list view with table name, created date
   - Click to navigate to `/tables/$tableId`

2. **Create `src/routes/_authed/tables/$tableId.tsx`**:
   - Use `useTableSync(tableId)` hook
   - Build TanStack Table with lazy cell queries
   - "Add Column" dialog (name, optional AI prompt)
   - "Add Row" button
   - Column headers with type indicators (✨ for AI)

3. **Create `src/components/ai-table/TableCell.tsx`**:
   - Memoized cell component
   - Individual `useLiveQuery` per cell
   - Show spinner for `computeStatus === 'computing'`
   - Editable input for regular columns
   - Read-only display for AI-generated columns
   - Error state display

4. **Create `src/components/ai-table/AddColumnDialog.tsx`**:
   - Form with column name input
   - Toggle for "AI Generated" type
   - If AI: text area for prompt
   - Select dependency columns (which columns to use as context)

5. **Update `src/components/Header.tsx`**:
   - Add navigation link to `/tables`

## Phase 6: Testing & Polish

**Goal**: Test end-to-end flow and add UX improvements

### Tasks:

1. **Manual Testing**:
   - Create table
   - Add rows
   - Add regular column, edit values
   - Add AI column with prompt
   - Verify Inngest job runs
   - Verify cells update automatically
   - Test multi-user scenario (open 2 browsers)

2. **UX Polish**:
   - Add loading states
   - Add empty states (no tables, no rows)
   - Add toast notifications for errors
   - Add confirmation dialogs for delete operations
   - Debounce cell input updates (500ms)

3. **Error Handling**:
   - Handle API failures gracefully
   - Show retry button for failed AI generations
   - Handle Inngest webhook failures

## Phase 7: Documentation

**Goal**: Document setup and usage

### Create `docs/AI_TABLES.md`:
- Architecture overview
- How to add new AI column types
- Inngest job monitoring
- Database schema diagram
- API endpoint documentation

## Key Files to Create/Modify

### Database
- `src/db/schema.ts` (modify) ✅

### Backend
- `src/orpc/router/ai-tables.ts` (new)
- `src/orpc/router/index.ts` (modify)

### Inngest
- `src/inngest/client.ts` (new)
- `src/inngest/functions/compute-ai-cells.ts` (new)
- `src/inngest/index.ts` (new)
- `src/routes/api/inngest.ts` (new)

### Frontend Collections
- `src/lib/ai-table/collections.ts` (new)
- `src/hooks/use-table-sync.ts` (new)
- `src/hooks/use-tables-list.ts` (new)

### UI
- `src/routes/_authed/tables/index.tsx` (new)
- `src/routes/_authed/tables/$tableId.tsx` (new)
- `src/components/ai-table/TableCell.tsx` (new)
- `src/components/ai-table/AddColumnDialog.tsx` (new)

### Config
- `src/env.ts` (modify)
- `.env.local` (add INNGEST keys)

## Architecture Overview

### Data Flow

```
User adds AI column
    ↓
Frontend: Creates column + cells (status: 'pending')
    ↓
Backend: Triggers Inngest event for each cell
    ↓
Inngest: Processes AI generation, updates cell in DB
    ↓
Frontend polling: Detects cell.updatedAt changed
    ↓
TanStack Query refetches → Collection updates
    ↓
Live Queries re-run → UI updates (shows generated value)
```

### Frontend Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Browser)              │
│  ┌───────────────────────────────────┐  │
│  │      TanStack DB (Collections)    │  │
│  │  - tables, columns, records       │  │
│  │  - cells (with live queries)      │  │
│  │  - Sub-ms queries                 │  │
│  │  - Optimistic updates             │  │
│  └───────────────────────────────────┘  │
│         ↕ (mutations)    ↓ (polling)    │
└─────────────────────────────────────────┘
              ↕                  ↓
┌─────────────────────────────────────────┐
│         Backend (Server)                │
│  ┌─────────────┐    ┌───────────────┐  │
│  │ oRPC API    │    │  Delta Sync   │  │
│  │ (mutations) │    │  (updates)    │  │
│  └─────────────┘    └───────────────┘  │
│         ↕                               │
│  ┌─────────────────────────────────┐   │
│  │    PostgreSQL Database          │   │
│  │    - ai_tables                  │   │
│  │    - ai_table_columns           │   │
│  │    - ai_table_records           │   │
│  │    - ai_table_cells             │   │
│  └─────────────────────────────────┘   │
│                ↑                        │
│  ┌─────────────────────────────────┐   │
│  │    Inngest (AI Jobs)            │   │
│  │    - Computes cell values       │   │
│  │    - Updates cells              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Database Schema

```
ai_tables
  ├── id (uuid, PK)
  ├── userId (text, FK -> users.id)
  ├── name (varchar)
  └── timestamps

ai_table_columns
  ├── id (uuid, PK)
  ├── tableId (uuid, FK -> ai_tables.id)
  ├── name (varchar)
  ├── type (text: 'text' | 'ai_generated')
  ├── config (jsonb: { aiPrompt?, dependsOn? })
  └── position (int)

ai_table_records
  ├── id (uuid, PK)
  ├── tableId (uuid, FK -> ai_tables.id)
  ├── position (int)
  └── timestamps

ai_table_cells
  ├── id (uuid, PK)
  ├── recordId (uuid, FK -> ai_table_records.id)
  ├── columnId (uuid, FK -> ai_table_columns.id)
  ├── value (text)
  ├── computeStatus (text: 'idle' | 'pending' | 'computing' | 'completed' | 'error')
  ├── computeError (text)
  ├── computeJobId (text)
  ├── version (int) -- for optimistic locking
  └── timestamps
  └── UNIQUE(recordId, columnId)
```

## Next Steps

After Phase 1 completion, run:

```bash
pnpm db:generate
pnpm db:migrate
```

Then proceed to Phase 2: Backend API implementation.

