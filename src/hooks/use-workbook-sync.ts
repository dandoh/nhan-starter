import { useEffect, useMemo, useRef, useState } from 'react'
import type { Workbook, WorkbookBlock } from '@/db/schema'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { createCollection, eq, useLiveQuery } from '@tanstack/react-db'
import { chain } from 'lodash-es'
import {
  serverFnCreateBlock,
  serverFnDeleteBlock as deleteBlockServer,
  serverFnGetBlocks,
  serverFnGetWorkbook,
  serverFnUpdateWorkbook,
} from '@/serverFns/workbooks'

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
            await serverFnGetWorkbook({
              data: {
                workbookId: initialWorkbook.id,
              },
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

          console.log('serverFnUpdateWorkbook', modified)

          await serverFnUpdateWorkbook({
            data: {
              workbookId: original.id,
              name: modified.name,
              description: modified.description,
              blockOrder: modified.blockOrder,
            },
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
          const blocks = await serverFnGetBlocks({
            data: {
              workbookId: initialWorkbook.id,
            },
          })
          return blocks
        },
        getKey: (block) => block.id,
        onInsert: async ({ transaction }) => {
          for (const mutation of transaction.mutations) {
            const { modified: newBlock } = mutation
            await serverFnCreateBlock({
              data: {
                id: newBlock.id,
                workbookId: initialWorkbook.id,
                type: newBlock.type,
                initialMarkdown: newBlock.type === 'markdown' ? '' : undefined,
                tableName:
                  newBlock.type === 'table' ? 'Untitled Table' : undefined,
              },
            })
          }
        },
        onDelete: async ({ transaction }) => {
          for (const mutation of transaction.mutations) {
            const { original } = mutation
            await deleteBlockServer({
              data: {
                blockId: original.id,
              },
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

  const updateWorkbook = (
    updater: (draft: Workbook) => void,
    mode: 'localOnly' | 'sync' = 'localOnly',
  ) => {
    singletonWorkbookCollectionRef.current.update(
      initialWorkbook.id,
      { metadata: { mode } },
      updater,
    )
  }

  const onWorkbookDescriptionChange = (description: string) => {
    updateWorkbook((draft) => {
      draft.description = description
    })
  }
  const onWorkbookNameChange = (name: string) => {
    updateWorkbook((draft) => {
      draft.name = name
    })
  }
  const onWorkbookDescriptionBlur = () => {
    updateWorkbook((draft) => {}, 'sync')
  }
  const onWorkbookNameBlur = () => {
    updateWorkbook((draft) => {}, 'sync')
  }

  return {
    workbook,
    sortedBlocks,
    addBlock,
    deleteBlock,
    onWorkbookDescriptionChange,
    onWorkbookNameChange,
    onWorkbookDescriptionBlur,
    onWorkbookNameBlur,
  }
}
