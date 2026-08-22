import { create } from "zustand"
import type { Category, Lang, Profile, PromiseItem } from "../lib/types"

type Toast = { msg: string; key: number }

type AppState = {
  lang: Lang
  promises: PromiseItem[]
  selectedId: string | null
  composeOpen: boolean
  activeCategory: string | null
  view: "all" | "mine" | "saved"
  searchQuery: string
  userId: string | null
  profile: Profile | null
  authOpen: boolean
  modOpen: boolean
  allViewOpen: boolean
  placing: PromiseItem | null
  categories: Category[] | null
  toast: Toast | null
  menuOpen: boolean
  setLang: (lang: Lang) => void
  setPromises: (promises: PromiseItem[]) => void
  select: (id: string | null) => void
  openCreate: () => void
  closeCompose: () => void
  addPromise: (p: PromiseItem) => void
  removePromise: (id: string) => void
  setAuth: (userId: string | null, profile: Profile | null) => void
  setAuthOpen: (open: boolean) => void
  setModOpen: (open: boolean) => void
  setAllViewOpen: (open: boolean) => void
  setPlacing: (p: PromiseItem | null) => void
  setCategories: (categories: Category[] | null) => void
  showToast: (msg: string) => void
  clearToast: () => void
  setMenuOpen: (open: boolean) => void
  setActiveCategory: (cat: string | null) => void
  setView: (view: "all" | "mine" | "saved") => void
  setSearchQuery: (q: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  promises: [],
  selectedId: null,
  composeOpen: false,
  activeCategory: null,
  view: "all",
  searchQuery: "",
  userId: null,
  profile: null,
  authOpen: false,
  modOpen: false,
  allViewOpen: false,
  placing: null,
  categories: null,
  toast: null,
  menuOpen: false,
  setLang: (lang) => set({ lang }),
  setPromises: (promises) => set({ promises }),
  select: (selectedId) => set({ selectedId }),
  openCreate: () => set({ composeOpen: true }),
  closeCompose: () => set({ composeOpen: false }),
  addPromise: (p) => set((s) => ({ promises: [p, ...s.promises] })),
  removePromise: (id) =>
    set((s) => ({
      promises: s.promises.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  setAuth: (userId, profile) => set({ userId, profile }),
  setAuthOpen: (authOpen) => set({ authOpen }),
  setModOpen: (modOpen) => set({ modOpen }),
  setAllViewOpen: (allViewOpen) => set({ allViewOpen }),
  setPlacing: (placing) => set({ placing }),
  setCategories: (categories) => set({ categories }),
  showToast: (msg) => set((s) => ({ toast: { msg, key: (s.toast?.key ?? 0) + 1 } })),
  clearToast: () => set({ toast: null }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setView: (view) => set({ view }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
