import { supabase } from "./supabase"
import type {
  Category,
  PromiseItem,
  Profile,
  ReactionType,
  Reflection,
  Report,
  Settings,
} from "./types"

type PromiseRow = {
  id: string
  user_id: string | null
  data: PromiseItem
  updated_at: string
  created_at: string
}

/** Fields persisted inside the `promises.data` jsonb column. */
const PERSISTED_KEYS = [
  "text",
  "body",
  "author",
  "category",
  "paper",
  "tags",
  "imageData",
  "status",
  "createdAt",
] as const

function sanitizePromise(p: PromiseItem): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of PERSISTED_KEYS) {
    const value = (p as unknown as Record<string, unknown>)[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

function rowToPromise(row: PromiseRow): PromiseItem {
  const d = row.data ?? ({} as PromiseItem)
  return {
    ...d,
    id: row.id,
    user_id: row.user_id,
    createdAt: d.createdAt ?? new Date(row.created_at).getTime(),
  }
}

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured")
  return supabase
}

// ---------- auth ----------
export async function signUp(email: string, password: string, name: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const client = requireClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const client = requireClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export function onAuthStateChange(cb: (userId: string | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user.id ?? null)
  })
  return () => data.subscription.unsubscribe()
}

// ---------- profiles ----------
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const client = requireClient()
  const { data } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  return (data as Profile | null) ?? null
}

export async function upsertProfile(userId: string, name: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("profiles").upsert({ id: userId, name }, { onConflict: "id" })
  if (error) throw error
}

// ---------- photos ----------
const PHOTO_BUCKET = "promise-photos"

/** Uploads a photo to Storage and returns its public URL. */
export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const client = requireClient()
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })
  if (error) throw error
  const { data } = client.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ---------- promises (enriched with reactions/saves/reflections) ----------
export async function fetchPromises(userId?: string | null): Promise<PromiseItem[]> {
  const client = requireClient()
  const [pr, xr, vr, rr] = await Promise.all([
    client
      .from("promises")
      .select("id, data, user_id, updated_at, created_at")
      .order("created_at", { ascending: true }),
    client.from("reactions").select("promise_id, user_id, type"),
    client.from("saves").select("promise_id, user_id"),
    client
      .from("reflections")
      .select("promise_id, author, text, user_id")
      .order("created_at", { ascending: false }),
  ])
  if (pr.error) throw pr.error

  const reactionCounts: Record<string, Record<string, number>> = {}
  const reactedBy: Record<string, Set<ReactionType>> = {}
  for (const r of xr.data ?? []) {
    const bucket = (reactionCounts[r.promise_id] ??= {})
    bucket[r.type] = (bucket[r.type] ?? 0) + 1
    if (userId && r.user_id === userId) {
      (reactedBy[r.promise_id] ??= new Set()).add(r.type as ReactionType)
    }
  }

  const saveCount: Record<string, number> = {}
  const savedSet = new Set<string>()
  for (const s of vr.data ?? []) {
    saveCount[s.promise_id] = (saveCount[s.promise_id] ?? 0) + 1
    if (userId && s.user_id === userId) savedSet.add(s.promise_id)
  }

  const reflMap: Record<string, Reflection[]> = {}
  for (const r of rr.data ?? []) {
    ;(reflMap[r.promise_id] ??= []).push({ who: r.author, text: r.text })
  }

  return (pr.data as PromiseRow[]).map((row) => {
    const p = rowToPromise(row)
    const counts = reactionCounts[row.id] ?? {}
    p._reactionCounts = counts
    p._reacted = reactedBy[row.id] ?? new Set()
    p.support = counts["heart"] ?? 0
    p.saves = saveCount[row.id] ?? 0
    p.reflect = (reflMap[row.id] ?? []).length
    p._saved = savedSet.has(row.id)
    p._refl = reflMap[row.id] ?? []
    return p
  })
}

