import { useEffect } from "react"
import { useAppStore } from "../store/useAppStore"
import { isSupabaseConfigured } from "../lib/supabase"
import { fetchSettings, subscribeSettings } from "../lib/api"

/** Loads admin-managed settings (categories/templates/quotes) into the store, with realtime sync. */
export function useSettings() {
  const setCategories = useAppStore((s) => s.setCategories)
  const setTemplates = useAppStore((s) => s.setTemplates)
  const setQuotes = useAppStore((s) => s.setQuotes)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const load = () => {
      fetchSettings()
        .then((s) => {
          if (s.categories) setCategories(s.categories)
          if (s.templates) setTemplates(s.templates)
          if (s.quotes) setQuotes(s.quotes)
        })
        .catch(() => {})
    }
    load()
    return subscribeSettings(load)
  }, [setCategories, setTemplates, setQuotes])
}
