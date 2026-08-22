import { useEffect } from "react"
import { useAppStore } from "../store/useAppStore"
import { isSupabaseConfigured } from "../lib/supabase"
import { fetchSettings, subscribeSettings } from "../lib/api"

/** Loads admin-managed settings (categories) into the store, with realtime sync. */
export function useSettings() {
  const setCategories = useAppStore((s) => s.setCategories)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const load = () => {
      fetchSettings()
        .then((s) => {
          if (s.categories) setCategories(s.categories)
        })
        .catch(() => {})
    }
    load()
    return subscribeSettings(load)
  }, [setCategories])
}
