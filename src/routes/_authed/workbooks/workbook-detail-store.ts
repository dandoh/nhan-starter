import { create, useStore } from 'zustand'
import { useMemo } from 'react'

type BlockType = 'table' | 'chart' | 'document'

interface WorkbookDetailState {
  isChatMinimized: boolean
  createBlockDialogType: BlockType | null
  setChatMinimized: (minimized: boolean) => void
  setCreateBlockDialogType: (blockType: BlockType | null) => void
}

type WorkbookDetailStore = ReturnType<typeof createWorkbookDetailStore>

export function createWorkbookDetailStore() {
  return create<WorkbookDetailState>((set) => ({
    isChatMinimized: false,
    createBlockDialogType: null,
    setChatMinimized: (minimized) => set({ isChatMinimized: minimized }),
    setCreateBlockDialogType: (blockType) =>
      set({ createBlockDialogType: blockType }),
  }))
}
