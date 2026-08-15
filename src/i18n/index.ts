import { en, type I18nKey } from "./en"
import { zh } from "./zh"
import type { Lang } from "../lib/types"

const dicts: Record<Lang, Record<I18nKey, string>> = { en, zh }

export function translate(lang: Lang, key: I18nKey): string {
  return dicts[lang][key] ?? en[key] ?? key
}

export type { I18nKey }
