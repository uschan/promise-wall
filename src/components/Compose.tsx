import { useState } from "react"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"
import { DEFAULT_CATEGORIES, categoryLabel } from "../lib/categories"
import type { PaperKind, PromiseItem } from "../lib/types"

export function Compose() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const open = useAppStore((s) => s.composeOpen)
  const setComposeOpen = useAppStore((s) => s.setComposeOpen)
  const addPromise = useAppStore((s) => s.addPromise)
  const select = useAppStore((s) => s.select)

  const [text, setText] = useState("")
  const [category, setCategory] = useState("Self-Growth")
  const [paper, setPaper] = useState<PaperKind>("classic")

  if (!open) return null

  const place = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const promise: PromiseItem = {
      id: `p${Date.now()}`,
      text: trimmed,
      author: "You",
      category,
      paper,
      status: "active",
      createdAt: Date.now(),
    }
    addPromise(promise)
    setComposeOpen(false)
    setText("")
    select(promise.id)
  }

  return (
    <div className="overlay" onClick={() => setComposeOpen(false)}>
      <div className="compose" onClick={(e) => e.stopPropagation()}>
        <h2>{t("compose.title")}</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("compose.your")}
          maxLength={90}
        />
        <div className="field-label">{t("compose.category")}</div>
        <div className="chips">
          {DEFAULT_CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`chip ${c.key === category ? "on" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              {c.icon} {categoryLabel(c.key, lang)}
            </button>
          ))}
        </div>
        <div className="field-label">{t("compose.paper")}</div>
        <div className="papers">
          {(Object.entries(PAPERS) as [PaperKind, { label: string; base: string }][]).map(
            ([key, style]) => (
              <button
                key={key}
                className={`paper-swatch ${key === paper ? "on" : ""}`}
                style={{ background: style.base }}
                onClick={() => setPaper(key)}
                aria-label={style.label}
                title={style.label}
              />
            ),
          )}
        </div>
        <div className="compose-actions">
          <button className="pill" onClick={() => setComposeOpen(false)}>
            {t("compose.cancel")}
          </button>
          <button className="pill primary" onClick={place} disabled={!text.trim()}>
            {t("compose.place")}
          </button>
        </div>
      </div>
    </div>
  )
}
