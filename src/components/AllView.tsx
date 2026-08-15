import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { categoryLabel } from "../lib/categories"
import { useCategories } from "../hooks/useCategories"

export function AllView() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const open = useAppStore((s) => s.allViewOpen)
  const setAllViewOpen = useAppStore((s) => s.setAllViewOpen)
  const select = useAppStore((s) => s.select)
  const promises = useAppStore((s) => s.promises)
  const categories = useCategories()

  const openPromise = (id: string) => {
    select(id)
    setAllViewOpen(false)
  }

  return (
    <div id="allView" className={open ? "open" : ""} onClick={() => setAllViewOpen(false)}>
      <div id="allBox" onClick={(e) => e.stopPropagation()}>
        <div className="av-head">
          <div>
            <h2>{t("dock.viewall")}</h2>
            <p>Every promise on the wall.</p>
          </div>
          <button aria-label="Close" onClick={() => setAllViewOpen(false)}>
            ×
          </button>
        </div>
        <div id="avList">
          {promises.length === 0 ? (
            <div className="mod-empty">{t("empty")}</div>
          ) : (
            promises.map((p) => (
              <button key={p.id} className="av-row" onClick={() => openPromise(p.id)}>
                <span className="av-cat">
                  {p.category ? categoryLabel(p.category, lang, categories) : ""}
                </span>
                <span className="av-text">{p.text}</span>
                <span className="av-meta">{p.author}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