export async function upsertPromise(p: PromiseItem, userId: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("promises").upsert(
    {
      id: p.id,
      user_id: userId,
      data: sanitizePromise(p),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  )
  if (error) throw error
}

export async function deletePromise(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("promises").delete().eq("id", id)
  if (error) throw error
}

// ---------- interactions ----------
export async function addReaction(
  promiseId: string,
  type: ReactionType,
  userId: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("reactions").upsert(
    { promise_id: promiseId, user_id: userId, type },
    { onConflict: "promise_id,user_id,type" },
  )
  if (error) throw error
}

export async function removeReaction(
  promiseId: string,
  type: ReactionType,
  userId: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from("reactions")
    .delete()
    .eq("promise_id", promiseId)
    .eq("user_id", userId)
    .eq("type", type)
  if (error) throw error
}

export async function toggleSave(
  promiseId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const client = requireClient()
  if (active) {
    const { error } = await client
      .from("saves")
      .delete()
      .eq("promise_id", promiseId)
      .eq("user_id", userId)
    if (error) throw error
  } else {
    const { error } = await client
      .from("saves")
      .upsert({ promise_id: promiseId, user_id: userId }, { onConflict: "promise_id,user_id" })
    if (error) throw error
  }
}

export async function addReflection(
  promiseId: string,
  userId: string,
  author: string,
  text: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from("reflections")
    .insert({ promise_id: promiseId, user_id: userId, author, text })
  if (error) throw error
}

export async function addReport(
  promiseId: string,
  userId: string,
  author: string,
  text: string,
): Promise<void> {
  const client = requireClient()
  const { error } = await client
    .from("reports")
    .insert({ promise_id: promiseId, user_id: userId, author, text })
  if (error) throw error
}

/** Realtime subscription for cross-device sync. Returns an unsubscribe fn. */
export function subscribePromises(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel("wall-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "promises" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "saves" }, () => onChange())
    .on("postgres_changes", { event: "*", schema: "public", table: "reflections" }, () => onChange())
    .subscribe()
  return () => {
    supabase?.removeChannel(channel)
  }
}

/** Realtime subscription for the admin-managed settings table. */
export function subscribeSettings(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel("settings-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => onChange())
    .subscribe()
  return () => {
    supabase?.removeChannel(channel)
  }
}

// ---------- moderation (admin) ----------
export async function fetchReports(): Promise<Report[]> {
  const client = requireClient()
  const { data, error } = await client
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as Report[]) ?? []
}

export async function deleteReport(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("reports").delete().eq("id", id)
  if (error) throw error
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const client = requireClient()
  const { data, error } = await client
    .from("profiles")
    .select("id, name, is_admin, banned")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as Profile[]) ?? []
}

export async function setUserBanned(userId: string, banned: boolean): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("profiles").update({ banned }).eq("id", userId)
  if (error) throw error
}

// ---------- settings (admin write, public read) ----------
export async function fetchSettings(): Promise<Settings> {
  const client = requireClient()
  const { data, error } = await client.from("settings").select("key, value")
  if (error) throw error
  const out: Settings = {}
  for (const r of data ?? []) {
    if (r.key === "templates") out.templates = r.value as string[]
    else if (r.key === "quotes") out.quotes = r.value as string[]
    else if (r.key === "categories") out.categories = r.value as Category[]
    else if (r.key === "promise_rate_limit") out.rateLimit = r.value as number
  }
  return out
}

export async function saveSettings(settings: {
  templates: string[]
  quotes: string[]
  categories: Category[]
  rateLimit: number
}): Promise<void> {
  const client = requireClient()
  const rows: { key: string; value: unknown }[] = [
    { key: "templates", value: settings.templates },
    { key: "quotes", value: settings.quotes },
    { key: "categories", value: settings.categories },
    { key: "promise_rate_limit", value: settings.rateLimit },
  ]
  for (const r of rows) {
    const { error } = await client.from("settings").upsert(r, { onConflict: "key" })
    if (error) throw error
  }
}

export async function resetWall(): Promise<void> {
  const client = requireClient()
  const { error } = await client.from("promises").delete().not("user_id", "is", null)
  if (error) throw error
}
