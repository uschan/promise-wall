import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { PAPERS } from "../lib/papers"

const DOODLE_GLYPH: Record<string, string> = {
  heart: "♥\uFE0E",
  star: "★\uFE0E",
  sprig: "✿\uFE0E",
  arrow: "➶\uFE0E",
}

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
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const openCreate = useAppStore((s) => s.openCreate)
  const setAllViewOpen = useAppStore((s) => s.setAllViewOpen)
  const recents = [...promises]
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, 4)

  return (
    <div id="dock" className={selectedId ? "hidden" : ""}>
      <div className="dock-col recent">
        <div className="dock-head">
          <h3>{t("dock.recent")}</h3>
          <button onClick={() => setAllViewOpen(true)}>
            <span>{t("dock.viewall")}</span> <span>›</span>
          </button>
        </div>
        <div id="recentRow">
          <button className="mini start" onClick={openCreate}>
            <span className="start-icon">+</span>
            <span className="start-label">{t("dock.start")}</span>
          </button>
          {recents.map((p) => {
            const paperBase = (PAPERS[p.paper ?? "classic"] ?? PAPERS.classic).base
            const isPhoto = !!p.imageData
            const isHand = !!p.handwriting
            const media = p.imageData || p.handwriting || undefined
            const cls = isPhoto ? "mini media photo" : isHand ? "mini media hand" : "mini"
            return (
              <button
                key={p.id}
                className={cls}
                style={
                  media
                    ? {
                        backgroundColor: paperBase,
                        backgroundImage: `url(${media})`,
                        backgroundSize: isPhoto ? "cover" : "contain",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : { backgroundColor: paperBase }
                }
                onClick={() => select(p.id)}
              >
                <span className="mtext">
                  {p.text.length > 46 ? p.text.slice(0, 44) + "…" : p.text}
                </span>
                <span className="mfoot">
                  <span className="mava"></span>
                  {ago(p.createdAt)}
                  <span className="mheart">{DOODLE_GLYPH[p.doodle ?? ""] ?? ""}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
