import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"

export function Dock() {
  const t = useT()
  const promises = useAppStore((s) => s.promises)
  const recents = [...promises].slice(0, 4)

  return (
    <div className="dock">
      <div className="dock-head">
        <h3>{t("dock.recent")}</h3>
        <button className="link">{t("dock.viewall")} ›</button>
      </div>
      <div className="dock-row">
        {recents.map((p) => (
          <button key={p.id} className="mini">
            {p.text}
          </button>
        ))}
      </div>
    </div>
  )
}
