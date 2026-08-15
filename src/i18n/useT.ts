import { useAppStore } from "../store/useAppStore"
import { translate, type I18nKey } from "./index"

/** Returns a type-safe `t(key)` bound to the current language. */
export function useT() {
  const lang = useAppStore((s) => s.lang)
  return (key: I18nKey) => translate(lang, key)
}
