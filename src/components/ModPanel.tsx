import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "../store/useAppStore"
import { useT } from "../i18n/useT"
import { isSupabaseConfigured } from "../lib/supabase"
import {
  fetchAllProfiles,
  setUserBanned,
  deletePromise,
  fetchSettings,
  saveSettings,
  resetWall,
} from "../lib/api"
import { DEFAULT_CATEGORIES } from "../lib/categories"
import type { Category, Profile } from "../lib/types"

type Tab = "promises" | "users" | "settings"

export function ModPanel() {
  const t = useT()
  const open = useAppStore((s) => s.modOpen)
  const setModOpen = useAppStore((s) => s.setModOpen)
  const showToast = useAppStore((s) => s.showToast)
  const promises = useAppStore((s) => s.promises)
  const setStoreCategories = useAppStore((s) => s.setCategories)
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<Tab>("promises")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [templates, setTemplates] = useState("")
  const [quotes, setQuotes] = useState("")
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [rateLimit, setRateLimit] = useState(1)

  const todayCount = promises.filter(
    (p) => p.createdAt && Date.now() - p.createdAt < 86400000,
  ).length

  const load = async () => {
    if (!isSupabaseConfigured) return
    try {
      const [p, s] = await Promise.all([fetchAllProfiles(), fetchSettings()])
      setProfiles(p)
      setTemplates((s.templates ?? []).join("\n"))
      setQuotes((s.quotes ?? []).join("\n"))
      setCategories(s.categories ?? DEFAULT_CATEGORIES)
      setRateLimit(s.rateLimit ?? 1)
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    if (open) {
      setTab("promises")
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["promises"] })

  const removePromise = async (id: string) => {
    if (!window.confirm(t("mod.remove") + "?")) return
    await deletePromise(id)
    await invalidate()
    showToast(t("mod.promises.removed"))
  }

  const toggleBan = async (u: Profile) => {
    await setUserBanned(u.id, !u.banned)
    showToast(u.banned ? t("mod.unbannedToast") : t("mod.bannedToast"))
    void load()
  }

  const save = async () => {
    await saveSettings({
      templates: templates.split("\n").map((s) => s.trim()).filter(Boolean),
      quotes: quotes.split("\n").map((s) => s.trim()).filter(Boolean),
      categories,
      rateLimit: Math.max(1, rateLimit),
    })
    setStoreCategories(categories)
    showToast(t("mod.set.saved"))
  }

  const doReset = async () => {
    if (!window.confirm(t("mod.resetConfirm"))) return
    await resetWall()
    await invalidate()
    showToast(t("mod.resetDone"))
  }

  const addCategory = () => setCategories([...categories, { key: "", en: "", zh: "", icon: "" }])
  const setCat = (i: number, patch: Partial<Category>) =>
    setCategories(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const removeCat = (i: number) => setCategories(categories.filter((_, idx) => idx !== i))

  return (
    <div
      id="modWrap"
      className={open ? "open" : ""}
      role="dialog"
      aria-modal="true"
      onClick={() => setModOpen(false)}
    >
      <div id="modBox" onClick={(e) => e.stopPropagation()}>
        <div className="av-head">
          <h2>{t("mod.title")}</h2>
          <button aria-label="Close" onClick={() => setModOpen(false)}>
            ×
          </button>
        </div>
        <div id="modTabs">
          <button className={`mod-tab ${tab === "promises" ? "on" : ""}`} onClick={() => setTab("promises")}>
            {t("mod.tab.promises")}
          </button>
          <button className={`mod-tab ${tab === "users" ? "on" : ""}`} onClick={() => setTab("users")}>
            {t("mod.tab.users")}
          </button>
          <button className={`mod-tab ${tab === "settings" ? "on" : ""}`} onClick={() => setTab("settings")}>
            {t("mod.tab.settings")}
          </button>
        </div>

        {tab === "promises" && (
          <>
            <div id="modStats">
              <span className="mstat">
                <b>{promises.length}</b> {t("mod.stat.promises")}
              </span>
              <span className="mstat">
                <b>{profiles.length}</b> {t("mod.stat.users")}
              </span>
              <span className="mstat">
                <b>{todayCount}</b> {t("mod.stat.today")}
              </span>
            </div>
            <div id="promisesView">
              {promises.length === 0 ? (
                <div className="mod-empty">{t("mod.promises.empty")}</div>
              ) : (
                promises.map((p) => (
                  <div key={p.id} className="mod-row">
                    <div className="mod-main">
                      <div className="mod-text">{p.text}</div>
                      <div className="mod-meta">{p.author}</div>
                    </div>
                    <div className="mod-actions">
                      <button className="mod-btn remove" onClick={() => void removePromise(p.id)}>
                        {t("mod.remove")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "users" && (
          <div id="usersView">
            {profiles.length === 0 ? (
              <div className="mod-empty">{t("mod.empty")}</div>
            ) : (
              profiles.map((u) => (
                <div key={u.id} className="mod-row">
                  <div className="mod-main">
                    <div className="mod-text">
                      {u.name || u.id}
                      {u.is_admin ? " ★" : ""}
                    </div>
                  </div>
                  <div className="mod-actions">
                    <button className={`mod-btn ${u.banned ? "" : "ban"}`} onClick={() => void toggleBan(u)}>
                      {u.banned ? t("mod.unban") : t("mod.ban")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "settings" && (
          <div id="settingsView">
            <label>{t("mod.set.templates")}</label>
            <textarea rows={5} value={templates} onChange={(e) => setTemplates(e.target.value)} />
            <label>{t("mod.set.quotes")}</label>
            <textarea rows={6} value={quotes} onChange={(e) => setQuotes(e.target.value)} />
            <label>{t("mod.set.categories")}</label>
            <div id="setCategories">
              {categories.map((c, i) => (
                <div key={i} className="set-cat">
                  <input className="sc-icon" value={c.icon ?? ""} onChange={(e) => setCat(i, { icon: e.target.value })} placeholder="icon" />
                  <input className="sc-key" value={c.key} onChange={(e) => setCat(i, { key: e.target.value })} placeholder="key" />
                  <input value={c.en} onChange={(e) => setCat(i, { en: e.target.value })} placeholder="EN" />
                  <input value={c.zh} onChange={(e) => setCat(i, { zh: e.target.value })} placeholder="中文" />
                  <button className="sc-del" onClick={() => removeCat(i)} aria-label="Remove">
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button className="mod-btn" onClick={addCategory}>
              {t("mod.set.addCat")}
            </button>
            <label>{t("mod.set.rateLimit")}</label>
            <input type="number" min={1} value={rateLimit} onChange={(e) => setRateLimit(parseInt(e.target.value, 10) || 1)} />
            <button id="setSave" onClick={() => void save()}>
              {t("mod.set.save")}
            </button>
            <button className="mod-btn remove" onClick={() => void doReset()}>
              {t("mod.set.resetWall")}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
