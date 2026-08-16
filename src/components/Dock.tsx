import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"

function ago(ts?: number): string {
  if (!ts) return ""
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return "just now"
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function Dock() {
  const t = useT()
  const promises = useAppStore((s) => s.promises)
  const select = useAppStore((s) => s.select)
  const openCreate = useAppStore((s) => s.openCreate)
  const setTemplateOpen = useAppStore((s) => s.setTemplateOpen)
  const setAllViewOpen = useAppStore((s) => s.setAllViewOpen)
  const recents = [...promises]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 4)

  return (
    <div id="dock">
      <div className="dock-col recent">
        <div className="dock-head">
          <h3>{t("dock.recent")}</h3>
          <button onClick={() => setAllViewOpen(true)}>
            <span>{t("dock.viewall")}</span> <span>›</span>
          </button>
        </div>
        <div id="recentRow">
          {recents.map((p) => (
            <button
              key={p.id}
              className="mini"
              style={{ background: PAPERS[p.paper ?? "classic"].base }}
              onClick={() => select(p.id)}
            >
              {p.text.length > 46 ? p.text.slice(0, 44) + "…" : p.text}
              <span className="mfoot">
                <span className="mava"></span>
                {ago(p.createdAt)}
                <span className="mheart">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
                  </svg>
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="dock-col start">
        <div className="dock-head">
          <h3>{t("dock.start")}</h3>
        </div>
        <div className="start-grid">
          <button className="start-card" onClick={openCreate}>
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>{t("start.write")}</span>
          </button>
          <button className="start-card" onClick={() => setTemplateOpen(true)}>
            <svg viewBox="0 0 24 24">
              <path d="M14.5 4.5l5 5L8 21H3v-5z" />
              <path d="M12.5 6.5l5 5" />
            </svg>
            <span>{t("start.template")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
