import { supabase } from "./supabase"
import type { PromiseItem, Profile } from "./types"

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

// ---------- promises ----------
export async function fetchPromises(): Promise<PromiseItem[]> {
  const client = requireClient()
  const { data, error } = await client
    .from("promises")
    .select("id, data, user_id, updated_at, created_at")
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as PromiseRow[]).map(rowToPromise)
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

/** Realtime subscription for cross-device promise sync. Returns an unsubscribe fn. */
export function subscribePromises(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel = supabase
    .channel("promises-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "promises" }, () => {
      onChange()
    })
    .subscribe()
  return () => {
    supabase?.removeChannel(channel)
  }
}
