import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { DEFAULT_CATEGORIES, categoryLabel } from "../lib/categories"
import { signOut as apiSignOut } from "../lib/api"

export function Sidebar() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)
  const setModOpen = useAppStore((s) => s.setModOpen)
  const activeCategory = useAppStore((s) => s.activeCategory)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)

  return (
    <aside className="sidebar">
      <div className="logo">
        Wish
        <br />
        Collective <i>●</i>
      </div>
      <div className="search">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("search.ph")}
        />
      </div>
      <nav className="nav">
        <button
          className={`nav-item ${activeCategory === null ? "active" : ""}`}
          onClick={() => setActiveCategory(null)}
        >
          <span className="cat-ico">✦</span> {t("nav.all")}
        </button>
        {DEFAULT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`nav-item ${activeCategory === c.key ? "active" : ""}`}
            onClick={() => setActiveCategory(c.key)}
          >
            <span className="cat-ico">{c.icon}</span> {categoryLabel(c.key, lang)}
          </button>
        ))}
        {profile?.is_admin && (
          <button className="nav-item" onClick={() => setModOpen(true)}>
            <span className="cat-ico">🛡️</span> {t("nav.moderate")}
          </button>
        )}
      </nav>
      <div className="sidebar-foot">
        <button className="pill" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
          {lang === "zh" ? "EN" : "中"}
        </button>
        {userId ? (
          <button className="pill" onClick={() => void apiSignOut()} title={t("auth.signout")}>
            {profile?.name || t("signedInAs")}
          </button>
        ) : (
          <button className="pill primary" onClick={() => setAuthOpen(true)}>
            {t("auth.signin")}
          </button>
        )}
      </div>
    </aside>
  )
}
