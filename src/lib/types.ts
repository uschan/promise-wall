export type Lang = "en" | "zh"

export type PaperKind =
  | "classic"
  | "notebook"
  | "graph"
  | "pastelPink"
  | "pastelPurple"
  | "pastelGreen"
  | "kraft"
  | "torn"

export type PromiseStatus = "active" | "kept" | "shelved"

export type ReactionType = "heart" | "thumbs" | "fire" | "smile" | "muscle"

export type Reflection = { who: string; text: string }

export type Report = {
  id: string
  promise_id: string
  text: string
  author: string
  created_at: string
}

export type Category = {
  key: string
  en: string
  zh: string
  icon?: string
}

/** A single promise as stored in the `promises.data` jsonb column. */
export type PromiseItem = {
  id: string
  text: string
  body?: string
  author: string
  category?: string
  paper?: PaperKind
  tags?: string[]
  doodle?: string
  imageData?: string
  x?: number
  y?: number
  status?: PromiseStatus
  createdAt?: number
  /** Runtime-only fields (not persisted in `data`). */
  user_id?: string | null
  support?: number
  saves?: number
  reflect?: number
  _saved?: boolean
  _reacted?: Set<ReactionType>
  _reactionCounts?: Record<string, number>
  _refl?: Reflection[]
}

export type Profile = {
  id: string
  name?: string | null
  is_admin?: boolean
  banned?: boolean
}

export type Settings = {
  templates?: string[]
  quotes?: string[]
  categories?: Category[]
  rateLimit?: number
}
