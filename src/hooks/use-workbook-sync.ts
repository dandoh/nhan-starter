import { useRef } from 'react'
import {
  createWorkbookCollections,
  type WorkbookCollections,
} from '@/lib/ai-table/collections'

/**
 * Hook to manage a workbook's blocks and markdowns with local collections
 */
export function useWorkbookSync(workbookId: string): WorkbookCollections {
  // Create collections once and store in ref for stable reference
  const collectionsRef = useRef<WorkbookCollections | null>(null)
  if (!collectionsRef.current) {
    collectionsRef.current = createWorkbookCollections(workbookId)
  }

  return collectionsRef.current
}

