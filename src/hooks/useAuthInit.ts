import { useEffect } from "react"
import { useAppStore } from "../store/useAppStore"
import { isSupabaseConfigured, supabase } from "../lib/supabase"
import { getSessionUserId, onAuthStateChange, fetchProfile, upsertProfile } from "../lib/api"

/** Restores the session on load and keeps the store in sync with auth changes. */
export function useAuthInit() {
  const setAuth = useAppStore((s) => s.setAuth)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const client = supabase
    let cancelled = false

    const sync = async (uid: string | null) => {
      if (!uid) {
        if (!cancelled) setAuth(null, null)
        return
      }
      try {
        let profile = await fetchProfile(uid)
        if (!profile) {
          // First sign-in: create the profile from the auth user's name.
          const { data } = await client.auth.getUser()
          const name = (data.user?.user_metadata?.name as string | undefined) ?? ""
          await upsertProfile(uid, name)
          profile = await fetchProfile(uid)
        }
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
