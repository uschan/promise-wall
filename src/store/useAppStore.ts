import { create } from "zustand"
import type { Category, Lang, Profile, PromiseItem } from "../lib/types"

type Toast = { msg: string; key: number }

type AppState = {
  lang: Lang
  promises: PromiseItem[]
  selectedId: string | null
  composeOpen: boolean
  editingId: string | null
  activeCategory: string | null
  view: "all" | "mine" | "saved"
  searchQuery: string
  userId: string | null
  profile: Profile | null
  authOpen: boolean
  modOpen: boolean
  allViewOpen: boolean
  shareId: string | null
  templateOpen: boolean
  draftText: string | null
  placing: PromiseItem | null
  categories: Category[] | null
  templates: string[] | null
  quotes: string[] | null
  toast: Toast | null
  menuOpen: boolean
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
  setModOpen: (open: boolean) => void
  setAllViewOpen: (open: boolean) => void
  setShareId: (id: string | null) => void
  setTemplateOpen: (open: boolean) => void
  setDraftText: (text: string | null) => void
  setPlacing: (p: PromiseItem | null) => void
  setCategories: (categories: Category[] | null) => void
  setTemplates: (templates: string[] | null) => void
  setQuotes: (quotes: string[] | null) => void
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
  editingId: null,
  activeCategory: null,
  view: "all",
  searchQuery: "",
  userId: null,
  profile: null,
  authOpen: false,
  modOpen: false,
  allViewOpen: false,
  shareId: null,
  templateOpen: false,
  draftText: null,
  placing: null,
  categories: null,
  templates: null,
  quotes: null,
  toast: null,
  menuOpen: false,
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
  setModOpen: (modOpen) => set({ modOpen }),
  setAllViewOpen: (allViewOpen) => set({ allViewOpen }),
  setShareId: (shareId) => set({ shareId }),
  setTemplateOpen: (templateOpen) => set({ templateOpen }),
  setDraftText: (draftText) => set({ draftText }),
  setPlacing: (placing) => set({ placing }),
  setCategories: (categories) => set({ categories }),
  setTemplates: (templates) => set({ templates }),
  setQuotes: (quotes) => set({ quotes }),
  showToast: (msg) => set((s) => ({ toast: { msg, key: (s.toast?.key ?? 0) + 1 } })),
  clearToast: () => set({ toast: null }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setView: (view) => set({ view }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
