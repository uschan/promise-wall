import { useAppStore } from "../store/useAppStore"
import { DEFAULT_CATEGORIES } from "../lib/categories"
import type { Category } from "../lib/types"

/** Returns settings-backed categories, falling back to the built-in defaults. */
export function useCategories(): Category[] {
  const categories = useAppStore((s) => s.categories)
  return categories ?? DEFAULT_CATEGORIES
}
