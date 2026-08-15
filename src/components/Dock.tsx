import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"

export function Dock() {
  const t = useT()
  const promises = useAppStore((s) => s.promises)
  const select = useAppStore((s) => s.select)
  const openCreate = useAppStore((s) => s.openCreate)
  const setAllViewOpen = useAppStore((s) => s.setAllViewOpen)
  const recents = [...promises].slice(0, 4)

  return (
    <div className="dock">
      <div className="dock-head">
        <h3>{t("dock.recent")}</h3>
        <button className="link" onClick={() => setAllViewOpen(true)}>
          {t("dock.viewall")} ›
        </button>
      </div>
      <div className="dock-row">
        {recents.map((p) => (
          <button key={p.id} className="mini" onClick={() => select(p.id)}>
            {p.text}
          </button>
        ))}
        <button className="mini start-mini" onClick={openCreate}>
          + {t("dock.start")}
        </button>
      </div>
    </div>
  )
}
