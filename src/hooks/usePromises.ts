import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchPromises, subscribePromises } from "../lib/api"
import { isSupabaseConfigured } from "../lib/supabase"
import { SEED_PROMISES } from "../lib/seed"
import { useAppStore } from "../store/useAppStore"

/**
 * Loads promises into the store: from Supabase when configured (with realtime),
 * otherwise from local seed data (demo mode).
 */
export function usePromises() {
  const setPromises = useAppStore((s) => s.setPromises)

  useEffect(() => {
    if (!isSupabaseConfigured) setPromises(SEED_PROMISES)
  }, [setPromises])

  const query = useQuery({
    queryKey: ["promises"],
    queryFn: fetchPromises,
    enabled: isSupabaseConfigured,
  })

  useEffect(() => {
    if (query.data) setPromises(query.data)
  }, [query.data, setPromises])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    return subscribePromises(() => query.refetch())
  }, [query.refetch])

  return query
}
