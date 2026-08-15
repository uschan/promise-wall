import type { PromiseItem } from "./types"

export type View = "all" | "mine" | "saved"

export function filterPromises(
  list: PromiseItem[],
  category: string | null,
  query: string,
  view: View,
  userId: string | null,
): PromiseItem[] {
  let out = list
  if (view === "mine") out = out.filter((p) => p.user_id === userId)
  else if (view === "saved") out = out.filter((p) => !!p._saved)
  else if (category) out = out.filter((p) => p.category === category)
  const q = query.trim().toLowerCase()
  if (q) {
    out = out.filter(
      (p) =>
        p.text.toLowerCase().includes(q) || (p.author ?? "").toLowerCase().includes(q),
    )
  }
  return out
}
