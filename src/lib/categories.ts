import type { Category, Lang } from "./types"

export const DEFAULT_CATEGORIES: Category[] = [
  { key: "Health", en: "Health", zh: "健康", icon: "🌿" },
  { key: "Kindness", en: "Kindness", zh: "善良", icon: "💛" },
  { key: "Learning", en: "Learning", zh: "学习", icon: "📚" },
  { key: "Family", en: "Family", zh: "家庭", icon: "🏡" },
  { key: "Work", en: "Work", zh: "工作", icon: "💼" },
  { key: "Self-Growth", en: "Self-Growth", zh: "自我成长", icon: "🌱" },
  { key: "Relationships", en: "Relationships", zh: "人际关系", icon: "💞" },
  { key: "Creativity", en: "Creativity", zh: "创造力", icon: "🎨" },
]

export function categoryLabel(key: string, lang: Lang): string {
  const found = DEFAULT_CATEGORIES.find((c) => c.key === key)
  if (!found) return key
  return lang === "zh" ? found.zh : found.en
}
