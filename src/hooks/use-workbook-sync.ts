import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createWorkbookLocalSyncDb,
  type WorkbookCollections,
} from '@/lib/ai-table/collections'
import type { Workbook, WorkbookBlock } from '@/db/schema'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { createCollection, eq, useLiveQuery } from '@tanstack/react-db'
import { client, orpc } from '@/orpc/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { chain } from 'lodash-es'

/**
 * Hook to manage a workbook's blocks and markdowns with local collections
 */
export function useWorkbookSync(initialWorkbook: Workbook) {
  const singletonWorkbookCollectionRef = useRef(
    createCollection(
      queryCollectionOptions<Workbook>({
        queryClient,
        queryKey: ['workbooks', initialWorkbook.id],
        queryFn: async () => {
          return [
            await client.workbooks.get({
              workbookId: initialWorkbook.id,
            }),
          ]
        },
        getKey: (workbook) => workbook.id,
        onUpdate: async ({ transaction }) => {
          const { original, modified } = transaction.mutations[0]
          const { mode = 'localOnly' } = transaction.mutations[0].metadata as {
            mode?: 'localOnly' | 'sync'
          }

          if (mode === 'localOnly') {
            singletonWorkbookCollectionRef.current.utils.writeUpdate(modified)
            return {
              refetch: false,
            }
          }


          await client.workbooks.update({
            workbookId: original.id,
            name: modified.name,
            description: modified.description,
            blockOrder: modified.blockOrder,
          })
        },
      }),
    ),
  )

  // Create collections once and store in ref for stable reference
  const blocksCollectionRef = useRef(
    createCollection(
      queryCollectionOptions<WorkbookBlock>({
        queryClient,
        queryKey: ['workbooks', initialWorkbook.id, 'blocks'],
        queryFn: async () => {
          const blocks = await client.workbooks.getBlocks({
            workbookId: initialWorkbook.id,
          })
          return blocks
        },
        getKey: (block) => block.id,
        onInsert: async ({ transaction }) => {
          for (const mutation of transaction.mutations) {
            const { modified: newBlock } = mutation
            await client.workbooks.createBlock({
              id: newBlock.id,
              workbookId: initialWorkbook.id,
              type: newBlock.type,
              initialMarkdown: newBlock.type === 'markdown' ? '' : undefined,
              tableName:
                newBlock.type === 'table' ? 'Untitled Table' : undefined,
            })
          }
        },
        onDelete: async ({ transaction }) => {
          for (const mutation of transaction.mutations) {
            const { original } = mutation
            await client.workbooks.deleteBlock({
              blockId: original.id,
            })
          }
        },
      }),
    ),
  )

  const { data: workbook = initialWorkbook } = useLiveQuery((q) =>
    q.from({ workbook: singletonWorkbookCollectionRef.current }).findOne(),
  )

  const { data: blocks = [] } = useLiveQuery((q) =>
    q.from({ block: blocksCollectionRef.current }),
  )

  const sortedBlocks = useMemo(() => {
    return blocks.sort((a, b) => {
      return (
        (workbook.blockOrder[a.id] ?? 999) - (workbook.blockOrder[b.id] ?? 999)
      )
    })
  }, [blocks, workbook.blockOrder])

  const addBlock = (blockType: 'markdown' | 'table', position: number) => {
    const newBlockId = crypto.randomUUID()
    const newOrder = chain(sortedBlocks)
      .map((block, index) => {
        return { blockId: block.id, index }
      })
      .map(({ blockId, index }) => {
        return { blockId, index: index >= position ? index + 1 : index }
      })
      .concat({ blockId: newBlockId, index: position })
      .map(({ blockId, index }) => {
        return [blockId, index]
      })
      .fromPairs()
      .value()

    blocksCollectionRef.current.insert({
      id: newBlockId,
      workbookId: initialWorkbook.id,
      type: blockType,
    } as WorkbookBlock)

    singletonWorkbookCollectionRef.current.update(
      initialWorkbook.id,
      { metadata: { mode: 'sync' } },
      (draft) => {
        draft.blockOrder = newOrder
      },
    )
  }

  const deleteBlock = (blockId: string) => {
    blocksCollectionRef.current.delete(blockId)
  }

  const changeWorkbookDescription = (
    description: string,
    mode: 'localOnly' | 'sync' = 'localOnly',
  ) => {
    singletonWorkbookCollectionRef.current.update(
      initialWorkbook.id,
      { metadata: { mode } },
      (draft) => {
        draft.description = description
      },
    )
  }

  const changeWorkbookName = (
    name: string,
    mode: 'localOnly' | 'sync' = 'localOnly',
  ) => {
    singletonWorkbookCollectionRef.current.update(
      initialWorkbook.id,
      { metadata: { mode } },
      (draft) => {
        draft.name = name
      },
    )
  }

  return {
    workbook,
    sortedBlocks,
    addBlock,
    deleteBlock,
    changeWorkbookDescription,
    changeWorkbookName,
  }
}
