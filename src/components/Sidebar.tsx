import { useEffect, useState } from "react"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { categoryLabel } from "../lib/categories"
import { useCategories } from "../hooks/useCategories"
import { signOut as apiSignOut, upsertProfile } from "../lib/api"

const DEFAULT_QUOTES = [
  "Small promises, lasting change.",
  "The future you is shaped by the promises you keep today.",
]

export function Sidebar() {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const userId = useAppStore((s) => s.userId)
  const profile = useAppStore((s) => s.profile)
  const setAuth = useAppStore((s) => s.setAuth)
  const setAuthOpen = useAppStore((s) => s.setAuthOpen)
  const setModOpen = useAppStore((s) => s.setModOpen)
  const activeCategory = useAppStore((s) => s.activeCategory)
  const setActiveCategory = useAppStore((s) => s.setActiveCategory)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const quotes = useAppStore((s) => s.quotes)
  const categories = useCategories()

  const [qi, setQi] = useState(0)
  const quoteList = quotes && quotes.length > 0 ? quotes : DEFAULT_QUOTES
  useEffect(() => {
    const timer = setInterval(() => setQi((v) => (v + 1) % quoteList.length), 8000)
    return () => clearInterval(timer)
  }, [quoteList.length])

  const name = profile?.name || (userId ? t("signedInAs") : t("notSignedIn"))
  const allActive = view === "all" && activeCategory === null

  const editName = async () => {
    if (!userId) return
    const newName = window.prompt("Display name", profile?.name ?? "")
    if (!newName || !newName.trim()) return
    await upsertProfile(userId, newName.trim())
    setAuth(userId, { id: userId, ...(profile ?? {}), name: newName.trim() })
  }

  return (
    <aside id="sidebar">
      <div className="logo">
        Promise
        <br />
        Wall <i>●</i>
      </div>
      <p className="tagline">
        Small promises,
        <br />
        lasting change.
      </p>
      <div id="profile">
        <span className="pava">{userId && profile?.name ? profile.name[0] : "J"}</span>
        <span className="pwho">
          <span className="plabel">{userId ? t("signedInAs") : t("notSignedIn")}</span>
          <span className="pname" onClick={() => !userId && setAuthOpen(true)}>
            {name}
          </span>
        </span>
        {userId && (
          <>
            <button className="edit" aria-label="Edit name" onClick={() => void editName()}>
              <svg viewBox="0 0 24 24">
                <path d="M14.5 4.5l5 5L8 21H3v-5z" />
                <path d="M12.5 6.5l5 5" />
              </svg>
            </button>
            <button className="edit" aria-label="Sign out" onClick={() => void apiSignOut()}>
              <svg viewBox="0 0 24 24">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </>
        )}
      </div>
      <hr />
      <button
        className={`nav-item ${allActive ? "active" : ""}`}
        onClick={() => {
          setView("all")
          setActiveCategory(null)
        }}
      >
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
        <span>{t("nav.wall")}</span> <span className="dot"></span>
      </button>
      <button className={`nav-item ${view === "mine" ? "active" : ""}`} onClick={() => setView("mine")}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20c.7-3.6 3.3-5.6 6.5-5.6s5.8 2 6.5 5.6" />
        </svg>
        <span>{t("nav.mine")}</span>
      </button>
      <button className={`nav-item ${view === "saved" ? "active" : ""}`} onClick={() => setView("saved")}>
        <svg viewBox="0 0 24 24">
          <path d="M7 4h10v16l-5-3.5L7 20z" />
        </svg>
        <span>{t("nav.saved")}</span>
      </button>
      {profile?.is_admin && (
        <button className="nav-item" onClick={() => setModOpen(true)}>
          <svg viewBox="0 0 24 24">
            <path d="M6 21V4" />
            <path d="M6 4h12l-2.5 4L18 12H6" />
          </svg>
          <span>{t("nav.moderate")}</span>
        </button>
      )}
      <div className="nav-label">{t("nav.explore")}</div>
      <div id="catNav">
        {categories.map((c) => (
          <button
            key={c.key}
            className={`nav-item cat ${view === "all" && activeCategory === c.key ? "active" : ""}`}
            onClick={() => {
              setView("all")
              setActiveCategory(c.key)
            }}
          >
            <span className="cat-ico">{c.icon}</span>
            <span>{categoryLabel(c.key, lang, categories)}</span>
          </button>
        ))}
      </div>
      <p className="quote">{quoteList[qi] ?? quoteList[0] ?? ""}</p>
    </aside>
  )
}
