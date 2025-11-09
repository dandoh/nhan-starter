import { create } from 'zustand'

type BlockType = 'table' | 'chart' | 'document'

interface WorkbookDetailState {
  isChatMinimized: boolean
  createBlockPopoverType: BlockType | null
  setChatMinimized: (minimized: boolean) => void
  setCreateBlockPopoverType: (blockType: BlockType | null) => void
}

export function createWorkbookDetailStore() {
  return create<WorkbookDetailState>((set) => ({
    isChatMinimized: false,
    createBlockPopoverType: null,
    setChatMinimized: (minimized) => set({ isChatMinimized: minimized }),
    setCreateBlockPopoverType: (blockType) =>
      set({ createBlockPopoverType: blockType }),
  }))
}
