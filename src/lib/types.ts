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
  | "parchment"
  | "postcard"
  | "polaroid"
  | "sticky"
  | "staff"
  | "dark"

export type ReactionType = "heart" | "thumbs" | "fire" | "smile" | "muscle"

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
  /** Transparent-ink PNG (data URL or Storage URL) of a hand-drawn note. */
  handwriting?: string
  x?: number
  y?: number
  w?: number
  rot?: number
  attach?: string
  font?: string
  pinColor?: number
  photo?: string
  createdAt?: number
  /** Runtime-only fields (not persisted in `data`). */
  user_id?: string | null
  support?: number
  saves?: number
  _saved?: boolean
  _reacted?: Set<ReactionType>
  _reactionCounts?: Record<string, number>
}

export type Profile = {
  id: string
  name?: string | null
  is_admin?: boolean
  banned?: boolean
}

export type Settings = {
  categories?: Category[]
  rateLimit?: number
}
