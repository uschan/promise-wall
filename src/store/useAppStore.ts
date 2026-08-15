import { create } from "zustand"
import type { Lang, Profile, PromiseItem } from "../lib/types"

type Toast = { msg: string; key: number }

type AppState = {
  lang: Lang
  promises: PromiseItem[]
  selectedId: string | null
  composeOpen: boolean
  editingId: string | null
  activeCategory: string | null
  searchQuery: string
  userId: string | null
  profile: Profile | null
  authOpen: boolean
  toast: Toast | null
  setLang: (lang: Lang) => void
  setPromises: (promises: PromiseItem[]) => void
  select: (id: string | null) => void
  openCreate: () => void
  openEdit: (id: string) => void
  closeCompose: () => void
  addPromise: (p: PromiseItem) => void
  updatePromise: (p: PromiseItem) => void
  removePromise: (id: string) => void
  setAuth: (userId: string | null, profile: Profile | null) => void
  setAuthOpen: (open: boolean) => void
  showToast: (msg: string) => void
  clearToast: () => void
  setActiveCategory: (cat: string | null) => void
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  promises: [],
  selectedId: null,
  composeOpen: false,
  editingId: null,
  activeCategory: null,
  searchQuery: "",
  userId: null,
  profile: null,
  authOpen: false,
  toast: null,
  setLang: (lang) => set({ lang }),
  setPromises: (promises) => set({ promises }),
  select: (selectedId) => set({ selectedId }),
  openCreate: () => set({ composeOpen: true, editingId: null }),
  openEdit: (editingId) => set({ composeOpen: true, editingId }),
  closeCompose: () => set({ composeOpen: false, editingId: null }),
  addPromise: (p) => set((s) => ({ promises: [p, ...s.promises] })),
  updatePromise: (p) =>
    set((s) => ({ promises: s.promises.map((x) => (x.id === p.id ? p : x)) })),
  removePromise: (id) =>
    set((s) => ({
      promises: s.promises.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  setAuth: (userId, profile) => set({ userId, profile }),
  setAuthOpen: (authOpen) => set({ authOpen }),
  showToast: (msg) => set((s) => ({ toast: { msg, key: (s.toast?.key ?? 0) + 1 } })),
  clearToast: () => set({ toast: null }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
