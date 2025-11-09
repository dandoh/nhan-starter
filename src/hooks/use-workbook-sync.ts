import { useRef } from 'react'
import {
  createWorkbookCollections,
  type WorkbookCollections,
} from '@/lib/workbooks/collections'

export function useWorkbookSync(workbookId: string) {
  // Create collections once and store in ref for stable reference
  const collectionsRef = useRef<ReturnType<
    typeof createWorkbookCollections
  > | null>(null)
  if (!collectionsRef.current) {
    collectionsRef.current = createWorkbookCollections(workbookId)
  }
  const collections = collectionsRef.current

  return collections
}
