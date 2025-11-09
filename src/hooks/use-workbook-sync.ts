import { useRef } from 'react'
import {
  createWorkbookCollections,
  type WorkbookCollections,
} from '@/lib/workbooks/collections'


export function useWorkbookSync(workbookId: string): WorkbookCollections {
  // Create collections once and store in ref for stable reference
  const collectionsRef = useRef<WorkbookCollections | null>(null)
  if (!collectionsRef.current) {
    collectionsRef.current = createWorkbookCollections(workbookId)
  }
  const collections = collectionsRef.current


  return collections
}

