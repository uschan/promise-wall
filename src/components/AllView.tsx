import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"

export function AllView() {
  const t = useT()
  const open = useAppStore((s) => s.allViewOpen)
  const setAllViewOpen = useAppStore((s) => s.setAllViewOpen)
  const select = useAppStore((s) => s.select)
  const promises = useAppStore((s) => s.promises)

  if (!open) return null

  const openPromise = (id: string) => {
    select(id)
    setAllViewOpen(false)
  }

  return (
    <div className="overlay" onClick={() => setAllViewOpen(false)}>
      <div className="av" onClick={(e) => e.stopPropagation()}>
        <div className="av-head">
          <h2>{t("dock.viewall")}</h2>
          <button className="close" onClick={() => setAllViewOpen(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className="av-list">
          {promises.length === 0 ? (
            <div className="mod-empty">{t("empty")}</div>
          ) : (
            promises.map((p) => (
              <button key={p.id} className="av-row" onClick={() => openPromise(p.id)}>
                <span className="av-swatch" style={{ background: PAPERS[p.paper ?? "classic"].base }} />
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
