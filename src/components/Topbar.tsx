import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"

export function Topbar() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setMenuOpen = useAppStore((s) => s.setMenuOpen)

  return (
    <header id="topbar">
      <div className="head-wrap">
        <button id="menuBtn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="head">
          <h1>{t("top.title")}</h1>
          <p>{t("top.sub")}</p>
        </div>
      </div>
      <div className="top-right">
        <button className="icon-btn" aria-label="Language" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
          {lang === "zh" ? "EN" : "中"}
        </button>
        <div id="search">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            id="searchInput"
            name="search"
            type="search"
            autoComplete="off"
            placeholder={t("search.ph")}
            aria-label="Search promises"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd>⌘K</kbd>
        </div>
        <div className="avatar" title="Sign in" onClick={() => !userId && setAuthOpen(true)}>
          {userId && profile?.name ? profile.name[0] : "J"}
        </div>
      </div>
    </header>
  )
}
