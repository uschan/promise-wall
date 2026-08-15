import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"

export function Sidebar() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)

  return (
    <aside className="sidebar">
      <div className="logo">
        Wish
        <br />
        Collective <i>●</i>
      </div>
      <nav className="nav">
        <button className="nav-item active">{t("nav.wall")}</button>
        <button className="nav-item">{t("nav.mine")}</button>
        <button className="nav-item">{t("nav.saved")}</button>
        <button className="nav-item">{t("nav.moderate")}</button>
      </nav>
      <div className="sidebar-foot">
        <button className="pill" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
          {lang === "zh" ? "EN" : "中"}
        </button>
        <button className="pill primary">{t("auth.signin")}</button>
      </div>
    </aside>
  )
}
