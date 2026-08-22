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
                {(p.imageData || p.photo || p.handwriting) && (
                  <span className="marks">
                    {(p.imageData || p.photo) && (
                      <span className="mark photo" title="Image">
                        <svg viewBox="0 0 24 24">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <circle cx="9" cy="10" r="2" />
                          <path d="M21 15l-5-4-9 8" />
                        </svg>
                      </span>
                    )}
                    {p.handwriting && (
                      <span className="mark hand" title="Hand-drawn">
                        <svg viewBox="0 0 24 24">
                          <path d="M5 19l1-4L17 4l3 3L9 18z" />
                        </svg>
                      </span>
                    )}
                  </span>
                )}
                <span className="av-meta">{p.author}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
