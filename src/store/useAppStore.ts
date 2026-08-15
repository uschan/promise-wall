import { create } from "zustand"
import type { Lang, PromiseItem } from "../lib/types"

type AppState = {
  lang: Lang
  promises: PromiseItem[]
  selectedId: string | null
  composeOpen: boolean
  setLang: (lang: Lang) => void
  setPromises: (promises: PromiseItem[]) => void
  select: (id: string | null) => void
  setComposeOpen: (open: boolean) => void
  addPromise: (p: PromiseItem) => void
  removePromise: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  promises: [],
  selectedId: null,
  composeOpen: false,
  setLang: (lang) => set({ lang }),
  setPromises: (promises) => set({ promises }),
  select: (selectedId) => set({ selectedId }),
  setComposeOpen: (composeOpen) => set({ composeOpen }),
  addPromise: (p) => set((s) => ({ promises: [p, ...s.promises] })),
  removePromise: (id) =>
    set((s) => ({
      promises: s.promises.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
}))
