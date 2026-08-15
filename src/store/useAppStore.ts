import { create } from "zustand"
import type { Lang, Profile, PromiseItem } from "../lib/types"

type Toast = { msg: string; key: number }

type AppState = {
  lang: Lang
  promises: PromiseItem[]
  selectedId: string | null
  composeOpen: boolean
  userId: string | null
  profile: Profile | null
  authOpen: boolean
  toast: Toast | null
  setLang: (lang: Lang) => void
  setPromises: (promises: PromiseItem[]) => void
  select: (id: string | null) => void
  setComposeOpen: (open: boolean) => void
  addPromise: (p: PromiseItem) => void
  removePromise: (id: string) => void
  setAuth: (userId: string | null, profile: Profile | null) => void
  setAuthOpen: (open: boolean) => void
  showToast: (msg: string) => void
  clearToast: () => void
}

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  promises: [],
  selectedId: null,
  composeOpen: false,
  userId: null,
  profile: null,
  authOpen: false,
  toast: null,
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
  setAuth: (userId, profile) => set({ userId, profile }),
  setAuthOpen: (authOpen) => set({ authOpen }),
  showToast: (msg) => set((s) => ({ toast: { msg, key: (s.toast?.key ?? 0) + 1 } })),
  clearToast: () => set({ toast: null }),
}))
