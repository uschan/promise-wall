import { useEffect } from "react"
import { useAppStore } from "../store/useAppStore"
import { isSupabaseConfigured } from "../lib/supabase"
import { getSessionUserId, onAuthStateChange, fetchProfile } from "../lib/api"

/** Restores the session on load and keeps the store in sync with auth changes. */
export function useAuthInit() {
  const setAuth = useAppStore((s) => s.setAuth)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let cancelled = false

    const sync = async (uid: string | null) => {
      if (!uid) {
        if (!cancelled) setAuth(null, null)
        return
      }
      try {
        const profile = await fetchProfile(uid)
        if (!cancelled) setAuth(uid, profile)
      } catch {
        if (!cancelled) setAuth(uid, null)
      }
    }

    void getSessionUserId().then(sync)
    const unsubscribe = onAuthStateChange((uid) => {
      void sync(uid)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [setAuth])
}
