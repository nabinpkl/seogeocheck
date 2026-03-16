import { create } from 'zustand'

// This is sample store, will use it later
interface AuditState {
  url: string
  isAuditing: boolean
  setUrl: (url: string) => void
  setAuditing: (isAuditing: boolean) => void
}

export const useAuditStore = create<AuditState>((set) => ({
  url: '',
  isAuditing: false,
  setUrl: (url) => set({ url }),
  setAuditing: (isAuditing) => set({ isAuditing }),
}))
