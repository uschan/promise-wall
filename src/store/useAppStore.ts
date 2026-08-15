import { create } from "zustand"
import type { Lang, PromiseItem } from "../lib/types"

type AppState = {
  lang: Lang
  promises: PromiseItem[]
  selectedId: string | null
  setLang: (lang: Lang) => void
  setPromises: (promises: PromiseItem[]) => void
  select: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  promises: [],
  selectedId: null,
  setLang: (lang) => set({ lang }),
  setPromises: (promises) => set({ promises }),
  select: (selectedId) => set({ selectedId }),
}))
