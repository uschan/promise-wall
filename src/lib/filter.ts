import type { PromiseItem } from "./types"

export function filterPromises(
  list: PromiseItem[],
  category: string | null,
  query: string,
): PromiseItem[] {
  let out = list
  if (category) out = out.filter((p) => p.category === category)
  const q = query.trim().toLowerCase()
  if (q) {
    out = out.filter(
      (p) =>
        p.text.toLowerCase().includes(q) || (p.author ?? "").toLowerCase().includes(q),
    )
  }
  return out
}
